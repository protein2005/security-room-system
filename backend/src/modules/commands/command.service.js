const { env } = require("../../config/env");
const { publishMqttMessage } = require("../../mqtt/mqtt.client");
const roomService = require("../rooms/room.service");

async function sendRoomCommand(roomId, action, extraPayload = {}) {
  const room = await roomService.getRoomByRoomId(roomId);

  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  if (!room.deviceId) {
    const error = new Error("Room does not have an assigned device");
    error.statusCode = 409;
    throw error;
  }

  const topic = `${env.mqttTopicRoot}/devices/${room.deviceId}/cmd`;
  const payload = {
    deviceId: room.deviceId,
    deviceToken: env.mqttDeviceToken,
    action,
    roomId: room.roomId,
    ...extraPayload,
  };

  await publishMqttMessage(topic, payload);

  return {
    success: true,
    topic,
    payload,
  };
}

module.exports = {
  sendRoomCommand,
};
