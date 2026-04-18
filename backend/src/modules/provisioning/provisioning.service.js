const deviceService = require("../devices/device.service");
const roomService = require("../rooms/room.service");
const { sendDeviceCommand } = require("../commands/command.service");

async function provisionDevice({ deviceId, roomId, requestedBy }) {
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

  const result = await sendDeviceCommand(
    deviceId,
    "PROVISION",
    {
      roomId: room.roomId,
      roomName: room.roomName,
      zoneType: room.zoneType,
    },
    requestedBy
  );

  await roomService.updateRoom(room.roomId, { deviceId });
  await deviceService.assignDeviceToRoom({ deviceId, roomId: room.roomId });

  return {
    ...result,
    roomId: room.roomId,
    deviceId,
  };
}

module.exports = { provisionDevice };
