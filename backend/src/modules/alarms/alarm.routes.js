const express = require("express");

const alarmController = require("./alarm.controller");

const router = express.Router();

router.get("/", alarmController.getAlarms);

module.exports = router;
