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
router.post("/:roomId/arm", roomController.armRoom);
router.post("/:roomId/disarm", roomController.disarmRoom);
router.post("/:roomId/reset-alarm", roomController.resetRoomAlarm);
router.post("/:roomId/thresholds", roomController.updateRoomThresholds);

module.exports = router;
