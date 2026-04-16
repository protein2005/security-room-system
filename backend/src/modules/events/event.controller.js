const eventService = require("./event.service");

async function getEvents(req, res, next) {
  try {
    const limit = Number(req.query.limit || 100);
    const events = await eventService.listEvents({
      roomId: typeof req.query.roomId === "string" ? req.query.roomId : undefined,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
}

module.exports = { getEvents };
