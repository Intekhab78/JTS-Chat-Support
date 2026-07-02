import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, default: 0 },
    billingCycle: { type: String, enum: ["monthly", "yearly"], default: "monthly", index: true },
    features: [{ type: String }],
    usageLimits: {
      storageGb: { type: Number, default: 5 },
      aiCredits: { type: Number, default: 100 }
    }
  },
  { timestamps: true }
);

planSchema.index({ websiteId: 1, name: 1, billingCycle: 1 }, { unique: true });

export const Plan = mongoose.model("Plan", planSchema);
