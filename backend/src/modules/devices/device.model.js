const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    deviceType: {
      type: String,
      default: "esp32_security_node",
    },
    firmwareVersion: {
      type: String,
      default: "",
    },
    provisioned: {
      type: Boolean,
      default: false,
    },
    currentRoomId: {
      type: String,
      default: "",
      index: true,
    },
    lastStatus: {
      type: String,
      default: "UNKNOWN",
    },
    online: {
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
    lastSeenAt: {
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

const Device = mongoose.model("Device", deviceSchema);

module.exports = { Device };
