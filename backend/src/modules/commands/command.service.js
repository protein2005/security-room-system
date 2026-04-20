const { env } = require("../../config/env");
const { publishMqttMessage } = require("../../mqtt/mqtt.client");
const { Command } = require("./command.model");
const roomService = require("../rooms/room.service");
const deviceService = require("../devices/device.service");

function buildRequestedBy(requestedBy = {}) {
  return {
    userId: requestedBy.userId || "",
    email: requestedBy.email || "",
    name: requestedBy.name || "",
    role: requestedBy.role || "",
  };
}

async function createCommandEntry(input) {
  const command = await Command.create({
    targetDeviceId: input.targetDeviceId,
    targetRoomId: input.targetRoomId || "",
    action: input.action,
    payload: input.payload,
    requestedBy: buildRequestedBy(input.requestedBy),
    status: "pending",
    mqttTopic: input.mqttTopic,
  });

  return command.toObject();
}

async function markCommandPublished(commandId) {
  return Command.findByIdAndUpdate(
    commandId,
    {
      $set: {
        status: "published",
        publishedAt: new Date(),
        errorMessage: "",
        acknowledgedAt: null,
        outcome: {
          matchedBy: "",
          resultStatus: "",
          resultEventName: "",
          source: "",
          details: "",
          correlationKey: "",
          matchedAt: null,
        },
      },
    },
    { new: true }
  ).lean();
}

async function markCommandFailed(commandId, errorMessage) {
  return Command.findByIdAndUpdate(
    commandId,
    {
      $set: {
        status: "failed",
        errorMessage: errorMessage || "Unknown publish error",
      },
    },
    { new: true }
  ).lean();
}

function buildCommandFilter(filters = {}) {
  const query = {};

  if (filters.targetRoomId) {
    query.targetRoomId = filters.targetRoomId;
  }

  if (filters.targetDeviceId) {
    query.targetDeviceId = filters.targetDeviceId;
  }

  if (filters.action) {
    query.action = filters.action;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (typeof filters.hasOutcome === "boolean") {
    query["outcome.matchedAt"] = filters.hasOutcome ? { $ne: null } : null;
  }

  if (filters.search) {
    const pattern = new RegExp(filters.search, "i");
    query.$or = [
      { targetDeviceId: pattern },
      { targetRoomId: pattern },
      { action: pattern },
      { mqttTopic: pattern },
      { "requestedBy.email": pattern },
      { "requestedBy.name": pattern },
      { "outcome.resultStatus": pattern },
      { "outcome.resultEventName": pattern },
      { "outcome.details": pattern },
      { errorMessage: pattern },
    ];
  }

  return query;
}

async function listCommands(filters = {}) {
  const sortField = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
  const sort = { [sortField]: sortOrder };

  if (sortField !== "createdAt") {
    sort.createdAt = -1;
  }

  return Command.find(buildCommandFilter(filters))
    .sort(sort)
    .limit(filters.limit || 100)
    .lean();
}

async function publishTrackedCommand({ targetDeviceId, targetRoomId = "", action, payload, requestedBy }) {
  const topic = `${env.mqttTopicRoot}/devices/${targetDeviceId}/cmd`;
  const commandEntry = await createCommandEntry({
    targetDeviceId,
    targetRoomId,
    action,
    payload,
    requestedBy,
    mqttTopic: topic,
  });

  try {
    await publishMqttMessage(topic, payload);
    const publishedCommand = await markCommandPublished(commandEntry._id);

    return {
      success: true,
      topic,
      payload,
      command: publishedCommand,
    };
  } catch (error) {
    const failedCommand = await markCommandFailed(commandEntry._id, error.message);

    error.command = failedCommand;
    throw error;
  }
}

async function sendRoomCommand(roomId, action, extraPayload = {}, requestedBy = {}) {
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

  return publishTrackedCommand({
    targetDeviceId: room.deviceId,
    targetRoomId: room.roomId,
    action,
    payload,
    requestedBy,
  });
}

async function sendDeviceCommand(deviceId, action, extraPayload = {}, requestedBy = {}) {
  const device = await deviceService.getDeviceByDeviceId(deviceId);

  if (!device) {
    const error = new Error("Device not found");
    error.statusCode = 404;
    throw error;
  }

  const payload = {
    deviceId: device.deviceId,
    deviceToken: env.mqttDeviceToken,
    action,
    ...(device.currentRoomId ? { roomId: device.currentRoomId } : {}),
    ...extraPayload,
  };

  const targetRoomId = extraPayload.roomId || device.currentRoomId || "";

  return publishTrackedCommand({
    targetDeviceId: device.deviceId,
    targetRoomId,
    action,
    payload,
    requestedBy,
  });
}

module.exports = {
  listCommands,
  sendDeviceCommand,
  sendRoomCommand,
};
