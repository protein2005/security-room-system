const { Telemetry } = require("./telemetry.model");

async function createTelemetryEntry(input) {
  const telemetry = await Telemetry.create({
    deviceId: input.deviceId,
    roomId: input.roomId,
    temperature: input.temperature,
    humidity: input.humidity,
    motion: input.motion,
    door: input.door,
    armed: input.armed,
    offline: input.offline,
    sensorFailure: input.sensorFailure,
    alarmActive: input.alarmActive,
    alarmSilenced: input.alarmSilenced,
    alarmReason: input.alarmReason,
    dhtOk: input.dhtOk,
    receivedAt: input.receivedAt || new Date(),
  });

  return telemetry.toObject();
}

async function listTelemetryByRoomId(roomId, { limit = 100 } = {}) {
  return Telemetry.find({ roomId }).sort({ receivedAt: -1 }).limit(limit).lean();
}

module.exports = {
  createTelemetryEntry,
  listTelemetryByRoomId,
};
