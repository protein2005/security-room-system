const express = require("express");

const eventController = require("./event.controller");

const router = express.Router();

router.get("/", eventController.getEvents);

module.exports = router;
