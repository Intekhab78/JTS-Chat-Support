import mongoose from "mongoose";

function buildSlug(title = "") {
  return String(title)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    content: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tags: [{ type: String, trim: true }],
    isPublished: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    archivedAt: { type: Date, default: null, index: true },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

articleSchema.index({ websiteId: 1, slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
articleSchema.index({ websiteId: 1, categoryId: 1, isPublished: 1, archivedAt: 1 });
articleSchema.index({ title: "text", content: "text", tags: "text" });

articleSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slug = buildSlug(this.title);
  }
  next();
});

export const Article = mongoose.model("Article", articleSchema);
