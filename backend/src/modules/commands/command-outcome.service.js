const { Command } = require("./command.model");
const { findActionByEvent, findActionByStatus } = require("./command.audit");

function buildOutcomeUpdate(input = {}) {
  return {
    matchedBy: input.matchedBy || "",
    resultStatus: input.resultStatus || "",
    resultEventName: input.resultEventName || "",
    source: input.source || "",
    details: input.details || "",
    correlationKey: input.correlationKey || "",
    matchedAt: input.matchedAt || new Date(),
  };
}

async function acknowledgeLatestCommandOutcome({
  targetDeviceId,
  targetRoomId = "",
  action,
  matchedBy,
  resultStatus = "",
  resultEventName = "",
  source = "",
  details = "",
  correlationKey = "",
  matchedAt = new Date(),
}) {
  if (!targetDeviceId || !action) {
    return null;
  }

  const windowStart = new Date(Date.now() - 15 * 60 * 1000);

  return Command.findOneAndUpdate(
    {
      targetDeviceId,
      ...(targetRoomId ? { targetRoomId } : {}),
      action,
      status: { $in: ["pending", "published"] },
      createdAt: { $gte: windowStart },
    },
    {
      $set: {
        status: "acknowledged",
        acknowledgedAt: matchedAt,
        outcome: buildOutcomeUpdate({
          matchedBy,
          resultStatus,
          resultEventName,
          source,
          details,
          correlationKey,
          matchedAt,
        }),
      },
    },
    {
      sort: { createdAt: -1 },
      new: true,
    }
  ).lean();
}

async function acknowledgeCommandFromStatus(payload = {}) {
  const action = findActionByStatus(payload.status);

  if (!action) {
    return null;
  }

  return acknowledgeLatestCommandOutcome({
    targetDeviceId: payload.deviceId,
    targetRoomId: payload.roomId || "",
    action,
    matchedBy: "status",
    resultStatus: payload.status || "",
    source: payload.eventType || "status",
    details: payload.activeAlarmReason || "",
    correlationKey: `${payload.deviceId}:${payload.roomId || ""}:${payload.status}`,
  });
}

async function acknowledgeCommandFromEvent(payload = {}) {
  const action = findActionByEvent(payload.eventName);

  if (!action) {
    return null;
  }

  return acknowledgeLatestCommandOutcome({
    targetDeviceId: payload.deviceId,
    targetRoomId: payload.roomId || "",
    action,
    matchedBy: "event",
    resultEventName: payload.eventName || "",
    source: payload.source || "event",
    details: payload.details || "",
    correlationKey: `${payload.deviceId}:${payload.roomId || ""}:${payload.eventName}`,
  });
}

module.exports = {
  acknowledgeCommandFromEvent,
  acknowledgeCommandFromStatus,
  acknowledgeLatestCommandOutcome,
};
