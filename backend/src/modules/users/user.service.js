const bcrypt = require("bcryptjs");

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
  touchLastLogin,
  listUsers,
  createUser,
  updateUserById,
  deleteUserById,
  ensureAdminUser,
};
