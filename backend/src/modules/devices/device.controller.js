const deviceService = require("./device.service");

async function getDevices(_req, res, next) {
  try {
    const devices = await deviceService.listDevices({
      online:
        typeof _req.query.online === "string"
          ? _req.query.online === "true"
          : undefined,
      provisioned:
        typeof _req.query.provisioned === "string"
          ? _req.query.provisioned === "true"
          : undefined,
    });
    res.json(devices);
  } catch (error) {
    next(error);
  }
}

async function getUnprovisionedDevices(_req, res, next) {
  try {
    const devices = await deviceService.listUnprovisionedDevices();
    res.json(devices);
  } catch (error) {
    next(error);
  }
}

async function getDeviceByDeviceId(req, res, next) {
  try {
    const device = await deviceService.getDeviceByDeviceId(req.params.deviceId);

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    res.json(device);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDevices,
  getUnprovisionedDevices,
  getDeviceByDeviceId,
};
