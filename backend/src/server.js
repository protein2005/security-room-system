const http = require("http");

const { createApp } = require("./app");
const { env } = require("./config/env");
const { connectDatabase } = require("./config/db");
const { createSocketServer } = require("./sockets/socket.server");
const { connectMqtt } = require("./mqtt/mqtt.client");
const { startDeviceOfflineJob } = require("./jobs/device-offline.job");
const { logger } = require("./utils/logger");

async function bootstrap() {
  const app = createApp();
  const server = http.createServer(app);
  const io = createSocketServer(server);

  app.locals.io = io;

  await connectDatabase();
  await connectMqtt({ io });
  startDeviceOfflineJob({ io });

  server.listen(env.port, () => {
    logger.info(`Backend server listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to bootstrap backend", error);
  process.exit(1);
});
