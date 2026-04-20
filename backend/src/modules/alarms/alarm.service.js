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

async function listAlarms({
  roomId,
  deviceId,
  reason,
  activeOnly = false,
  silenced,
  search,
  sortBy = "triggeredAt",
  sortOrder = "desc",
  limit = 100,
} = {}) {
  const filter = {};

  if (roomId) {
    filter.roomId = roomId;
  }

  if (deviceId) {
    filter.deviceId = deviceId;
  }

  if (reason) {
    filter.reason = reason;
  }

  if (activeOnly) {
    filter.isActive = true;
  }

  if (typeof silenced === "boolean") {
    filter.alarmSilenced = silenced;
  }

  if (search) {
    const pattern = new RegExp(search, "i");
    filter.$or = [
      { roomId: pattern },
      { deviceId: pattern },
      { reason: pattern },
    ];
  }

  const normalizedSortOrder = sortOrder === "asc" ? 1 : -1;
  const sort = { [sortBy]: normalizedSortOrder };

  if (sortBy !== "triggeredAt") {
    sort.triggeredAt = -1;
  }

  return Alarm.find(filter)
    .sort(sort)
    .limit(limit)
    .lean();
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
