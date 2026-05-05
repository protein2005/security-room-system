const { Server } = require("socket.io");
const { env } = require("../config/env");

function createSocketServer(server) {
  return new Server(server, {
    cors: {
      origin: env.clientOrigin,
      credentials: true,
    },
  });
}

module.exports = { createSocketServer };
