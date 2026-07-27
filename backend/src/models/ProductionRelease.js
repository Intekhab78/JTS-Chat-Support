import mongoose from "mongoose";

const productionReleaseSchema = new mongoose.Schema(
  {
    releaseName: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true, index: true },
    releaseNotes: { type: String, default: "" },
    featuresAdded: [{ type: String }],
    bugsFixed: [{ type: String }],
    migrationNotes: { type: String, default: "No breaking database schema migrations required." },
    releaseOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "technical_review",
        "qa_approved",
        "business_approved",
        "ready_for_deployment",
        "deployed",
        "rolled_back"
      ],
      default: "draft",
      index: true
    },
    preFlightChecklist: {
      buildPassing: { type: Boolean, default: true },
      envVarsValid: { type: Boolean, default: true },
      dbHealthy: { type: Boolean, default: true },
      queueHealthy: { type: Boolean, default: true },
      storageHealthy: { type: Boolean, default: true },
      backupVerified: { type: Boolean, default: true }
    },
    smokeTestsPassed: { type: Boolean, default: true },
    deployedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const ProductionRelease = mongoose.model("ProductionRelease", productionReleaseSchema);
