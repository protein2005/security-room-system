const telegramService = require("./telegram.service");
const userService = require("../users/user.service");
const { validateTelegramConfigPayload, validateTelegramEnabledPayload } = require("../../utils/validation");

async function getTelegramConfig(_req, res, next) {
  try {
    const config = await telegramService.getTelegramAdminConfig();
    res.json(config);
  } catch (error) {
    next(error);
  }
}

async function updateTelegramConfig(req, res, next) {
  try {
    const payload = validateTelegramConfigPayload(req.body);
    const config = await telegramService.updateTelegramAdminConfig(payload);
    res.json(config);
  } catch (error) {
    next(error);
  }
}

async function getTelegramStatus(req, res, next) {
  try {
    const status = await telegramService.buildTelegramStatus(req.auth.userId);
    res.json(status);
  } catch (error) {
    next(error);
  }
}

async function unlinkTelegram(req, res, next) {
  try {
    const user = await userService.unlinkTelegramUser(req.auth.userId);
    const telegramStatus = await telegramService.buildTelegramStatus(req.auth.userId);

    res.json({
      success: true,
      user: userService.sanitizeUser(user),
      telegramStatus,
    });
  } catch (error) {
    next(error);
  }
}

async function updateTelegramEnabled(req, res, next) {
  try {
    const { enabled } = validateTelegramEnabledPayload(req.body);
    const user = await userService.setTelegramEnabled(req.auth.userId, enabled);
    res.json({
      success: true,
      user: userService.sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTelegramConfig,
  getTelegramStatus,
  unlinkTelegram,
  updateTelegramConfig,
  updateTelegramEnabled,
};
