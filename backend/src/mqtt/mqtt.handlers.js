const { Device } = require("../modules/devices/device.model");
const { Room } = require("../modules/rooms/room.model");
const {
  createAlarmEntry,
  clearActiveAlarmsForRoom,
  silenceActiveAlarmsForRoom,
} = require("../modules/alarms/alarm.service");
const { createEventEntry } = require("../modules/events/event.service");
const { createTelemetryEntry } = require("../modules/telemetry/telemetry.service");
const { upsertRoomCurrentState } = require("../modules/room-current-state/room-current-state.service");
const { logger } = require("../utils/logger");

function isDeviceOnlineFromPayload(payload) {
  if (payload.eventType === "heartbeat") {
    return true;
  }

  if (payload.status === "OFFLINE") {
    return false;
  }

  if (payload.eventType === "status") {
    return true;
  }

  return true;
}

async function upsertDeviceFromPayload(payload) {
  if (!payload.deviceId) {
    logger.warn("Skipping MQTT payload without deviceId");
    return null;
  }

  const previousDevice = await Device.findOne({ deviceId: payload.deviceId }).lean();

  const device = await Device.findOneAndUpdate(
    { deviceId: payload.deviceId },
    {
      $set: {
        deviceType: payload.deviceType || "esp32_security_node",
        firmwareVersion: payload.firmwareVersion || "",
        provisioned: Boolean(payload.provisioned),
        currentRoomId: payload.roomId || "",
        lastStatus: payload.status || payload.eventType || "UNKNOWN",
        online: isDeviceOnlineFromPayload(payload),
        wifiOk: payload.wifi ?? true,
        mqttOk: payload.mqtt ?? true,
        lastSeenAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  if (
    previousDevice?.currentRoomId &&
    !payload.roomId &&
    payload.provisioned === false &&
    previousDevice.currentRoomId !== payload.roomId
  ) {
    await Room.findOneAndUpdate(
      { roomId: previousDevice.currentRoomId },
      {
        $set: {
          deviceId: "",
          armed: false,
          alarmActive: false,
          alarmReason: "",
          alarmSilenced: false,
        },
      }
    );
  }

  return device;
}

async function syncProvisioningState(payload) {
  if (!payload.deviceId || !payload.roomId) {
    return null;
  }

  const shouldConfirmProvisioning =
    payload.provisioned === true ||
    payload.status === "PROVISIONED" ||
    payload.eventName === "DEVICE_PROVISIONED";

  if (!shouldConfirmProvisioning) {
    return null;
  }

  await Device.findOneAndUpdate(
    { deviceId: payload.deviceId },
    {
      $set: {
        provisioned: true,
        currentRoomId: payload.roomId,
      },
    }
  );

  const room = await Room.findOneAndUpdate(
    { roomId: payload.roomId },
    {
      $set: {
        ...(payload.roomName ? { roomName: payload.roomName } : {}),
        ...(payload.zoneType ? { zoneType: payload.zoneType } : {}),
        deviceId: payload.deviceId,
      },
      $setOnInsert: {
        description: "",
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return room;
}

async function handleStatusMessage({ payload, io }) {
  const device = await upsertDeviceFromPayload(payload);
  const room = await syncProvisioningState(payload);
  const roomState = payload.roomId
    ? await upsertRoomCurrentState(payload.roomId, {
        deviceId: payload.deviceId || "",
        armed: payload.armed ?? false,
        alarmActive: payload.alarmActive ?? false,
        alarmReason: payload.activeAlarmReason || "",
        alarmSilenced: payload.alarmSilenced ?? false,
        offline: payload.offline ?? false,
        sensorFailure: payload.sensorFailure ?? false,
        wifiOk: payload.wifi ?? false,
        mqttOk: payload.mqtt ?? false,
        tempMinThreshold: payload.tempMinThreshold ?? null,
        tempMaxThreshold: payload.tempMaxThreshold ?? null,
        humidityMinThreshold: payload.humidityMinThreshold ?? null,
        humidityMaxThreshold: payload.humidityMaxThreshold ?? null,
      })
    : null;

  if (payload.roomId && payload.status === "ALARM_CLEARED") {
    await clearActiveAlarmsForRoom(payload.roomId);
  }

  if (payload.roomId && payload.status === "ALARM_RESET") {
    await silenceActiveAlarmsForRoom(payload.roomId);
  }

  if (device && io) {
    io.emit("device:status-changed", device);
  }

  if (room && io) {
    io.emit("room:state-updated", room);
  }

  if (roomState && io) {
    io.emit("room:state-updated", roomState);
  }
}

async function handleHeartbeatMessage({ payload, io }) {
  const device = await upsertDeviceFromPayload(payload);
  const roomState = payload.roomId
    ? await upsertRoomCurrentState(payload.roomId, {
        deviceId: payload.deviceId || "",
        armed: payload.armed ?? false,
        alarmActive: payload.alarmActive ?? false,
        alarmReason: payload.activeAlarmReason || "",
        alarmSilenced: payload.alarmSilenced ?? false,
        offline: payload.offline ?? false,
        wifiOk: payload.wifi ?? false,
        mqttOk: payload.mqtt ?? false,
        tempMinThreshold: payload.tempMinThreshold ?? null,
        tempMaxThreshold: payload.tempMaxThreshold ?? null,
        humidityMinThreshold: payload.humidityMinThreshold ?? null,
        humidityMaxThreshold: payload.humidityMaxThreshold ?? null,
      })
    : null;

  if (device && io) {
    io.emit("device:seen", device);
  }

  if (roomState && io) {
    io.emit("room:state-updated", roomState);
  }
}

async function handleTelemetryMessage({ payload, io }) {
  if (!payload.deviceId || !payload.roomId) {
    logger.warn("Skipping telemetry payload without deviceId or roomId");
    return;
  }

  const device = await upsertDeviceFromPayload(payload);
  const telemetry = await createTelemetryEntry({
    deviceId: payload.deviceId,
    roomId: payload.roomId,
    temperature: payload.temp ?? null,
    humidity: payload.hum ?? null,
    motion: payload.motion ?? false,
    door: payload.door ?? false,
    armed: payload.armed ?? false,
    offline: payload.offline ?? false,
    sensorFailure: payload.sensorFailure ?? false,
    alarmActive: payload.alarmActive ?? false,
    alarmSilenced: payload.alarmSilenced ?? false,
    alarmReason: payload.activeAlarmReason || "",
    dhtOk: payload.dhtOk ?? true,
  });
  const roomState = await upsertRoomCurrentState(payload.roomId, {
    deviceId: payload.deviceId,
    temperature: payload.temp ?? null,
    humidity: payload.hum ?? null,
    motion: payload.motion ?? false,
    door: payload.door ?? false,
    armed: payload.armed ?? false,
    alarmActive: payload.alarmActive ?? false,
    alarmReason: payload.activeAlarmReason || "",
    alarmSilenced: payload.alarmSilenced ?? false,
    offline: payload.offline ?? false,
    sensorFailure: payload.sensorFailure ?? false,
    tempMinThreshold: payload.tempMinThreshold ?? null,
    tempMaxThreshold: payload.tempMaxThreshold ?? null,
    humidityMinThreshold: payload.humidityMinThreshold ?? null,
    humidityMaxThreshold: payload.humidityMaxThreshold ?? null,
    lastTelemetryAt: telemetry.receivedAt,
  });
  await Room.findOneAndUpdate(
    { roomId: payload.roomId },
    {
      $set: {
        deviceId: payload.deviceId,
        armed: payload.armed ?? false,
        alarmActive: payload.alarmActive ?? false,
        alarmReason: payload.activeAlarmReason || "",
        alarmSilenced: payload.alarmSilenced ?? false,
        lastTelemetryAt: telemetry.receivedAt,
      },
    }
  );

  if (device && io) {
    io.emit("device:status-changed", device);
  }

  if (roomState && io) {
    io.emit("room:state-updated", roomState);
    io.emit("room:telemetry", telemetry);
  }
}

async function handleAlarmMessage({ payload, io }) {
  if (!payload.deviceId || !payload.roomId || !payload.reason) {
    logger.warn("Skipping alarm payload without deviceId, roomId or reason");
    return;
  }

  const device = await upsertDeviceFromPayload(payload);
  const alarm = await createAlarmEntry({
    deviceId: payload.deviceId,
    roomId: payload.roomId,
    reason: payload.reason,
    isActive: payload.alarmActive ?? true,
    armed: payload.armed ?? false,
    offline: payload.offline ?? false,
    alarmSilenced: payload.alarmSilenced ?? false,
  });
  const roomState = await upsertRoomCurrentState(payload.roomId, {
    deviceId: payload.deviceId,
    armed: payload.armed ?? false,
    alarmActive: payload.alarmActive ?? true,
    alarmReason: payload.reason,
    alarmSilenced: payload.alarmSilenced ?? false,
    offline: payload.offline ?? false,
  });
  await Room.findOneAndUpdate(
    { roomId: payload.roomId },
    {
      $set: {
        deviceId: payload.deviceId,
        armed: payload.armed ?? false,
        alarmActive: payload.alarmActive ?? true,
        alarmReason: payload.reason,
        alarmSilenced: payload.alarmSilenced ?? false,
      },
    }
  );

  if (device && io) {
    io.emit("device:status-changed", device);
  }

  if (io) {
    io.emit("alarm:triggered", alarm);
  }

  if (roomState && io) {
    io.emit("room:state-updated", roomState);
  }
}

async function handleEventMessage({ payload, io }) {
  const device = await upsertDeviceFromPayload(payload);
  const room = await syncProvisioningState(payload);
  let event = null;

  if (payload.deviceId && payload.roomId && payload.eventName) {
    event = await createEventEntry({
      deviceId: payload.deviceId,
      roomId: payload.roomId,
      eventName: payload.eventName,
      source: payload.source || "",
      details: payload.details || "",
      armed: payload.armed ?? false,
      offline: payload.offline ?? false,
      alarmActive: payload.alarmActive ?? false,
      alarmSilenced: payload.alarmSilenced ?? false,
      alarmReason: payload.activeAlarmReason || "",
    });
  }

  if (device && io) {
    io.emit("device:status-changed", device);
  }

  if (room && io) {
    io.emit("room:state-updated", room);
  }

  if (event && io) {
    io.emit("event:created", event);
  }
}

module.exports = {
  handleAlarmMessage,
  handleStatusMessage,
  handleHeartbeatMessage,
  handleTelemetryMessage,
  handleEventMessage,
};
