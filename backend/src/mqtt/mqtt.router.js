const {
  handleAlarmMessage,
  handleEventMessage,
  handleHeartbeatMessage,
  handleStatusMessage,
  handleTelemetryMessage,
} = require("./mqtt.handlers");

async function routeMqttMessage({ topic, payload, io, topics }) {
  if (
    topic.endsWith("/status") &&
    (topic.startsWith(topics.deviceStatus.slice(0, -8)) ||
      topic.startsWith(topics.roomStatus.slice(0, -8)))
  ) {
    await handleStatusMessage({ payload, io });
    return;
  }

  if (
    topic.endsWith("/heartbeat") &&
    (topic.startsWith(topics.deviceHeartbeat.slice(0, -11)) ||
      topic.startsWith(topics.roomHeartbeat.slice(0, -11)))
  ) {
    await handleHeartbeatMessage({ payload, io });
    return;
  }

  if (topic.endsWith("/telemetry")) {
    await handleTelemetryMessage({ payload, io });
    return;
  }

  if (topic.endsWith("/alarm")) {
    await handleAlarmMessage({ payload, io });
    return;
  }

  if (topic.endsWith("/event")) {
    await handleEventMessage({ payload, io });
  }
}

module.exports = { routeMqttMessage };
