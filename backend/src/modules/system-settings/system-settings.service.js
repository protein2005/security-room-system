const { createValidationError } = require("../../utils/validation");
const { SystemSettings } = require("./system-settings.model");

function normalizeBotName(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

function normalizeBotToken(value) {
  return String(value || "").trim();
}

function isTelegramConfigComplete(config = {}) {
  return Boolean(config.botName && config.botToken);
}

function maskBotToken(token) {
  if (!token) {
    return "";
  }

  if (token.length <= 8) {
    return "********";
  }

  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

async function getOrCreateSettings() {
  let settings = await SystemSettings.findOne({ key: "default" });

  if (!settings) {
    settings = await SystemSettings.create({ key: "default" });
  }

  return settings;
}

async function getTelegramConfig() {
  const settings = await getOrCreateSettings();

  return {
    botName: normalizeBotName(settings.telegram?.botName),
    botToken: normalizeBotToken(settings.telegram?.botToken),
  };
}

async function getTelegramConfigSummary() {
  const config = await getTelegramConfig();

  return {
    isConfigured: isTelegramConfigComplete(config),
    botName: config.botName,
    hasToken: Boolean(config.botToken),
    maskedToken: maskBotToken(config.botToken),
  };
}

async function updateTelegramConfig(payload = {}) {
  const settings = await getOrCreateSettings();
  const currentConfig = {
    botName: normalizeBotName(settings.telegram?.botName),
    botToken: normalizeBotToken(settings.telegram?.botToken),
  };

  const nextConfig = {
    botName: payload.botName !== undefined ? normalizeBotName(payload.botName) : currentConfig.botName,
    botToken: payload.botToken !== undefined ? normalizeBotToken(payload.botToken) : currentConfig.botToken,
  };

  const hasAnyValue = Boolean(nextConfig.botName || nextConfig.botToken);
  const isComplete = isTelegramConfigComplete(nextConfig);

  if (hasAnyValue && !isComplete) {
    throw createValidationError("Telegram config must include both botName and botToken");
  }

  settings.telegram = {
    botName: nextConfig.botName,
    botToken: nextConfig.botToken,
  };

  await settings.save();

  return {
    currentConfig,
    nextConfig,
    summary: {
      isConfigured: isComplete,
      botName: nextConfig.botName,
      hasToken: Boolean(nextConfig.botToken),
      maskedToken: maskBotToken(nextConfig.botToken),
    },
  };
}

module.exports = {
  getTelegramConfig,
  getTelegramConfigSummary,
  isTelegramConfigComplete,
  updateTelegramConfig,
};
