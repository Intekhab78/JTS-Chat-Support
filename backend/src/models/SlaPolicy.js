import mongoose from "mongoose";

const slaPolicySchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium",
      index: true
    },
    customerType: { type: String, default: "All" },
    serviceType: { type: String, default: "All" },
    responseTimeTargetHours: { type: Number, default: 2 },
    resolutionTimeTargetHours: { type: Number, default: 24 },
    warningThresholdPercent: { type: Number, default: 75 },
    escalationThresholdPercent: { type: Number, default: 100 },
    sloAvailabilityTarget: { type: Number, default: 99.9 },
    sloResponseTargetHours: { type: Number, default: 1 },
    sloCsatTarget: { type: Number, default: 95 },
    businessHoursOnly: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const SlaPolicy = mongoose.model("SlaPolicy", slaPolicySchema);
