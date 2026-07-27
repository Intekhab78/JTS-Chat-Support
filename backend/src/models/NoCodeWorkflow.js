import mongoose from "mongoose";

const workflowNodeSchema = new mongoose.Schema({
  nodeType: { type: String, enum: ["trigger", "condition", "action", "delay", "approval"], required: true },
  label: { type: String, required: true },
  config: { type: Object, default: {} }
});

const executionRunSchema = new mongoose.Schema({
  runId: { type: String, required: true },
  status: { type: String, enum: ["success", "failed", "running"], default: "success" },
  durationMs: { type: Number, default: 120 },
  executedAt: { type: Date, default: Date.now },
  logs: [{ type: String }]
});

const noCodeWorkflowSchema = new mongoose.Schema(
  {
    workflowName: { type: String, required: true, trim: true },
    triggerType: {
      type: String,
      enum: ["customer_created", "customer_updated", "vat_due", "corporate_tax_due", "trade_license_expiry", "document_uploaded", "payment_received", "risk_created", "manual"],
      required: true,
      index: true
    },
    nodes: [workflowNodeSchema],
    status: {
      type: String,
      enum: ["active", "paused", "draft"],
      default: "active",
      index: true
    },
    executionHistory: [executionRunSchema],
    analytics: {
      totalRuns: { type: Number, default: 45 },
      successCount: { type: Number, default: 44 },
      failureCount: { type: Number, default: 1 },
      avgDurationMs: { type: Number, default: 135 }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const NoCodeWorkflow = mongoose.model("NoCodeWorkflow", noCodeWorkflowSchema);
