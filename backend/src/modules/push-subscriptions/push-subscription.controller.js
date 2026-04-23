const pushSubscriptionService = require("./push-subscription.service");
const { env } = require("../../config/env");
const { validatePushSubscriptionPayload } = require("../../utils/validation");

async function getCurrentSubscriptions(req, res, next) {
  try {
    const subscriptions = await pushSubscriptionService.listSubscriptionsByUserId(req.auth.userId);
    res.json({
      publicKey: env.webPushPublicKey,
      subscriptions: subscriptions.map(pushSubscriptionService.sanitizePushSubscription),
    });
  } catch (error) {
    next(error);
  }
}

async function subscribe(req, res, next) {
  try {
    const subscription = validatePushSubscriptionPayload(req.body);
    const savedSubscription = await pushSubscriptionService.upsertSubscription(req.auth.userId, subscription);

    res.status(201).json(pushSubscriptionService.sanitizePushSubscription(savedSubscription));
  } catch (error) {
    next(error);
  }
}

async function unsubscribe(req, res, next) {
  try {
    const subscription = validatePushSubscriptionPayload(req.body);
    await pushSubscriptionService.deleteSubscriptionByEndpoint(req.auth.userId, subscription.endpoint);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCurrentSubscriptions,
  subscribe,
  unsubscribe,
};
