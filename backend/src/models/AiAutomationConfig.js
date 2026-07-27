import mongoose from "mongoose";

const promptTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ["system", "business", "email", "whatsapp", "document", "report"],
    default: "business"
  },
  version: { type: String, default: "v1.0" },
  template: { type: String, required: true },
  variables: [{ type: String }]
});

const automationRuleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  triggerEvent: {
    type: String,
    enum: ["customer_created", "document_uploaded", "compliance_due", "invoice_generated", "payment_received", "risk_created"],
    required: true
  },
  condition: { type: String, default: "Always" },
  actionType: {
    type: String,
    enum: ["send_notification", "generate_summary", "trigger_webhook", "flag_compliance_alert"],
    default: "send_notification"
  },
  isActive: { type: Boolean, default: true }
});

const knowledgeArticleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, default: "SOP" },
  content: { type: String, required: true },
  tags: [{ type: String }]
});

const aiAutomationConfigSchema = new mongoose.Schema(
  {
    aiEnabled: { type: Boolean, default: true, index: true },
    activeLlmProvider: { type: String, default: "mock_provider_placeholder" },
    activeOcrProvider: { type: String, default: "mock_ocr_placeholder" },
    promptTemplates: [promptTemplateSchema],
    automationRules: [automationRuleSchema],
    knowledgeArticles: [knowledgeArticleSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const AiAutomationConfig = mongoose.model("AiAutomationConfig", aiAutomationConfigSchema);
