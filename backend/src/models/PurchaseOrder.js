import mongoose from "mongoose";

const poItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    items: [poItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "shipped", "delivered", "cancelled"],
      default: "draft",
      index: true
    },
    expectedDeliveryDate: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    history: [
      {
        status: String,
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: String
      }
    ],
    reconciliation: {
      status: { type: String, enum: ["pending", "matched", "mismatch"], default: "pending" },
      invoiceAmount: { type: Number, default: 0 },
      mismatchReason: { type: String, default: "" },
      reconciledAt: { type: Date, default: null },
      reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },
    notes: { type: String, trim: true, default: "" },
    terms: { type: String, trim: true, default: "" },
    stockReceived: { type: Boolean, default: false },
    invoiceUrl: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
