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

async function listEvents({ roomId, limit = 100 } = {}) {
  const filter = {};

  if (roomId) {
    filter.roomId = roomId;
  }

  return Event.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
}

module.exports = {
  createEventEntry,
  listEvents,
};
