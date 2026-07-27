import mongoose from "mongoose";

const productFeatureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    module: { type: String, default: "CRM Core" },
    category: {
      type: String,
      enum: ["core", "compliance", "finance", "observability", "governance", "automation"],
      default: "core",
      index: true
    },
    priority: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      default: "high"
    },
    businessValue: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "high"
    },
    status: {
      type: String,
      enum: ["backlog", "planned", "in_progress", "testing", "ready_for_release", "released", "deprecated"],
      default: "planned",
      index: true
    },
    targetVersion: { type: String, default: "v1.1.0" },
    votesCount: { type: Number, default: 1 },
    isFeatureFlagEnabled: { type: Boolean, default: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const ProductFeature = mongoose.model("ProductFeature", productFeatureSchema);
