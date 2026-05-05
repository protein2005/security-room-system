const userService = require("../users/user.service");
const systemSettingsService = require("../system-settings/system-settings.service");
const { logger } = require("../../utils/logger");

let pollingOffset = 0;
let pollingStarted = false;
let activePollingKey = "";

function formatAlarmReason(reason) {
  if (!reason) {
    return "Тривога";
  }

  if (reason === "SENSOR_FAILURE") return "Помилка сенсора";
  if (reason === "TEMP_OUT_OF_RANGE") return "Температура поза межами";
  if (reason === "HUMIDITY_OUT_OF_RANGE") return "Вологість поза межами";
  if (reason === "DOOR_OPEN") return "Відчинені двері";
  if (reason === "MOTION") return "Виявлено рух";

  return reason.replaceAll("_", " ");
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function getPollingKey(config = {}) {
  return config.botToken ? `${config.botName}:${config.botToken.slice(-6)}` : "";
}

async function getTelegramConfig() {
  return systemSettingsService.getTelegramConfig();
}

async function isTelegramConfigured() {
  const config = await getTelegramConfig();
  return systemSettingsService.isTelegramConfigComplete(config);
}

async function getTelegramLinkUrl(token) {
  const config = await getTelegramConfig();

  if (!systemSettingsService.isTelegramConfigComplete(config) || !token) {
    return "";
  }

  return `https://t.me/${config.botName}?start=${token}`;
}

async function telegramApi(method, payload = {}, { timeoutSeconds, config } = {}) {
  const resolvedConfig = config || (await getTelegramConfig());

  if (!systemSettingsService.isTelegramConfigComplete(resolvedConfig)) {
    throw new Error("Telegram bot is not configured");
  }

  const url = new URL(`https://api.telegram.org/bot${resolvedConfig.botToken}/${method}`);

  if (timeoutSeconds) {
    url.searchParams.set("timeout", String(timeoutSeconds));
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Telegram API request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.description || "Telegram API returned an error");
  }

  return data.result;
}

async function sendTelegramMessage(chatId, text, config) {
  if (!chatId || !systemSettingsService.isTelegramConfigComplete(config)) {
    return;
  }

  await telegramApi(
    "sendMessage",
    {
      chat_id: chatId,
      text,
    },
    { config }
  );
}

async function buildTelegramStatus(userId) {
  const [user, configSummary] = await Promise.all([
    userService.ensureTelegramLinkToken(userId),
    systemSettingsService.getTelegramConfigSummary(),
  ]);

  if (!user) {
    return null;
  }

  return {
    isConfigured: configSummary.isConfigured,
    isLinked: Boolean(user.telegramChatId),
    isEnabled: Boolean(user.telegramEnabled && user.telegramChatId),
    botName: configSummary.botName,
    telegramUsername: user.telegramUsername || "",
    linkedAt: user.telegramLinkedAt,
    linkUrl: await getTelegramLinkUrl(user.telegramLinkToken),
  };
}

async function getTelegramAdminConfig() {
  return systemSettingsService.getTelegramConfigSummary();
}

async function updateTelegramAdminConfig(payload) {
  const { currentConfig, nextConfig, summary } = await systemSettingsService.updateTelegramConfig(payload);
  const configChanged =
    currentConfig.botName !== nextConfig.botName || currentConfig.botToken !== nextConfig.botToken;

  if (configChanged) {
    pollingOffset = 0;
    activePollingKey = "";

    if (currentConfig.botName || currentConfig.botToken) {
      await userService.resetTelegramLinksForAllUsers();
    }
  }

  return {
    ...summary,
    requiresRelink: configChanged && Boolean(currentConfig.botName || currentConfig.botToken),
  };
}

async function handleTelegramStart(message, config) {
  const chatId = message?.chat?.id;
  const username = message?.from?.username || "";
  const text = message?.text || "";
  const [, token = ""] = text.split(" ");

  if (!chatId || !token) {
    return;
  }

  const user = await userService.getUserByTelegramLinkToken(token.trim());

  if (!user) {
    await sendTelegramMessage(chatId, "Не вдалося прив’язати акаунт. Спробуй згенерувати нове посилання в системі.", config);
    return;
  }

  await userService.linkTelegramUser(user._id, {
    chatId,
    username,
  });

  await sendTelegramMessage(chatId, `Акаунт ${user.name} успішно прив’язано. Тепер ти отримуватимеш сповіщення про тривоги.`, config);
}

