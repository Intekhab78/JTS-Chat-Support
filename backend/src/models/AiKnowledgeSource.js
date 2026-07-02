import mongoose from "mongoose";

const aiKnowledgeSourceSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["faq", "document", "product", "policy"],
      default: "document",
      index: true
    },
    embeddingPlaceholder: [{ type: Number }] // 1536 size float array placeholder
  },
  { timestamps: true }
);

export const AiKnowledgeSource = mongoose.model("AiKnowledgeSource", aiKnowledgeSourceSchema);
