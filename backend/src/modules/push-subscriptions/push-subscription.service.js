const webpush = require("web-push");

const { env } = require("../../config/env");
const { logger } = require("../../utils/logger");
const { PushSubscription } = require("./push-subscription.model");

webpush.setVapidDetails(env.webPushSubject, env.webPushPublicKey, env.webPushPrivateKey);

function sanitizePushSubscription(subscription) {
  if (!subscription) {
    return null;
  }

  return {
    _id: subscription._id,
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
  };
}

async function listSubscriptionsByUserId(userId) {
  return PushSubscription.find({ userId }).sort({ createdAt: -1 });
}

async function upsertSubscription(userId, subscription) {
  return PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      $set: {
        userId,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function deleteSubscriptionByEndpoint(userId, endpoint) {
  return PushSubscription.findOneAndDelete({ userId, endpoint });
}

async function deleteSubscriptionById(subscriptionId) {
  return PushSubscription.findByIdAndDelete(subscriptionId);
}

async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      JSON.stringify(payload)
    );
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      await deleteSubscriptionById(subscription._id);
      logger.warn(`Removed expired push subscription: ${subscription.endpoint}`);
      return;
    }

    logger.error("Failed to send web push notification", error);
  }
}

async function sendAlarmPushNotifications({ alarm, roomName }) {
  const subscriptions = await PushSubscription.find().lean();

  if (!subscriptions.length) {
    return;
  }

  const payload = {
    title: "Нова тривога",
    body: `${roomName || alarm.roomId}: ${alarm.reason}`,
    tag: `alarm-${alarm.roomId}`,
    url: "/alarms",
    data: {
      alarmId: String(alarm._id),
      roomId: alarm.roomId,
      deviceId: alarm.deviceId,
      reason: alarm.reason,
      triggeredAt: alarm.triggeredAt,
    },
  };

  await Promise.all(subscriptions.map((subscription) => sendPushNotification(subscription, payload)));
}

module.exports = {
  sanitizePushSubscription,
  listSubscriptionsByUserId,
  upsertSubscription,
  deleteSubscriptionByEndpoint,
  sendAlarmPushNotifications,
};
