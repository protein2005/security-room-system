const { Server } = require("socket.io");
const authService = require("../modules/auth/auth.service");
const { corsOrigin } = require("../config/cors");

function createSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        throw new Error("Authentication is required");
      }

      const payload = authService.verifyAccessToken(token);
      const user = await authService.getCurrentUser(payload.sub);

      socket.auth = {
        userId: String(user._id),
        login: user.login,
        role: user.role,
        name: user.name,
      };

      next();
    } catch {
      next(new Error("Invalid or expired access token"));
    }
  });

  return io;
}

module.exports = { createSocketServer };
