import mongoose from "mongoose";

const featureFlagSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "" },
    targetType: { type: String, enum: ["tenant", "role", "user"], default: "tenant" },
    targetIds: [{ type: String }],
    isEnabled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const FeatureFlag = mongoose.model("FeatureFlag", featureFlagSchema);
