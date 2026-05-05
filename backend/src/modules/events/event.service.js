const { Event } = require("./event.model");

async function createEventEntry(input) {
  const event = await Event.create({
    deviceId: input.deviceId,
    roomId: input.roomId,
    eventName: input.eventName,
    source: input.source || "",
    level: input.level || "info",
    details: input.details || "",
    armed: input.armed ?? false,
    offline: input.offline ?? false,
    alarmActive: input.alarmActive ?? false,
    alarmSilenced: input.alarmSilenced ?? false,
    alarmReason: input.alarmReason || "",
    createdAt: input.createdAt || new Date(),
  });

  return event.toObject();
}

async function listEvents({
  roomId,
  deviceId,
  source,
  eventNames = [],
  search,
  sortBy = "createdAt",
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

  if (source) {
    filter.source = source;
  }

  if (eventNames.length) {
    filter.eventName = { $in: eventNames };
  }

  if (search) {
    const pattern = new RegExp(search, "i");
    filter.$or = [
      { eventName: pattern },
      { roomId: pattern },
      { deviceId: pattern },
      { source: pattern },
      { details: pattern },
    ];
  }

  const normalizedSortOrder = sortOrder === "asc" ? 1 : -1;
  const sort = { [sortBy]: normalizedSortOrder };

  if (sortBy !== "createdAt") {
    sort.createdAt = -1;
  }

  return Event.find(filter)
    .sort(sort)
    .limit(limit)
    .lean();
}

module.exports = {
  createEventEntry,
  listEvents,
};
