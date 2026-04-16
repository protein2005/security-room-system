const deviceService = require("../devices/device.service");
const roomService = require("../rooms/room.service");
const { publishMqttMessage } = require("../../mqtt/mqtt.client");
const { env } = require("../../config/env");

async function provisionDevice({ deviceId, roomId }) {
  const device = await deviceService.getDeviceByDeviceId(deviceId);

  if (!device) {
    const error = new Error("Device not found");
    error.statusCode = 404;
    throw error;
  }

  const room = await roomService.getRoomByRoomId(roomId);

  if (!room) {
    const error = new Error("Room not found");
    error.statusCode = 404;
    throw error;
  }

  if (room.deviceId && room.deviceId !== deviceId) {
    const error = new Error("Room is already assigned to another device");
    error.statusCode = 409;
    throw error;
  }

  const topic = `${env.mqttTopicRoot}/devices/${deviceId}/cmd`;
  const payload = {
    deviceId,
    deviceToken: env.mqttDeviceToken,
    action: "PROVISION",
    roomId: room.roomId,
    roomName: room.roomName,
    zoneType: room.zoneType,
  };

  await publishMqttMessage(topic, payload);
  await roomService.updateRoom(room.roomId, { deviceId });
  await deviceService.assignDeviceToRoom({ deviceId, roomId: room.roomId });

  return {
    success: true,
    topic,
    payload,
    deviceId,
    roomId: room.roomId,
  };
}

module.exports = { provisionDevice };
