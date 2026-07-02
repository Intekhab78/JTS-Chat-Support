import mongoose from "mongoose";

const aiModelConfigSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, unique: true, index: true },
    provider: { type: String, enum: ["openai", "gemini", "anthropic", "azure", "openrouter", "ollama"], default: "gemini", index: true },
    modelName: { type: String, default: "gemini-1.5-flash" },
    temperature: { type: Number, default: 0.7, min: 0, max: 2 },
    maxTokens: { type: Number, default: 2048 }
  },
  { timestamps: true }
);

export const AiModelConfig = mongoose.model("AiModelConfig", aiModelConfigSchema);
