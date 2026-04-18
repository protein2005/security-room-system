const commandService = require("./command.service");

async function getCommands(req, res, next) {
  try {
    const limit = Number(req.query.limit || 100);
    const commands = await commandService.listCommands({
      targetRoomId: req.query.roomId || "",
      targetDeviceId: req.query.deviceId || "",
      action: req.query.action || "",
      status: req.query.status || "",
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100,
    });

    res.json(commands);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCommands,
};
