const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { env } = require("../../config/env");
const userService = require("../users/user.service");

function buildAuthPayload(user) {
  return {
    sub: String(user._id),
    email: user.email,
    role: user.role,
    name: user.name,
  };
}

function signAccessToken(user) {
  return jwt.sign(buildAuthPayload(user), env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

async function login({ email, password }) {
  const user = await userService.getUserByEmail(email);

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("User account is disabled");
    error.statusCode = 403;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const updatedUser = await userService.touchLastLogin(user._id);

  return {
    accessToken: signAccessToken(updatedUser),
    user: userService.sanitizeUser(updatedUser),
  };
}

async function getCurrentUser(userId) {
  const user = await userService.getUserById(userId);

  if (!user || !user.isActive) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return userService.sanitizeUser(user);
}

module.exports = {
  login,
  verifyAccessToken,
  getCurrentUser,
};
