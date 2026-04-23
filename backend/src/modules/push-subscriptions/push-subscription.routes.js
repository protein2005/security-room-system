const express = require("express");

const pushSubscriptionController = require("./push-subscription.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.get("/me", pushSubscriptionController.getCurrentSubscriptions);
router.post("/subscribe", pushSubscriptionController.subscribe);
router.post("/unsubscribe", pushSubscriptionController.unsubscribe);

module.exports = router;
