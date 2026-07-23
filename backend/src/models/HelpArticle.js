import mongoose from "mongoose";

const helpArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    category: { type: String, required: true, index: true },
    summary: { type: String, required: true },
    content: { type: String, required: true },
    nodeType: { type: String, index: true }, // e.g. "message", "form", "action", "condition"
    tags: [{ type: String }],
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const HelpArticle = mongoose.model("HelpArticle", helpArticleSchema);
