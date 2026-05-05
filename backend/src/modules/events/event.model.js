const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    eventName: {
      type: String,
      required: true,
      index: true,
    },
    source: {
      type: String,
      default: "",
    },
    level: {
      type: String,
      default: "info",
    },
    details: {
      type: String,
      default: "",
    },
    armed: {
      type: Boolean,
      default: false,
    },
    offline: {
      type: Boolean,
      default: false,
    },
    alarmActive: {
      type: Boolean,
      default: false,
    },
    alarmSilenced: {
      type: Boolean,
      default: false,
    },
    alarmReason: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

const Event = mongoose.model("Event", eventSchema, "events");

module.exports = { Event };
