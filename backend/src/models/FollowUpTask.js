import mongoose from "mongoose";
import { FOLLOW_UP_TASK_STATUSES, FOLLOW_UP_TASK_TYPES } from "../constants/domain.js";

const followUpTaskSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    type: { type: String, enum: FOLLOW_UP_TASK_TYPES, default: "follow_up" },
    title: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: "" },
    dueAt: { type: Date, required: true, index: true },
    completedAt: { type: Date, default: null },
    status: { type: String, enum: FOLLOW_UP_TASK_STATUSES, default: "open", index: true },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium", index: true },
    reminderAt: { type: Date, default: null },
    checklist: [{
      text: { type: String, trim: true },
      checked: { type: Boolean, default: false }
    }],
    comments: [{
      authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      authorName: { type: String, default: "" },
      text: { type: String, trim: true },
      createdAt: { type: Date, default: Date.now }
    }],
    attachments: [{
      filename: { type: String, trim: true },
      url: { type: String, trim: true }
    }],
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "FollowUpTask" }]
  },
  { timestamps: true }
);

export const FollowUpTask = mongoose.model("FollowUpTask", followUpTaskSchema);
