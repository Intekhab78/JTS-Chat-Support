import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    type: {
      type: String,
      enum: ["task", "meeting", "call", "renewal", "payment", "birthday", "custom"],
      default: "custom",
      index: true
    },
    title: { type: String, required: true, trim: true },
    remindAt: { type: Date, required: true, index: true },
    isSent: { type: Boolean, default: false, index: true },
    sentAt: { type: Date, default: null },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null } // reference to Task/Meeting/Invoice ID
  },
  { timestamps: true }
);

export const Reminder = mongoose.model("Reminder", reminderSchema);
