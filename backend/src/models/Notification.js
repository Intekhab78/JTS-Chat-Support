import mongoose from "mongoose";
import { NOTIFICATION_TYPES } from "../constants/domain.js";

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: true
  },
  title: {
    type: String,
    default: "System Notification",
    trim: true
  },
  message: {
    type: String,
    default: "Notification update",
    trim: true
  },
  link: {
    type: String
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  actorName: {
    type: String,
    trim: true,
    default: ""
  },
  entityType: {
    type: String,
    trim: true,
    default: ""
  },
  entityId: {
    type: String,
    trim: true,
    default: ""
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.pre("validate", function (next) {
  if (!this.message || !this.message.trim()) {
    this.message = this.title || "Notification update";
  }
  if (!this.title || !this.title.trim()) {
    this.title = "System Notification";
  }
  next();
});

export const Notification = mongoose.model("Notification", notificationSchema);
