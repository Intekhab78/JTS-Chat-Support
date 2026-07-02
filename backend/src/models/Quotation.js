import mongoose from "mongoose";

const quotationItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, default: 1 },
  price: { type: Number, required: true }, // unit price
  discount: { type: Number, default: 0 }, // item level discount
  taxRate: { type: Number, default: 18 },
  taxAmount: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  total: { type: Number, required: true }
}, { _id: false });

const quotationTrackingSchema = new mongoose.Schema({
  event: { type: String, enum: ["sent", "viewed", "accepted", "rejected", "pending_approval", "approved", "denied"], required: true },
  occuredAt: { type: Date, default: Date.now },
  ip: String,
  device: String
}, { _id: false });

const quotationSchema = new mongoose.Schema(
  {
    quotationId: { type: String, required: true, unique: true, index: true }, // unique document reference (e.g. QT-1001-V1)
    quotationNumber: { type: String, required: true, index: true }, // group revision root reference (e.g. QT-1001)
    version: { type: Number, default: 1, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    priceBookId: { type: mongoose.Schema.Types.ObjectId, ref: "PriceBook", default: null, index: true },
    items: [quotationItemSchema],
    subtotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 }, // order level discount
    shippingCharges: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { 
      type: String, 
      enum: ["draft", "sent", "viewed", "accepted", "rejected", "expired", "pending_approval", "denied", "converted"], 
      default: "draft",
      index: true 
    },
    approvalStatus: {
      type: String,
      enum: ["none", "pending_manager", "pending_regional_manager", "pending_director", "approved", "rejected"],
      default: "none",
      index: true
    },
    approvalHistory: [{
      approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      action: { type: String, enum: ["approved", "rejected"] },
      comments: { type: String, default: "" },
      createdAt: { type: Date, default: Date.now }
    }],
    notes: { type: String, trim: true },
    terms: { type: String, trim: true },
    validUntil: { type: Date, required: true },
    pdfUrl: { type: String, trim: true },
    tracking: [quotationTrackingSchema]
  },
  { timestamps: true }
);

export const Quotation = mongoose.model("Quotation", quotationSchema);
