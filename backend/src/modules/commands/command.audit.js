const COMMAND_EVENT_MATCHERS = {
  PROVISION: {
    statuses: ["PROVISIONED"],
    events: ["DEVICE_PROVISIONED"],
  },
  ARM: {
    statuses: ["ARMED"],
    events: ["LOCAL_ARM"],
  },
  DISARM: {
    statuses: ["DISARMED"],
    events: [],
  },
  RESET_ALARM: {
    statuses: ["ALARM_RESET", "ALARM_CLEARED"],
    events: [],
  },
  SET_THRESHOLDS: {
    statuses: ["THRESHOLDS_UPDATED"],
    events: [],
  },
  FACTORY_RESET: {
    statuses: ["FACTORY_RESET"],
    events: ["FACTORY_RESET"],
  },
};

function getCommandMatcher(action) {
  return COMMAND_EVENT_MATCHERS[action] || { statuses: [], events: [] };
}

function findActionByStatus(status) {
  return (
    Object.entries(COMMAND_EVENT_MATCHERS).find(([, matcher]) => matcher.statuses.includes(status))?.[0] || null
  );
}

function findActionByEvent(eventName) {
  return (
    Object.entries(COMMAND_EVENT_MATCHERS).find(([, matcher]) => matcher.events.includes(eventName))?.[0] || null
  );
}

module.exports = {
  findActionByEvent,
  findActionByStatus,
  getCommandMatcher,
};
