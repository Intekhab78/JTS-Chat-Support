import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    path: { type: String, default: "", index: true }, // e.g. "/Electronics/Laptop"
    department: { type: String, default: "general", trim: true, lowercase: true, index: true },
    subcategories: [{ type: String, trim: true }],
    createDashboard: { type: Boolean, default: false },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }
  },
  { timestamps: true }
);

categorySchema.index({ websiteId: 1, name: 1, parentId: 1 }, { unique: true });

export const Category = mongoose.model("Category", categorySchema);
