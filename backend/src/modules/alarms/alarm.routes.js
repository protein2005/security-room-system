const express = require("express");

const alarmController = require("./alarm.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", alarmController.getAlarms);

module.exports = router;
