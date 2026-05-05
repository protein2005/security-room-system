const bcrypt = require("bcryptjs");

const userService = require("./user.service");
const { createValidationError, validateUserCreatePayload, validateUserProfilePayload } = require("../../utils/validation");

async function listUsers(_req, res, next) {
  try {
    const users = await userService.listUsers();
    res.json(users.map(userService.sanitizeUser));
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { login, password, name, role } = validateUserCreatePayload(req.body);
    const existingUser = await userService.getUserByLogin(login);

    if (existingUser) {
      throw createValidationError("login is already in use");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userService.createUser({
      login,
      passwordHash,
      name,
      role,
      isActive: true,
    });

    res.status(201).json(userService.sanitizeUser(user));
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const payload = validateUserProfilePayload(req.body);
    const user = await userService.getUserById(req.auth.userId);

    if (!user || !user.isActive) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const updates = {};

    if (payload.login && payload.login !== user.login) {
      const existingUser = await userService.getUserByLogin(payload.login);

      if (existingUser && String(existingUser._id) !== String(user._id)) {
        throw createValidationError("login is already in use");
      }

      updates.login = payload.login;
    }

    if (payload.name) {
      updates.name = payload.name;
    }

    if (payload.currentPassword || payload.newPassword) {
      if (req.auth.role !== "admin") {
        const error = new Error("Only admin can change passwords");
        error.statusCode = 403;
        throw error;
      }

      const matches = await bcrypt.compare(payload.currentPassword, user.passwordHash);

      if (!matches) {
        throw createValidationError("currentPassword is invalid");
      }

      updates.passwordHash = await bcrypt.hash(payload.newPassword, 10);
    }

    const updatedUser = Object.keys(updates).length > 0
      ? await userService.updateUserById(user._id, updates)
      : user;

    res.json(userService.sanitizeUser(updatedUser));
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (req.params.userId === req.auth.userId) {
      throw createValidationError("admin cannot delete own account");
    }

    const deletedUser = await userService.deleteUserById(req.params.userId);

    if (!deletedUser) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateProfile,
  deleteUser,
};
