import mongoose from "mongoose";

const executionLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  nodeId: { type: String },
  message: { type: String },
  status: { type: String, enum: ["info", "success", "failed"], default: "info" }
}, { _id: false });

const workflowExecutionSchema = new mongoose.Schema(
  {
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: "Workflow", required: true, index: true },
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    status: {
      type: String,
      enum: ["running", "success", "failed"],
      default: "running",
      index: true
    },
    currentElement: { type: String },
    variables: { type: mongoose.Schema.Types.Mixed, default: {} },
    logs: [executionLogSchema]
  },
  { timestamps: true }
);

export const WorkflowExecution = mongoose.model("WorkflowExecution", workflowExecutionSchema);
