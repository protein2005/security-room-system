const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const { env } = require("../../config/env");
const { logger } = require("../../utils/logger");
const { User } = require("./user.model");

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    login: user.login,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    telegramChatId: user.telegramChatId,
    telegramUsername: user.telegramUsername,
    telegramEnabled: user.telegramEnabled,
    telegramLinkedAt: user.telegramLinkedAt,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizeLogin(login) {
  return String(login || "").trim().toLowerCase();
}

async function getUserByLogin(login) {
  return User.findOne({ login: normalizeLogin(login) });
}

async function getUserById(userId) {
  return User.findById(userId);
}

async function getUserByTelegramLinkToken(token) {
  return User.findOne({ telegramLinkToken: token });
}

async function touchLastLogin(userId) {
  return User.findByIdAndUpdate(userId, { $set: { lastLoginAt: new Date() } }, { new: true });
}

async function listUsers() {
  return User.find().sort({ role: 1, name: 1, login: 1 });
}

async function createUser({ login, passwordHash, name, role, isActive = true }) {
  return User.create({
    login: normalizeLogin(login),
    passwordHash,
    name: name.trim(),
    role,
    isActive,
  });
}

async function updateUserById(userId, updates = {}) {
  const payload = { ...updates };

  if (payload.login !== undefined) {
    payload.login = normalizeLogin(payload.login);
  }

  if (payload.name !== undefined) {
    payload.name = payload.name.trim();
  }

  return User.findByIdAndUpdate(userId, { $set: payload }, { new: true });
}

async function deleteUserById(userId) {
  return User.findByIdAndDelete(userId);
}

async function ensureTelegramLinkToken(userId) {
  const user = await User.findById(userId);

  if (!user) {
    return null;
  }

  const persistedUser = await User.collection.findOne(
    { _id: user._id },
    { projection: { telegramLinkToken: 1 } }
  );

  if (!persistedUser?.telegramLinkToken) {
    user.telegramLinkToken = crypto.randomBytes(24).toString("hex");
    await user.save();
  }

  return user;
}

async function linkTelegramUser(userId, { chatId, username }) {
  const normalizedChatId = String(chatId);

  await User.updateMany(
    {
      _id: { $ne: userId },
      telegramChatId: normalizedChatId,
    },
    {
      $set: {
        telegramChatId: "",
        telegramUsername: "",
        telegramEnabled: false,
        telegramLinkedAt: null,
      },
      $unset: {
        telegramLinkToken: 1,
      },
    }
  );

  return User.findByIdAndUpdate(
    userId,
    {
      $set: {
        telegramChatId: normalizedChatId,
        telegramUsername: username || "",
        telegramEnabled: true,
        telegramLinkedAt: new Date(),
      },
    },
    { new: true }
  );
}

async function unlinkTelegramUser(userId) {
  return User.findByIdAndUpdate(
    userId,
    {
      $set: {
        telegramChatId: "",
        telegramUsername: "",
        telegramEnabled: false,
        telegramLinkedAt: null,
        telegramLinkToken: crypto.randomBytes(24).toString("hex"),
      },
    },
    { new: true }
  );
}

async function setTelegramEnabled(userId, enabled) {
  return User.findByIdAndUpdate(
    userId,
    {
      $set: {
        telegramEnabled: Boolean(enabled),
      },
    },
    { new: true }
  );
}

async function listTelegramEnabledUsers() {
  return User.find({
    telegramEnabled: true,
    telegramChatId: { $ne: "" },
    isActive: true,
  });
}

async function resetTelegramLinksForAllUsers() {
  return User.updateMany(
    {},
    {
      $set: {
        telegramChatId: "",
        telegramUsername: "",
        telegramEnabled: false,
        telegramLinkedAt: null,
      },
      $unset: {
        telegramLinkToken: 1,
      },
    }
  );
}

async function ensureAdminUser() {
  const login = normalizeLogin(env.adminLogin);
  const existingUser = await getUserByLogin(login);

  if (existingUser) {
    return existingUser;
  }

  const legacyAdminUser = await User.findOne({ email: "admin@security-room.local" });

  if (legacyAdminUser) {
    legacyAdminUser.login = login;
    legacyAdminUser.name = legacyAdminUser.name || env.adminName;
    legacyAdminUser.role = "admin";
    legacyAdminUser.isActive = true;
    await legacyAdminUser.save();
    logger.info(`Upgraded legacy admin user to login: ${login}`);
    return legacyAdminUser;
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);

  const user = await createUser({
    login,
    passwordHash,
    name: env.adminName,
    role: "admin",
  });

  logger.info(`Seeded default admin user: ${login}`);

  return user;
}

module.exports = {
  sanitizeUser,
  normalizeLogin,
  getUserByLogin,
  getUserById,
  getUserByTelegramLinkToken,
  touchLastLogin,
  listUsers,
  createUser,
  updateUserById,
  deleteUserById,
  ensureTelegramLinkToken,
  linkTelegramUser,
  unlinkTelegramUser,
  setTelegramEnabled,
  listTelegramEnabledUsers,
  resetTelegramLinksForAllUsers,
  ensureAdminUser,
};
