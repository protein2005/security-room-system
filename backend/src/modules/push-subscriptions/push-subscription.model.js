const mongoose = require("mongoose");

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "User",
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expirationTime: {
      type: Number,
      default: null,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);

module.exports = { PushSubscription };
