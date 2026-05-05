const { Device } = require("./device.model");

function buildDeviceFilter(filters = {}) {
  const query = {};

  if (typeof filters.online === "boolean") {
    query.online = filters.online;
  }

  if (typeof filters.provisioned === "boolean") {
    query.provisioned = filters.provisioned;
  }

  return query;
}

async function listDevices(filters = {}) {
  return Device.find(buildDeviceFilter(filters)).sort({ updatedAt: -1 }).lean();
}

async function listUnprovisionedDevices() {
  return Device.find({ provisioned: false }).sort({ updatedAt: -1 }).lean();
}

async function getDeviceByDeviceId(deviceId) {
  return Device.findOne({ deviceId }).lean();
}

async function assignDeviceToRoom({ deviceId, roomId }) {
  return Device.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        currentRoomId: roomId,
      },
    },
    { new: true }
  ).lean();
}

async function clearDeviceRoomAssignment(deviceId) {
  return Device.findOneAndUpdate(
    { deviceId },
    {
      $set: {
        currentRoomId: "",
        provisioned: false,
      },
    },
    { new: true }
  ).lean();
}

module.exports = {
  listDevices,
  listUnprovisionedDevices,
  getDeviceByDeviceId,
  assignDeviceToRoom,
  clearDeviceRoomAssignment,
};
