const mongoose = require("mongoose");

const alarmSchema = new mongoose.Schema(
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
    reason: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    armed: {
      type: Boolean,
      default: false,
    },
    offline: {
      type: Boolean,
      default: false,
    },
    alarmSilenced: {
      type: Boolean,
      default: false,
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    silencedAt: {
      type: Date,
      default: null,
    },
    clearedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

const Alarm = mongoose.model("Alarm", alarmSchema, "alarms");

module.exports = { Alarm };
