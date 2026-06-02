import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: ""
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryCategory",
      index: true
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventorySubcategory",
      index: true
    },
    sizeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Size",
      index: true
    },
    colorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Color",
      index: true
    },
    brand: {
      type: String,
      trim: true,
      default: ""
    },
    unit: {
      type: String,
      trim: true,
      default: "pcs"
    },
    unitCost: {
      type: Number,
      default: 0
    },
    quantity: {
      type: Number,
      default: 0
    },
    reorderLevel: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ""
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    preferredSupplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null
    }
  },
  { timestamps: true }
);

inventoryItemSchema.index({ websiteId: 1, sku: 1 }, { unique: true });
inventoryItemSchema.index({ websiteId: 1, name: 1 });

export const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);
