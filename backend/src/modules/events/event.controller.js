const eventService = require("./event.service");
const { validateEventQuery } = require("../../utils/validation");

async function getEvents(req, res, next) {
  try {
    const filters = validateEventQuery(req.query);
    const events = await eventService.listEvents(filters);

    res.json(events);
  } catch (error) {
    next(error);
  }
}

module.exports = { getEvents };
