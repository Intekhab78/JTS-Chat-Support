import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    monthlyPrice: { type: Number, required: true, default: 0 },
    annualPrice: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "USD" },
    currencySymbol: { type: String, default: "$" },
    limits: {
      agents: { type: Number, default: 5 },
      websites: { type: Number, default: 2 }
    },
    includedModules: {
      type: [String],
      default: ["crm", "operations", "finance", "compliance", "service", "automation"]
    },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const SubscriptionPlan = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
