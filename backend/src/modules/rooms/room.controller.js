const roomService = require("./room.service");
const { listCommands, sendRoomCommand } = require("../commands/command.service");
const { parseLimit, validateRoomPayload, validateThresholdPayload } = require("../../utils/validation");

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
    const payload = validateRoomPayload(req.body);

    const existingRoom = await roomService.getRoomByRoomId(payload.roomId);

    if (existingRoom) {
      return res.status(409).json({ message: "Room with this roomId already exists" });
    }

    const room = await roomService.createRoom(payload);
    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
}

async function updateRoom(req, res, next) {
  try {
    const payload = validateRoomPayload(req.body, { partial: true });

    const room = await roomService.updateRoom(req.params.roomId, payload);

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

    const limit = parseLimit(req.query.limit);
    const telemetry = await roomService.listTelemetryByRoomId(req.params.roomId, {
      limit,
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

    const limit = parseLimit(req.query.limit);
    const alarms = await roomService.listRoomAlarms(req.params.roomId, {
      activeOnly: req.query.active === "true",
      limit,
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

    const limit = parseLimit(req.query.limit);
    const events = await roomService.listRoomEvents(req.params.roomId, {
      limit,
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

    const limit = parseLimit(req.query.limit);
    const commands = await listCommands({
      targetRoomId: req.params.roomId,
      limit,
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
    const { tempMin, tempMax, humidityMin, humidityMax } = validateThresholdPayload(req.body);

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
