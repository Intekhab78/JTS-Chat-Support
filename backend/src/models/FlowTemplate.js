import mongoose from "mongoose";

const flowTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    industry: { type: String, trim: true, default: "General" }, // SaaS, Hospital, School, etc.
    
    // The nodes object contains the entire flow graph as a dictionary.
    nodes: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    
    isSystem: { type: Boolean, default: false } // If true, it's a global template provided by JTS
  },
  { timestamps: true }
);

export const FlowTemplate = mongoose.model("FlowTemplate", flowTemplateSchema);
