import mongoose from "mongoose";

const flowNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ["trigger", "question", "options", "ticket_action", "transfer_agent", "message"], required: true },
  title: { type: String, required: true },
  content: { type: String, default: "" },
  options: [{
    label: { type: String, required: true },
    targetNodeId: { type: String, default: "" }
  }],
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
    isActive: { type: Boolean, default: true },
    nodes: [flowNodeSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const ChatFlow = mongoose.model("ChatFlow", chatFlowSchema);
