const { Alarm } = require("./alarm.model");

async function createAlarmEntry(input) {
  const alarm = await Alarm.create({
    deviceId: input.deviceId,
    roomId: input.roomId,
    reason: input.reason,
    isActive: input.isActive ?? true,
    armed: input.armed ?? false,
    offline: input.offline ?? false,
    alarmSilenced: input.alarmSilenced ?? false,
    triggeredAt: input.triggeredAt || new Date(),
    acknowledgedAt: input.acknowledgedAt || null,
    silencedAt: input.silencedAt || null,
    clearedAt: input.clearedAt || null,
  });

  return alarm.toObject();
}

async function listAlarms({ roomId, activeOnly = false, limit = 100 } = {}) {
  const filter = {};

  if (roomId) {
    filter.roomId = roomId;
  }

  if (activeOnly) {
    filter.isActive = true;
  }

  return Alarm.find(filter).sort({ triggeredAt: -1 }).limit(limit).lean();
}

async function clearActiveAlarmsForRoom(roomId, { clearedAt = new Date() } = {}) {
  await Alarm.updateMany(
    {
      roomId,
      isActive: true,
    },
    {
      $set: {
        isActive: false,
        clearedAt,
      },
    }
  );
}

async function silenceActiveAlarmsForRoom(roomId, { silencedAt = new Date() } = {}) {
  await Alarm.updateMany(
    {
      roomId,
      isActive: true,
    },
    {
      $set: {
        alarmSilenced: true,
        silencedAt,
      },
    }
  );
}

module.exports = {
  createAlarmEntry,
  listAlarms,
  clearActiveAlarmsForRoom,
  silenceActiveAlarmsForRoom,
};
