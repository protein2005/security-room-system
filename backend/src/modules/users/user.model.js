const mongoose = require("mongoose");

function createTelegramLinkToken() {
  return new mongoose.Types.ObjectId().toString();
}

const userSchema = new mongoose.Schema(
  {
    login: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "operator", "viewer"],
      default: "viewer",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    telegramChatId: {
      type: String,
      default: "",
      index: true,
    },
    telegramUsername: {
      type: String,
      default: "",
      trim: true,
    },
    telegramEnabled: {
      type: Boolean,
      default: false,
    },
    telegramLinkedAt: {
      type: Date,
      default: null,
    },
    telegramLinkToken: {
      type: String,
      default: createTelegramLinkToken,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
