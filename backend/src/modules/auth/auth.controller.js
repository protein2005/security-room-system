const authService = require("./auth.service");

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "email is required" });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "password is required" });
    }

    const result = await authService.login({ email, password });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.auth.userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  me,
};
