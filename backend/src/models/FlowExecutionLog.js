import mongoose from "mongoose";

const flowExecutionLogSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    flowId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatFlow", required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    eventType: {
      type: String,
      enum: [
        "flow_started",
        "node_visited",
        "option_clicked",
        "ai_resolved",
        "conversion_lead",
        "conversion_ticket",
        "transferred_agent",
        "flow_completed"
      ],
      required: true,
      index: true
    },
    nodeId: { type: String, default: "" },
    nodeType: { type: String, default: "" },
    optionLabel: { type: String, default: "" },
    targetNodeId: { type: String, default: "" }
  },
  { timestamps: true }
);

flowExecutionLogSchema.index({ flowId: 1, eventType: 1, createdAt: -1 });

export const FlowExecutionLog = mongoose.model("FlowExecutionLog", flowExecutionLogSchema);

