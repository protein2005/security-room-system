function createValidationError(message, details = []) {
  const error = new Error(message);
  error.statusCode = 400;
  error.details = details;
  return error;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeOptionalString(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseBoolean(value) {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return undefined;
}

function parseLimit(value, { fallback = 100, min = 1, max = 500 } = {}) {
  const parsed = Number(value ?? fallback);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function parseSortOrder(value, fallback = "desc") {
  return value === "asc" ? "asc" : fallback;
}

function parseCsv(value) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateAuthPayload(body = {}) {
  if (!isNonEmptyString(body.login)) {
    throw createValidationError("login is required");
  }

  if (!isNonEmptyString(body.password)) {
    throw createValidationError("password is required");
  }

  return {
    login: body.login.trim(),
    password: body.password,
  };
}

function validateUserCreatePayload(body = {}) {
  if (!isNonEmptyString(body.login)) {
    throw createValidationError("login is required");
  }

  if (!isNonEmptyString(body.password)) {
    throw createValidationError("password is required");
  }

  if (!isNonEmptyString(body.name)) {
    throw createValidationError("name is required");
  }

  if (!["admin", "operator", "viewer"].includes(body.role)) {
    throw createValidationError("role must be admin, operator or viewer");
  }

  return {
    login: body.login.trim(),
    password: body.password,
    name: body.name.trim(),
    role: body.role,
  };
}

function validateUserProfilePayload(body = {}) {
  const payload = {};

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) {
      throw createValidationError("name must be a non-empty string");
    }

    payload.name = body.name.trim();
  }

  if (body.login !== undefined) {
    if (!isNonEmptyString(body.login)) {
      throw createValidationError("login must be a non-empty string");
    }

    payload.login = body.login.trim();
  }

  if (body.currentPassword !== undefined || body.newPassword !== undefined) {
    if (!isNonEmptyString(body.currentPassword)) {
      throw createValidationError("currentPassword is required");
    }

    if (!isNonEmptyString(body.newPassword)) {
      throw createValidationError("newPassword is required");
    }

    payload.currentPassword = body.currentPassword;
    payload.newPassword = body.newPassword;
  }

  return payload;
}

function validateProvisioningPayload(body = {}) {
  if (!isNonEmptyString(body.roomId)) {
    throw createValidationError("roomId is required");
  }

  return {
    roomId: body.roomId.trim(),
  };
}

function validateRoomPayload(body = {}, { partial = false } = {}) {
  const fields = ["roomId", "roomName", "zoneType"];
  const normalized = {};

  for (const field of fields) {
    if (body[field] === undefined && partial) {
      continue;
    }

    if (!isNonEmptyString(body[field])) {
      throw createValidationError(`${field} is required`);
    }

    normalized[field] = body[field].trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      throw createValidationError("description must be a string");
    }

    normalized.description = body.description.trim();
  }

  return normalized;
}

function validateThresholdPayload(body = {}) {
  const values = {
    tempMin: Number(body.tempMin),
    tempMax: Number(body.tempMax),
    humidityMin: Number(body.humidityMin),
    humidityMax: Number(body.humidityMax),
  };

  if (Object.values(values).some((value) => !Number.isFinite(value))) {
    throw createValidationError("tempMin, tempMax, humidityMin and humidityMax must be numbers");
  }

  if (values.tempMin >= values.tempMax) {
    throw createValidationError("tempMin must be lower than tempMax");
  }

  if (values.humidityMin >= values.humidityMax) {
    throw createValidationError("humidityMin must be lower than humidityMax");
  }

  if (values.tempMin < -40 || values.tempMax > 125) {
    throw createValidationError("temperature thresholds must stay within -40..125");
  }

  if (values.humidityMin < 0 || values.humidityMax > 100) {
    throw createValidationError("humidity thresholds must stay within 0..100");
  }

  return values;
}

function validateEventQuery(query = {}) {
  return {
    roomId: normalizeOptionalString(query.roomId),
    deviceId: normalizeOptionalString(query.deviceId),
    source: normalizeOptionalString(query.source),
    eventNames: parseCsv(query.eventNames),
    search: normalizeOptionalString(query.search),
    sortBy: query.sortBy === "eventName" ? "eventName" : "createdAt",
    sortOrder: parseSortOrder(query.sortOrder),
    limit: parseLimit(query.limit),
  };
}

function validateAlarmQuery(query = {}) {
  return {
    roomId: normalizeOptionalString(query.roomId),
    deviceId: normalizeOptionalString(query.deviceId),
    reason: normalizeOptionalString(query.reason),
    activeOnly: parseBoolean(query.active) === true,
    silenced: parseBoolean(query.silenced),
    search: normalizeOptionalString(query.search),
    sortBy: query.sortBy === "reason" ? "reason" : "triggeredAt",
    sortOrder: parseSortOrder(query.sortOrder),
    limit: parseLimit(query.limit),
  };
}

function validateCommandQuery(query = {}) {
  return {
    targetRoomId: normalizeOptionalString(query.roomId),
    targetDeviceId: normalizeOptionalString(query.deviceId),
    action: normalizeOptionalString(query.action),
    status: normalizeOptionalString(query.status),
    hasOutcome: parseBoolean(query.hasOutcome),
    search: normalizeOptionalString(query.search),
    sortBy: query.sortBy === "action" ? "action" : "createdAt",
    sortOrder: parseSortOrder(query.sortOrder),
    limit: parseLimit(query.limit),
  };
}

function validateMqttPayload({ topic, payload }) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createValidationError(`MQTT payload for ${topic} must be a JSON object`);
  }

  if (!isNonEmptyString(payload.deviceId)) {
    throw createValidationError(`MQTT payload for ${topic} must include deviceId`);
  }

  if (topic.endsWith("/telemetry")) {
    if (!isNonEmptyString(payload.roomId)) {
      throw createValidationError(`MQTT telemetry payload for ${topic} must include roomId`);
    }
  }

  if (topic.endsWith("/alarm")) {
    if (!isNonEmptyString(payload.roomId) || !isNonEmptyString(payload.reason)) {
      throw createValidationError(`MQTT alarm payload for ${topic} must include roomId and reason`);
    }
  }

  if (topic.endsWith("/event")) {
    if (!isNonEmptyString(payload.roomId) || !isNonEmptyString(payload.eventName)) {
      throw createValidationError(`MQTT event payload for ${topic} must include roomId and eventName`);
    }
  }

  return payload;
}

module.exports = {
  createValidationError,
  parseBoolean,
  parseLimit,
  validateAlarmQuery,
  validateAuthPayload,
  validateCommandQuery,
  validateEventQuery,
  validateMqttPayload,
  validateProvisioningPayload,
  validateRoomPayload,
  validateThresholdPayload,
  validateUserCreatePayload,
  validateUserProfilePayload,
};
