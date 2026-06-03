const express = require("express");

const deviceController = require("./device.controller");
const { requireAuth, requireRole } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", deviceController.getDevices);
router.get("/unprovisioned", deviceController.getUnprovisionedDevices);
router.get("/:deviceId/commands", deviceController.getDeviceCommands);
router.post("/:deviceId/factory-reset", requireRole(["admin"]), deviceController.factoryResetDevice);
router.post("/:deviceId/archive", requireRole(["admin"]), deviceController.archiveDevice);
router.get("/:deviceId", deviceController.getDeviceByDeviceId);

module.exports = router;
