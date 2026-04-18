const express = require("express");

const eventController = require("./event.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", eventController.getEvents);

module.exports = router;
