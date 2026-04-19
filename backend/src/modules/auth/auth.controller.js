const authService = require("./auth.service");
const { validateAuthPayload } = require("../../utils/validation");

async function login(req, res, next) {
  try {
    const { email, password } = validateAuthPayload(req.body);

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
