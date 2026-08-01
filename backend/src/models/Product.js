import mongoose from "mongoose";

const productVariantOptionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Tier", "Duration"
  options: [{ type: String }] // e.g. ["Standard", "Premium"]
}, { _id: false });

const productVariantItemSchema = new mongoose.Schema({
  sku: { type: String, trim: true, required: true },
  variantName: { type: String, trim: true, required: true },
  attributes: [{
    name: { type: String, trim: true },
    value: { type: String, trim: true }
  }],
  price: { type: Number, required: true, default: 0 },
  costPrice: { type: Number, default: 0 },
  stockQuantity: { type: Number, default: 0 },
  barcode: { type: String, default: "" },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const productSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    sku: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { 
      type: String, 
      enum: ["product", "service", "bundle", "digital", "subscription"], 
      default: "product" 
    },
    category: { type: String, default: "" }, // Hierarchical category path or name
    brand: { type: String, default: "" },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    unit: { type: String, default: "pcs" }, // pcs, kg, hrs, etc.
    price: { type: Number, required: true, default: 0 },
    cost: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 }, // percentage tax (e.g., GST 18%)
    hsnSacCode: { type: String, default: "" },
    barcode: { type: String, default: "" },
    images: [{ type: String }],
    status: { type: String, enum: ["active", "draft", "archived"], default: "active", index: true },
    tags: [{ type: String }],
    hasVariants: { type: Boolean, default: false },
    variants: [productVariantOptionSchema],
    variantItems: [productVariantItemSchema],
    customFields: { type: Map, of: String, default: {} },
    inventoryPlaceholder: { type: Number, default: 0 } // Future ERP Integration placeholder
  },
  { timestamps: true }
);

// SKU must be unique per website tenant
productSchema.index({ websiteId: 1, sku: 1 }, { unique: true });

export const Product = mongoose.model("Product", productSchema);
