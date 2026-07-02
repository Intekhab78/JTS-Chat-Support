import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    path: { type: String, default: "", index: true } // e.g. "/Electronics/Laptop"
  },
  { timestamps: true }
);

categorySchema.index({ websiteId: 1, name: 1, parentId: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
