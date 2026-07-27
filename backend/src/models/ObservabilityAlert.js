import mongoose from "mongoose";

const observabilityAlertSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", default: null, index: true },
    ruleName: { type: String, required: true, trim: true },
    metricType: {
      type: String,
      enum: ["cpu", "memory", "database", "disk", "slow_api", "high_errors", "failed_logins"],
      required: true,
      index: true
    },
    thresholdValue: { type: Number, required: true },
    severity: {
      type: String,
      enum: ["critical", "warning", "info"],
      default: "warning"
    },
    notificationChannel: {
      type: String,
      enum: ["in_app", "email", "webhook"],
      default: "in_app"
    },
    isTriggered: { type: Boolean, default: false, index: true },
    lastTriggeredAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const ObservabilityAlert = mongoose.model("ObservabilityAlert", observabilityAlertSchema);
