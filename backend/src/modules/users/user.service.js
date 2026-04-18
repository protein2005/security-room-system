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
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function getUserByEmail(email) {
  return User.findOne({ email: email.toLowerCase().trim() });
}

async function getUserById(userId) {
  return User.findById(userId);
}

async function touchLastLogin(userId) {
  return User.findByIdAndUpdate(userId, { $set: { lastLoginAt: new Date() } }, { new: true });
}

async function ensureAdminUser() {
  const email = env.adminEmail.toLowerCase().trim();
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return existingUser;
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 10);

  const user = await User.create({
    email,
    passwordHash,
    name: env.adminName,
    role: "admin",
    isActive: true,
  });

  logger.info(`Seeded default admin user: ${email}`);

  return user;
}

module.exports = {
  sanitizeUser,
  getUserByEmail,
  getUserById,
  touchLastLogin,
  ensureAdminUser,
};
