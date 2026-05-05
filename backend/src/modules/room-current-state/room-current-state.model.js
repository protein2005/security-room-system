const mongoose = require("mongoose");

const roomCurrentStateSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceId: {
      type: String,
      default: "",
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
    alarmActive: {
      type: Boolean,
      default: false,
    },
    alarmReason: {
      type: String,
      default: "",
    },
    alarmSilenced: {
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
    wifiOk: {
      type: Boolean,
      default: false,
    },
    mqttOk: {
      type: Boolean,
      default: false,
    },
    tempMinThreshold: {
      type: Number,
      default: null,
    },
    tempMaxThreshold: {
      type: Number,
      default: null,
    },
    humidityMinThreshold: {
      type: Number,
      default: null,
    },
    humidityMaxThreshold: {
      type: Number,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    lastTelemetryAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

const RoomCurrentState = mongoose.model(
  "RoomCurrentState",
  roomCurrentStateSchema,
  "room_current_states"
);

module.exports = { RoomCurrentState };
