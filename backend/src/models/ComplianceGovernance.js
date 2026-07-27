import mongoose from "mongoose";

const dsarRequestSchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ["access", "rectification", "erasure", "export", "restrict_processing", "object"],
    required: true
  },
  subjectEmail: { type: String, required: true, trim: true },
  details: { type: String, default: "" },
  status: {
    type: String,
    enum: ["pending", "in_review", "completed", "rejected"],
    default: "pending",
    index: true
  },
  requestedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});

const consentLogSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, trim: true },
  consentType: { type: String, enum: ["analytics", "marketing", "essential", "data_sharing"], default: "essential" },
  isGranted: { type: Boolean, default: true },
  ipAddress: { type: String, default: "127.0.0.1" },
  timestamp: { type: Date, default: Date.now }
});

const retentionPolicySchema = new mongoose.Schema({
  dataCategory: { type: String, required: true, trim: true },
  retentionYears: { type: Number, required: true },
  autoArchive: { type: Boolean, default: true },
  autoDelete: { type: Boolean, default: false }
});

const complianceGovernanceSchema = new mongoose.Schema(
  {
    complianceScores: {
      gdprPercent: { type: Number, default: 96.4 },
      pdplPercent: { type: Number, default: 98.2 },
      soc2Percent: { type: Number, default: 94.5 },
      iso27001Percent: { type: Number, default: 95.8 },
      iso27701Percent: { type: Number, default: 92.1 }
    },
    dsarRequests: [dsarRequestSchema],
    consentLogs: [consentLogSchema],
    retentionPolicies: [retentionPolicySchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const ComplianceGovernance = mongoose.model("ComplianceGovernance", complianceGovernanceSchema);
