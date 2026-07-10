import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  sku: { type: String, default: "" },
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 1 },
  price: { type: Number, required: true }, // unit price
  discount: { type: Number, default: 0 }, // item level discount %
  taxRate: { type: Number, default: 18 },
  taxAmount: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  total: { type: Number, required: true }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, required: true, unique: true, index: true }, // unique invoice reference number
  invoiceNumber: { type: String, trim: true, index: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder", default: null, index: true },
  quotationId: { type: String, trim: true },
  priceBookId: { type: mongoose.Schema.Types.ObjectId, ref: "PriceBook", default: null },
  items: [invoiceItemSchema],
  subtotal: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 }, // order level flat discount
  tax: { type: Number, default: 0 },
  shippingCharges: { type: Number, default: 0 },
  adjustment: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 }, // tracks cumulative allocated payments
  currency: { type: String, default: "INR" },
  status: { 
    type: String, 
    enum: ["draft", "pending", "sent", "viewed", "partially_paid", "paid", "overdue", "cancelled", "void", "refunded"], 
    default: "pending", 
    index: true 
  },
  paymentIntentId: { type: String, trim: true },
  pdfUrl: { type: String, trim: true },
  notes: { type: String, trim: true },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  issuedAt: { type: Date, default: Date.now, index: true },
  dueDate: { type: Date, default: null, index: true },   // payment due date for overdue reminder
  reminderSent: { type: Boolean, default: false }         // tracks if overdue reminder email was dispatched
}, { timestamps: true });

export const Invoice = mongoose.model("Invoice", invoiceSchema);
