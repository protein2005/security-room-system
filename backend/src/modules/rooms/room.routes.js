const express = require("express");

const roomController = require("./room.controller");
const { requireAuth, requireRole } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", roomController.getRooms);
router.post("/", requireRole(["admin", "operator"]), roomController.createRoom);
router.get("/:roomId", roomController.getRoomByRoomId);
router.patch("/:roomId", requireRole(["admin", "operator"]), roomController.updateRoom);
router.get("/:roomId/state", roomController.getRoomState);
router.get("/:roomId/telemetry", roomController.getRoomTelemetry);
router.get("/:roomId/alarms", roomController.getRoomAlarms);
router.get("/:roomId/events", roomController.getRoomEvents);
router.get("/:roomId/commands", roomController.getRoomCommands);
router.post("/:roomId/arm", requireRole(["admin", "operator"]), roomController.armRoom);
router.post("/:roomId/disarm", requireRole(["admin", "operator"]), roomController.disarmRoom);
router.post("/:roomId/reset-alarm", requireRole(["admin", "operator"]), roomController.resetRoomAlarm);
router.post("/:roomId/thresholds", requireRole(["admin", "operator"]), roomController.updateRoomThresholds);

module.exports = router;
