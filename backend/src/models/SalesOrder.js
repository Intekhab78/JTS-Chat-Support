import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 }, // item level discount value
  taxRate: { type: Number, default: 18 },
  taxAmount: { type: Number, default: 0 },
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true }
}, { _id: false });

const salesOrderSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation", default: null, index: true },
    status: {
      type: String,
      enum: ["draft", "confirmed", "processing", "packed", "shipped", "delivered", "completed", "cancelled"],
      default: "draft",
      index: true
    },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 }, // order level discount
    taxAmount: { type: Number, default: 0 },
    shippingCharges: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    shippingAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zip: { type: String, default: "" },
      country: { type: String, default: "India" }
    },
    billingAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zip: { type: String, default: "" },
      country: { type: String, default: "India" }
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partially_paid", "paid", "refunded"],
      default: "pending",
      index: true
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    notes: { type: String, default: "" },
    isStockDeducted: { type: Boolean, default: false },
    approvalHistory: [{
      approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      action: { type: String, enum: ["pending", "approved", "rejected"] },
      comments: { type: String, default: "" },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

export const SalesOrder = mongoose.model("SalesOrder", salesOrderSchema);
