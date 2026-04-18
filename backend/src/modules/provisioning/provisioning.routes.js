const express = require("express");

const provisioningController = require("./provisioning.controller");
const { requireAuth, requireRole } = require("../../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/device/:deviceId",
  requireAuth,
  requireRole(["admin", "operator"]),
  provisioningController.provisionDevice
);

module.exports = router;
