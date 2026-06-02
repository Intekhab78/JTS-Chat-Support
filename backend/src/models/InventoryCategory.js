import mongoose from "mongoose";

const inventoryCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
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

inventoryCategorySchema.index({ websiteId: 1, name: 1 }, { unique: true });

export const InventoryCategory = mongoose.model("InventoryCategory", inventoryCategorySchema);
