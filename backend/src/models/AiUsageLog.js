import mongoose from "mongoose";

const aiUsageLogSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    promptName: { type: String, default: "chat_completion" },
    tokensPrompt: { type: Number, default: 0 },
    tokensCompletion: { type: Number, default: 0 },
    cost: { type: Number, default: 0 }, // cost in USD
    latencyMs: { type: Number, default: 0 },
    provider: { type: String, default: "gemini", index: true },
    error: { type: String, default: "" }
  },
  { timestamps: true }
);

export const AiUsageLog = mongoose.model("AiUsageLog", aiUsageLogSchema);
