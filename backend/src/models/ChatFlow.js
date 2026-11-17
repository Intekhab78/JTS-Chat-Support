import mongoose from "mongoose";

const flowNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ["trigger", "question", "options", "form", "condition", "business_hours", "ai_faq", "lead_action", "ticket_action", "transfer_agent", "message"],
    required: true
  },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  options: [{
    label: { type: String, required: true },
    targetNodeId: { type: String, default: "" }
  }],
  formFields: [{
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ["text", "email", "tel", "textarea", "select", "file"], default: "text" },
    placeholder: { type: String, default: "" },
    required: { type: Boolean, default: true },
    options: [{ type: String }]
  }],
  submitLabel: { type: String, default: "Submit Details" },
  nextNodeId: { type: String, default: "" },
  openTargetNodeId: { type: String, default: "" },
  closedTargetNodeId: { type: String, default: "" },
  offlineTargetNodeId: { type: String, default: "" },
  conditionConfig: {
    fieldKey: { type: String, default: "budget" },
    operator: { type: String, enum: ["equals", "contains", "gt", "lt"], default: "gt" },
    value: { type: String, default: "50000" },
    trueTargetNodeId: { type: String, default: "" },
    falseTargetNodeId: { type: String, default: "" }
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  }
});

const chatFlowSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    triggerKeyword: { type: String, trim: true, default: "hello" },
    triggerType: { type: String, enum: ["keyword", "welcome", "delayed", "page_url"], default: "keyword" },
    triggerUrlPattern: { type: String, trim: true, default: "" },
    notifyEmail: { type: String, trim: true, default: "" },
    notifyWhatsapp: { type: String, trim: true, default: "" },
    notifyCustomerWhatsapp: { type: Boolean, default: false },
    notifyWebhookUrl: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    nodes: [flowNodeSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const ChatFlow = mongoose.model("ChatFlow", chatFlowSchema);
