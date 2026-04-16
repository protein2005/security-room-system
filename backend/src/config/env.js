const dotenv = require("dotenv");

dotenv.config();

function requireEnv(name, fallback = "") {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongodbUri: requireEnv("MONGODB_URI", "mongodb://localhost:27017/security-room-system"),
  mqttUrl: requireEnv("MQTT_URL", "mqtt://localhost:1883"),
  mqttUsername: process.env.MQTT_USERNAME || "",
  mqttPassword: process.env.MQTT_PASSWORD || "",
  mqttClientId: process.env.MQTT_CLIENT_ID || "security-room-system-backend",
  mqttTopicRoot: process.env.MQTT_TOPIC_ROOT || "security",
  mqttDeviceToken: requireEnv("MQTT_DEVICE_TOKEN", "room101_secure_token"),
  deviceOfflineThresholdMs: Number(process.env.DEVICE_OFFLINE_THRESHOLD_MS || 30000),
  deviceOfflineCheckIntervalMs: Number(process.env.DEVICE_OFFLINE_CHECK_INTERVAL_MS || 10000),
};

module.exports = { env };
