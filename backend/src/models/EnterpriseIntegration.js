import mongoose from "mongoose";

const syncQueueItemSchema = new mongoose.Schema({
  direction: { type: String, enum: ["outbound", "inbound"], default: "outbound" },
  eventType: { type: String, default: "WEBHOOK_EVENT" },
  payload: { type: Object, default: {} },
  httpStatus: { type: Number, default: null },
  latencyMs: { type: Number, default: null },
  responseSnippet: { type: String, default: "" },
  status: { type: String, enum: ["pending", "synced", "failed"], default: "pending" },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: "" },
  queuedAt: { type: Date, default: Date.now }
});

const enterpriseIntegrationSchema = new mongoose.Schema(
  {
    connectorKey: { type: String, required: true, trim: true, index: true },
    connectorName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["productivity", "storage", "communication", "finance_erp", "bi_analytics", "automation"],
      default: "productivity",
      index: true
    },
    status: {
      type: String,
      enum: ["connected", "configured", "disconnected", "error"],
      default: "disconnected",
      index: true
    },
    authType: {
      type: String,
      enum: ["oauth2", "api_key", "webhook_secret", "basic"],
      default: "oauth2"
    },
    settings: {
      apiKeyMasked: { type: String, default: "" },
      signingSecret: { type: String, default: "" },
      webhookUrl: { type: String, default: "" },
      description: { type: String, default: "" },
      events: { type: [String], default: ["ticket.created", "lead.created", "invoice.paid"] },
      rateLimitPerMin: { type: Number, default: 120 },
      retryCountMax: { type: Number, default: 3 }
    },
    lastSyncAt: { type: Date, default: null },
    syncQueue: [syncQueueItemSchema],
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true }
  },
  { timestamps: true }
);

export const EnterpriseIntegration = mongoose.model("EnterpriseIntegration", enterpriseIntegrationSchema);
