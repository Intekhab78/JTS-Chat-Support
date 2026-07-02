import mongoose from "mongoose";

const stageSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  probability: { type: Number, min: 0, max: 100, default: 50 },
  color: { type: String, default: "" },
  order: { type: Number, default: 0 }
}, { _id: false });

const pipelinePermissionSchema = new mongoose.Schema({
  role: { type: String, required: true },
  access: { type: String, enum: ["read", "write", "admin"], default: "write" }
}, { _id: false });

const pipelineSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    stages: [stageSchema],
    permissions: [pipelinePermissionSchema],
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Pipeline = mongoose.model("Pipeline", pipelineSchema);
