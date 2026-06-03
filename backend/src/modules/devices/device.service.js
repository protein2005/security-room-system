const { Device } = require("./device.model");

function buildDeviceFilter(filters = {}) {
  const query = { archived: { $ne: true } };

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
  return Device.find({ provisioned: false, archived: { $ne: true } }).sort({ updatedAt: -1 }).lean();
}

async function getDeviceByDeviceId(deviceId) {
  return Device.findOne({ deviceId, archived: { $ne: true } }).lean();
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

async function archiveDevice(deviceId, archivedBy = "") {
  return Device.findOneAndUpdate(
    { deviceId, archived: { $ne: true } },
    {
      $set: {
        currentRoomId: "",
        provisioned: false,
        online: false,
        wifiOk: false,
        mqttOk: false,
        archived: true,
        archivedAt: new Date(),
        archivedBy,
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
  archiveDevice,
};
