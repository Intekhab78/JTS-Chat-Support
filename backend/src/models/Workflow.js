import mongoose from "mongoose";

const workflowNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true }, // trigger, condition, action, delay, end
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  next: [{ type: String }]
}, { _id: false });

const workflowSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    trigger: { type: String, required: true, index: true }, // e.g. lead_created, deal_won, invoice_paid
    nodes: [workflowNodeSchema],
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

export const Workflow = mongoose.model("Workflow", workflowSchema);
