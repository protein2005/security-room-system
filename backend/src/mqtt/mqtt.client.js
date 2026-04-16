const mqtt = require("mqtt");

const { env } = require("../config/env");
const { createTopicMap } = require("./mqtt.topics");
const { routeMqttMessage } = require("./mqtt.router");
const { logger } = require("../utils/logger");

let mqttClient;

function safeJsonParse(buffer) {
  try {
    return JSON.parse(buffer.toString());
  } catch (error) {
    logger.warn("Failed to parse MQTT payload as JSON", error.message);
    return null;
  }
}

async function connectMqtt({ io }) {
  const topics = createTopicMap(env.mqttTopicRoot);

  mqttClient = mqtt.connect(env.mqttUrl, {
    clientId: env.mqttClientId,
    username: env.mqttUsername || undefined,
    password: env.mqttPassword || undefined,
  });

  mqttClient.on("connect", () => {
    logger.info(`MQTT connected to ${env.mqttUrl}`);

    Object.values(topics).forEach((topic) => {
      mqttClient.subscribe(topic, (error) => {
        if (error) {
          logger.error(`Failed to subscribe to topic ${topic}`, error);
          return;
        }

        logger.info(`Subscribed to MQTT topic: ${topic}`);
      });
    });
  });

  mqttClient.on("message", async (topic, message) => {
    const payload = safeJsonParse(message);

    if (!payload) {
      return;
    }

    try {
      await routeMqttMessage({ topic, payload, io, topics });
    } catch (error) {
      logger.error(`Failed to process MQTT message from ${topic}`, error);
    }
  });

  mqttClient.on("reconnect", () => {
    logger.warn("Reconnecting to MQTT broker");
  });

  mqttClient.on("error", (error) => {
    logger.error("MQTT client error", error);
  });

  return mqttClient;
}

function publishMqttMessage(topic, payload) {
  return new Promise((resolve, reject) => {
    if (!mqttClient || !mqttClient.connected) {
      reject(new Error("MQTT client is not connected"));
      return;
    }

    mqttClient.publish(topic, JSON.stringify(payload), (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

module.exports = { connectMqtt, publishMqttMessage };
