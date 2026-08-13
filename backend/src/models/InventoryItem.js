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
    brand: {
      type: String,
      trim: true,
      default: ""
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
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
    unit: {
      type: String,
      trim: true,
      default: "pcs"
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      index: true
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
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
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
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null
    },

    // Batch, Serial, Warranty & Expiry tracking
    batchNumber: {
      type: String,
      trim: true,
      default: ""
    },
    serialNumber: {
      type: String,
      trim: true,
      default: ""
    },
    warrantyEndDate: {
      type: Date,
      default: null
    },
    expiryDate: {
      type: Date,
      default: null
    },
    lowStockAlertSent: {
      type: Boolean,
      default: false
    },
    vatRate: {
      type: Number,
      default: 5
    },
    vatSlab: {
      type: String,
      enum: ["standard_5", "zero_rated_0", "exempt_0"],
      default: "standard_5"
    },

    // Snake_case foreign keys as requested
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryCategory",
      index: true
    },
    subcategory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventorySubcategory",
      index: true
    },
    brand_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      index: true
    },
    size_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Size",
      index: true
    },
    color_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Color",
      index: true
    },
    unit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
      index: true
    },
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      index: true
    }
  },
  { timestamps: true }
);

inventoryItemSchema.index({ websiteId: 1, sku: 1 }, { unique: true });
inventoryItemSchema.index({ websiteId: 1, name: 1 });

inventoryItemSchema.pre("save", function(next) {
  if (this.category_id && !this.categoryId) this.categoryId = this.category_id;
  if (this.categoryId && !this.category_id) this.category_id = this.categoryId;
  
  if (this.subcategory_id && !this.subcategoryId) this.subcategoryId = this.subcategory_id;
  if (this.subcategoryId && !this.subcategory_id) this.subcategory_id = this.subcategoryId;
  
  if (this.brand_id && !this.brandId) this.brandId = this.brand_id;
  if (this.brandId && !this.brand_id) this.brand_id = this.brandId;
  
  if (this.size_id && !this.sizeId) this.sizeId = this.size_id;
  if (this.sizeId && !this.size_id) this.size_id = this.sizeId;
  
  if (this.color_id && !this.colorId) this.colorId = this.color_id;
  if (this.colorId && !this.color_id) this.color_id = this.colorId;
  
  if (this.unit_id && !this.unitId) this.unitId = this.unit_id;
  if (this.unitId && !this.unit_id) this.unit_id = this.unitId;

  if (this.supplier_id && !this.supplierId) this.supplierId = this.supplier_id;
  if (this.supplierId && !this.supplier_id) this.supplier_id = this.supplierId;
  if (this.supplier_id && !this.preferredSupplierId) this.preferredSupplierId = this.supplier_id;
  if (this.preferredSupplierId && !this.supplier_id) this.supplier_id = this.preferredSupplierId;

  next();
});

export const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);