async function processTelegramUpdate(update, config) {
  const message = update?.message;

  if (!message?.text) {
    return;
  }

  if (message.text.startsWith("/start")) {
    await handleTelegramStart(message, config);
  }
}

async function pollTelegramUpdates() {
  let delayMs = 5000;

  try {
    const config = await getTelegramConfig();

    if (!systemSettingsService.isTelegramConfigComplete(config)) {
      if (activePollingKey) {
        logger.info("Telegram bot config removed, pausing long polling");
        activePollingKey = "";
        pollingOffset = 0;
      }

      return;
    }

    const pollingKey = getPollingKey(config);

    if (pollingKey !== activePollingKey) {
      pollingOffset = 0;
      activePollingKey = pollingKey;
      logger.info(`Starting Telegram long polling for bot @${config.botName}`);
    }

    const updates = await telegramApi(
      "getUpdates",
      {
        offset: pollingOffset,
        allowed_updates: ["message"],
      },
      { timeoutSeconds: 20, config }
    );

    delayMs = 1000;

    for (const update of updates) {
      pollingOffset = update.update_id + 1;
      await processTelegramUpdate(update, config);
    }
  } catch (error) {
    logger.error("Telegram polling failed", error);
  } finally {
    setTimeout(pollTelegramUpdates, delayMs);
  }
}

function startTelegramLongPolling() {
  if (pollingStarted) {
    return;
  }

  pollingStarted = true;
  logger.info("Telegram long polling scheduler started");
  pollTelegramUpdates();
}

async function sendAlarmTelegramNotifications({ alarm, roomName }) {
  const config = await getTelegramConfig();

  if (!systemSettingsService.isTelegramConfigComplete(config)) {
    return;
  }

  const users = await userService.listTelegramEnabledUsers();

  if (!users.length) {
    return;
  }

  const text = [
    "🚨 Початок тривоги",
    `Кімната: ${roomName || alarm.roomId}`,
    `Тип: ${formatAlarmReason(alarm.reason)}`,
    `Пристрій: ${alarm.deviceId}`,
    `Час початку: ${formatDateTime(alarm.triggeredAt)}`,
  ].join("\n");

  await Promise.all(
    users.map(async (user) => {
      try {
        await sendTelegramMessage(user.telegramChatId, text, config);
      } catch (error) {
        logger.error(`Failed to send Telegram notification to user ${user.login}`, error);
      }
    })
  );
}

async function sendAlarmClearedTelegramNotifications({ alarms = [], roomName, deviceId }) {
  if (!alarms.length) {
    return;
  }

  const config = await getTelegramConfig();

  if (!systemSettingsService.isTelegramConfigComplete(config)) {
    return;
  }

  const users = await userService.listTelegramEnabledUsers();

  if (!users.length) {
    return;
  }

  const uniqueReasons = [...new Set(alarms.map((alarm) => formatAlarmReason(alarm.reason)).filter(Boolean))];
  const clearedAt = alarms[0]?.clearedAt;
  const startedAt = alarms[0]?.triggeredAt;
  const text = [
    "✅ Тривогу завершено",
    `Кімната: ${roomName || alarms[0]?.roomId || "—"}`,
    `Тип: ${uniqueReasons.join(", ") || "Невідомо"}`,
    `Пристрій: ${deviceId || alarms[0]?.deviceId || "—"}`,
    `Час початку: ${formatDateTime(startedAt)}`,
    `Час завершення: ${formatDateTime(clearedAt)}`,
  ].join("\n");

  await Promise.all(
    users.map(async (user) => {
      try {
        await sendTelegramMessage(user.telegramChatId, text, config);
      } catch (error) {
        logger.error(`Failed to send Telegram clear notification to user ${user.login}`, error);
      }
    })
  );
}

module.exports = {
  buildTelegramStatus,
  getTelegramAdminConfig,
  isTelegramConfigured,
  startTelegramLongPolling,
  sendAlarmTelegramNotifications,
  sendAlarmClearedTelegramNotifications,
  updateTelegramAdminConfig,
};
