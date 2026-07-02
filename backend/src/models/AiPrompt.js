import mongoose from "mongoose";

const aiPromptSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "general", index: true },
    promptText: { type: String, required: true },
    variables: [{ type: String }],
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

aiPromptSchema.index({ websiteId: 1, name: 1, version: 1 }, { unique: true });

export const AiPrompt = mongoose.model("AiPrompt", aiPromptSchema);
