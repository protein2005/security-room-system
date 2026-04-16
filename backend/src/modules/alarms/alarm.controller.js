const alarmService = require("./alarm.service");

async function getAlarms(req, res, next) {
  try {
    const limit = Number(req.query.limit || 100);
    const alarms = await alarmService.listAlarms({
      roomId: typeof req.query.roomId === "string" ? req.query.roomId : undefined,
      activeOnly: req.query.active === "true",
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100,
    });

    res.json(alarms);
  } catch (error) {
    next(error);
  }
}

module.exports = { getAlarms };
