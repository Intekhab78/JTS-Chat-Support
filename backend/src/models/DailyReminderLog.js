import mongoose from "mongoose";

const dailyReminderLogSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    consultantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    serviceType: {
      type: String,
      enum: ["vat", "corporate_tax", "trade_license", "visa_extension"],
      required: true
    },
    filingMonth: {
      type: String, // format YYYY-MM e.g. "2026-05"
      required: true
    },
    reminderDate: {
      type: String, // format YYYY-MM-DD e.g. "2026-05-28"
      required: true
    },
    status: {
      type: String,
      enum: ["sent", "missed"],
      default: "sent"
    },
    notes: {
      type: String,
      default: "Reminder sent to client"
    }
  },
  { timestamps: true }
);

// Compound index for fast lookup of client daily reminders
dailyReminderLogSchema.index({ clientId: 1, filingMonth: 1, reminderDate: 1 }, { unique: true });

export const DailyReminderLog = mongoose.model("DailyReminderLog", dailyReminderLogSchema);
