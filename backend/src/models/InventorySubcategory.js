import mongoose from "mongoose";

const inventorySubcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryCategory",
      required: true,
      index: true
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

inventorySubcategorySchema.index({ websiteId: 1, categoryId: 1, name: 1 }, { unique: true });

export const InventorySubcategory = mongoose.model("InventorySubcategory", inventorySubcategorySchema);
