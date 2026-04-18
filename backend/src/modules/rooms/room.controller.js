const roomService = require("./room.service");
const { listCommands, sendRoomCommand } = require("../commands/command.service");

function validateRoomPayload(body, { partial = false } = {}) {
  const requiredFields = ["roomId", "roomName", "zoneType"];

  if (!partial) {
    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== "string") {
        return `${field} is required`;
      }
    }
  }

  return null;
}

async function getRooms(_req, res, next) {
  try {
    const rooms = await roomService.listRooms();
    res.json(rooms);
  } catch (error) {
    next(error);
  }
}

async function getRoomByRoomId(req, res, next) {
  try {
    const room = await roomService.getRoomByRoomId(req.params.roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
  } catch (error) {
    next(error);
  }
}

async function createRoom(req, res, next) {
  try {
    const validationError = validateRoomPayload(req.body);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existingRoom = await roomService.getRoomByRoomId(req.body.roomId);

    if (existingRoom) {
      return res.status(409).json({ message: "Room with this roomId already exists" });
    }

    const room = await roomService.createRoom(req.body);
    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
}

async function updateRoom(req, res, next) {
  try {
    const validationError = validateRoomPayload(req.body, { partial: true });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const room = await roomService.updateRoom(req.params.roomId, req.body);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
  } catch (error) {
    next(error);
  }
}

async function getRoomState(req, res, next) {
  try {
    const room = await roomService.getRoomByRoomId(req.params.roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const state = await roomService.getRoomCurrentState(req.params.roomId);
    res.json(state || null);
  } catch (error) {
    next(error);
  }
}

async function getRoomTelemetry(req, res, next) {
  try {
    const room = await roomService.getRoomByRoomId(req.params.roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const limit = Number(req.query.limit || 100);
    const telemetry = await roomService.listTelemetryByRoomId(req.params.roomId, {
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100,
    });

    res.json(telemetry);
  } catch (error) {
    next(error);
  }
}

async function getRoomAlarms(req, res, next) {
  try {
    const room = await roomService.getRoomByRoomId(req.params.roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const limit = Number(req.query.limit || 100);
    const alarms = await roomService.listRoomAlarms(req.params.roomId, {
      activeOnly: req.query.active === "true",
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100,
    });

    res.json(alarms);
  } catch (error) {
    next(error);
  }
}

async function getRoomEvents(req, res, next) {
  try {
    const room = await roomService.getRoomByRoomId(req.params.roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const limit = Number(req.query.limit || 100);
    const events = await roomService.listRoomEvents(req.params.roomId, {
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
}

async function getRoomCommands(req, res, next) {
  try {
    const room = await roomService.getRoomByRoomId(req.params.roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const limit = Number(req.query.limit || 100);
    const commands = await listCommands({
      targetRoomId: req.params.roomId,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100,
    });

    res.json(commands);
  } catch (error) {
    next(error);
  }
}

async function armRoom(req, res, next) {
  try {
    const result = await sendRoomCommand(req.params.roomId, "ARM", {}, req.auth);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

async function disarmRoom(req, res, next) {
  try {
    const result = await sendRoomCommand(req.params.roomId, "DISARM", {}, req.auth);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

async function resetRoomAlarm(req, res, next) {
  try {
    const result = await sendRoomCommand(req.params.roomId, "RESET_ALARM", {}, req.auth);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateRoomThresholds(req, res, next) {
  try {
    const { tempMin, tempMax, humidityMin, humidityMax } = req.body;

    if (
      [tempMin, tempMax, humidityMin, humidityMax].some(
        (value) => typeof value !== "number" || Number.isNaN(value)
      )
    ) {
      return res.status(400).json({
        message: "tempMin, tempMax, humidityMin and humidityMax must be numbers",
      });
    }

    const result = await sendRoomCommand(
      req.params.roomId,
      "SET_THRESHOLDS",
      {
        tempMin,
        tempMax,
        humidityMin,
        humidityMax,
      },
      req.auth
    );

    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRooms,
  getRoomByRoomId,
  createRoom,
  updateRoom,
  getRoomState,
  getRoomTelemetry,
  getRoomAlarms,
  getRoomEvents,
  getRoomCommands,
  armRoom,
  disarmRoom,
  resetRoomAlarm,
  updateRoomThresholds,
};
