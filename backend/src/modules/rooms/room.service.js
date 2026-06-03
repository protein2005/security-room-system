const { Room } = require("./room.model");
const { getRoomCurrentState } = require("../room-current-state/room-current-state.service");
const { listTelemetryByRoomId } = require("../telemetry/telemetry.service");
const { listAlarms } = require("../alarms/alarm.service");
const { listEvents } = require("../events/event.service");

async function listRooms() {
  return Room.find({ archived: { $ne: true } }).sort({ updatedAt: -1 }).lean();
}

async function getRoomByRoomId(roomId) {
  return Room.findOne({ roomId, archived: { $ne: true } }).lean();
}

async function createRoom(input) {
  const room = await Room.create({
    roomId: input.roomId,
    roomName: input.roomName,
    zoneType: input.zoneType,
    description: input.description || "",
  });

  return room.toObject();
}

async function updateRoom(roomId, updates) {
  return Room.findOneAndUpdate(
    { roomId },
    {
      $set: {
        ...(updates.roomName !== undefined ? { roomName: updates.roomName } : {}),
        ...(updates.zoneType !== undefined ? { zoneType: updates.zoneType } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.deviceId !== undefined ? { deviceId: updates.deviceId } : {}),
      },
    },
    { new: true }
  ).lean();
}

async function clearRoomDeviceAssignment(roomId) {
  return Room.findOneAndUpdate(
    { roomId },
    {
      $set: {
        deviceId: "",
        armed: false,
        alarmActive: false,
        alarmReason: "",
        alarmSilenced: false,
      },
    },
    { new: true }
  ).lean();
}

async function archiveRoom(roomId, archivedBy = "") {
  return Room.findOneAndUpdate(
    { roomId, archived: { $ne: true } },
    {
      $set: {
        deviceId: "",
        armed: false,
        alarmActive: false,
        alarmReason: "",
        alarmSilenced: false,
        archived: true,
        archivedAt: new Date(),
        archivedBy,
      },
    },
    { new: true }
  ).lean();
}

module.exports = {
  listRooms,
  getRoomByRoomId,
  createRoom,
  updateRoom,
  clearRoomDeviceAssignment,
  archiveRoom,
  getRoomCurrentState,
  listTelemetryByRoomId,
  listRoomAlarms: (roomId, options) => listAlarms({ roomId, ...options }),
  listRoomEvents: (roomId, options) => listEvents({ roomId, ...options }),
};
