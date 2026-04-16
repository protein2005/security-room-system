const express = require("express");

const deviceController = require("./device.controller");

const router = express.Router();

router.get("/", deviceController.getDevices);
router.get("/unprovisioned", deviceController.getUnprovisionedDevices);
router.get("/:deviceId", deviceController.getDeviceByDeviceId);

module.exports = router;
