const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    roomName: {
      type: String,
      required: true,
      trim: true,
    },
    zoneType: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    deviceId: {
      type: String,
      default: "",
      index: true,
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
    lastTelemetryAt: {
      type: Date,
      default: null,
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    archivedBy: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Room = mongoose.model("Room", roomSchema);

module.exports = { Room };
