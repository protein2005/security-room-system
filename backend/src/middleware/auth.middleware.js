const authService = require("../modules/auth/auth.service");

async function requireAuth(req, _res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      const error = new Error("Authentication is required");
      error.statusCode = 401;
      throw error;
    }

    const payload = authService.verifyAccessToken(token);

    req.auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };

    next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
      error.message = "Invalid or expired access token";
    }

    next(error);
  }
}

function requireRole(allowedRoles = []) {
  return (req, _res, next) => {
    if (!req.auth) {
      const error = new Error("Authentication is required");
      error.statusCode = 401;
      return next(error);
    }

    if (!allowedRoles.includes(req.auth.role)) {
      const error = new Error("You do not have permission to perform this action");
      error.statusCode = 403;
      return next(error);
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
