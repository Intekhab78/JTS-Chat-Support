import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true, index: true },
    status: {
      type: String,
      enum: ["free_trial", "active", "suspended", "expired", "cancelled", "renewed"],
      default: "active",
      index: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    renewalDate: { type: Date, default: null },
    seats: { type: Number, default: 1 },
    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly", "half_yearly", "yearly"],
      default: "monthly",
      index: true
    },
    autoRenewal: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
