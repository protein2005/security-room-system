const express = require("express");

const provisioningController = require("./provisioning.controller");

const router = express.Router();

router.post("/device/:deviceId", provisioningController.provisionDevice);

module.exports = router;
