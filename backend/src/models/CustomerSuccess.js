import mongoose from "mongoose";

const customerSuccessSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, unique: true, index: true },
    healthScore: { type: Number, default: 80, min: 0, max: 100 }, // overall health percentage
    onboardingStatus: {
      type: String,
      enum: ["pending", "in_progress", "completed", "none"],
      default: "none",
      index: true
    },
    onboardingChecklist: {
      workspaceCreated: { type: Boolean, default: false },
      adminInvited: { type: Boolean, default: false },
      usersAdded: { type: Boolean, default: false },
      dataImported: { type: Boolean, default: false },
      trainingCompleted: { type: Boolean, default: false },
      goLive: { type: Boolean, default: false }
    },
    adoptionScore: { type: Number, default: 50, min: 0, max: 100 }, // features usage rating
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
      index: true
    },
    successManager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    renewalStatus: {
      type: String,
      enum: ["pending", "renewed", "cancelled", "expired"],
      default: "pending",
      index: true
    }
  },
  { timestamps: true }
);

export const CustomerSuccess = mongoose.model("CustomerSuccess", customerSuccessSchema);
