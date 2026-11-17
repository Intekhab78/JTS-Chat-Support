import mongoose from "mongoose";

const aiKnowledgeSourceSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["faq", "document", "product", "policy", "url"],
      default: "document",
      index: true
    },
    sourceUrl: { type: String, trim: true, default: "" },
    chunkCount: { type: Number, default: 0 },
    sizeBytes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["indexed", "syncing", "error"],
      default: "indexed"
    },
    lastSyncedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    embeddingPlaceholder: [{ type: Number }] // 1536 size float array placeholder
  },
  { timestamps: true }
);

export const AiKnowledgeSource = mongoose.model("AiKnowledgeSource", aiKnowledgeSourceSchema);
