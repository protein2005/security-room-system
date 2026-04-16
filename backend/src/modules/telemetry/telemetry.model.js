const mongoose = require("mongoose");

const telemetrySchema = new mongoose.Schema(
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
    temperature: {
      type: Number,
      default: null,
    },
    humidity: {
      type: Number,
      default: null,
    },
    motion: {
      type: Boolean,
      default: false,
    },
    door: {
      type: Boolean,
      default: false,
    },
    armed: {
      type: Boolean,
      default: false,
    },
    offline: {
      type: Boolean,
      default: false,
    },
    sensorFailure: {
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
    dhtOk: {
      type: Boolean,
      default: true,
    },
    receivedAt: {
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

const Telemetry = mongoose.model("Telemetry", telemetrySchema, "telemetry_history");

module.exports = { Telemetry };
