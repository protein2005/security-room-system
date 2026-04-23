const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const healthRoutes = require("./modules/health/health.routes");
const authRoutes = require("./modules/auth/auth.routes");
const pushSubscriptionRoutes = require("./modules/push-subscriptions/push-subscription.routes");
const telegramRoutes = require("./modules/telegram/telegram.routes");
const userRoutes = require("./modules/users/user.routes");
const deviceRoutes = require("./modules/devices/device.routes");
const roomRoutes = require("./modules/rooms/room.routes");
const alarmRoutes = require("./modules/alarms/alarm.routes");
const eventRoutes = require("./modules/events/event.routes");
const provisioningRoutes = require("./modules/provisioning/provisioning.routes");
const commandRoutes = require("./modules/commands/command.routes");
const { notFoundMiddleware } = require("./middleware/not-found.middleware");
const { errorMiddleware } = require("./middleware/error.middleware");
const { env } = require("./config/env");

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );
  app.use(helmet());
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/", (_req, res) => {
    res.json({
      name: "security-room-system-backend",
      status: "ok",
      environment: env.nodeEnv,
    });
  });

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/push-subscriptions", pushSubscriptionRoutes);
  app.use("/api/telegram", telegramRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/devices", deviceRoutes);
  app.use("/api/rooms", roomRoutes);
  app.use("/api/alarms", alarmRoutes);
  app.use("/api/events", eventRoutes);
  app.use("/api/provisioning", provisioningRoutes);
  app.use("/api/commands", commandRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
