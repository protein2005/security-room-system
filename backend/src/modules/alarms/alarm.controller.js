const alarmService = require("./alarm.service");
const { validateAlarmQuery } = require("../../utils/validation");

async function getAlarms(req, res, next) {
  try {
    const filters = validateAlarmQuery(req.query);
    const alarms = await alarmService.listAlarms(filters);

    res.json(alarms);
  } catch (error) {
    next(error);
  }
}

module.exports = { getAlarms };
