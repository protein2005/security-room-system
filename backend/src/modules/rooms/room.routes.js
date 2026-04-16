const express = require("express");

const roomController = require("./room.controller");

const router = express.Router();

router.get("/", roomController.getRooms);
router.post("/", roomController.createRoom);
router.get("/:roomId", roomController.getRoomByRoomId);
router.patch("/:roomId", roomController.updateRoom);
router.get("/:roomId/state", roomController.getRoomState);
router.get("/:roomId/telemetry", roomController.getRoomTelemetry);
router.get("/:roomId/alarms", roomController.getRoomAlarms);
router.get("/:roomId/events", roomController.getRoomEvents);

module.exports = router;
