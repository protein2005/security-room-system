const express = require("express");

const telegramController = require("./telegram.controller");
const { requireAuth, requireRole } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.get("/config", requireRole(["admin"]), telegramController.getTelegramConfig);
router.patch("/config", requireRole(["admin"]), telegramController.updateTelegramConfig);
router.get("/me", telegramController.getTelegramStatus);
router.post("/me/unlink", telegramController.unlinkTelegram);
router.post("/me/enabled", telegramController.updateTelegramEnabled);

module.exports = router;
