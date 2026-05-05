const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      immutable: true,
    },
    telegram: {
      botToken: {
        type: String,
        default: "",
      },
      botName: {
        type: String,
        default: "",
        trim: true,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const SystemSettings = mongoose.model("SystemSettings", systemSettingsSchema);

module.exports = { SystemSettings };
