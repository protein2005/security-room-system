const deviceService = require("./device.service");
const roomService = require("../rooms/room.service");
const { listCommands, sendDeviceCommand } = require("../commands/command.service");
const { upsertRoomCurrentState } = require("../room-current-state/room-current-state.service");

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

async function getDeviceCommands(req, res, next) {
  try {
    const device = await deviceService.getDeviceByDeviceId(req.params.deviceId);

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const limit = Number(req.query.limit || 100);
    const commands = await listCommands({
      targetDeviceId: req.params.deviceId,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100,
    });

    res.json(commands);
  } catch (error) {
    next(error);
  }
}

async function factoryResetDevice(req, res, next) {
  try {
    const result = await sendDeviceCommand(req.params.deviceId, "FACTORY_RESET", {}, req.auth);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

async function archiveDevice(req, res, next) {
  try {
    const device = await deviceService.getDeviceByDeviceId(req.params.deviceId);

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    if (device.online) {
      return res.status(409).json({ message: "Онлайн-пристрій не можна архівувати" });
    }

    if (device.currentRoomId) {
      await roomService.clearRoomDeviceAssignment(device.currentRoomId);
      await upsertRoomCurrentState(device.currentRoomId, {
        deviceId: "",
        armed: false,
        alarmActive: false,
        alarmReason: "",
        alarmSilenced: false,
        offline: true,
      });
    }

    const archivedDevice = await deviceService.archiveDevice(req.params.deviceId, req.auth?.login || req.auth?.userId || "");
    res.json(archivedDevice);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDevices,
  getUnprovisionedDevices,
  getDeviceByDeviceId,
  getDeviceCommands,
  factoryResetDevice,
  archiveDevice,
};
