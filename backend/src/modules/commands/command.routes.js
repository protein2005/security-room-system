const express = require("express");

const commandController = require("./command.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", commandController.getCommands);

module.exports = router;
