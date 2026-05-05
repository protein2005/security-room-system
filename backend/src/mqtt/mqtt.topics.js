function createTopicMap(rootTopic) {
  return {
    deviceStatus: `${rootTopic}/devices/+/status`,
    deviceHeartbeat: `${rootTopic}/devices/+/heartbeat`,
    roomStatus: `${rootTopic}/rooms/+/status`,
    roomHeartbeat: `${rootTopic}/rooms/+/heartbeat`,
    roomTelemetry: `${rootTopic}/rooms/+/telemetry`,
    roomAlarm: `${rootTopic}/rooms/+/alarm`,
    roomEvent: `${rootTopic}/rooms/+/event`,
  };
}

module.exports = { createTopicMap };
