const mongoose = require("mongoose");

const commandSchema = new mongoose.Schema(
  {
    targetDeviceId: {
      type: String,
      required: true,
      index: true,
    },
    targetRoomId: {
      type: String,
      default: "",
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    payload: {
      type: Object,
      default: {},
    },
    requestedBy: {
      userId: {
        type: String,
        default: "",
      },
      email: {
        type: String,
        default: "",
      },
      name: {
        type: String,
        default: "",
      },
      role: {
        type: String,
        default: "",
      },
    },
    status: {
      type: String,
      enum: ["pending", "published", "failed"],
      default: "pending",
      index: true,
    },
    mqttTopic: {
      type: String,
      default: "",
    },
    errorMessage: {
      type: String,
      default: "",
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Command = mongoose.model("Command", commandSchema);

module.exports = { Command };
