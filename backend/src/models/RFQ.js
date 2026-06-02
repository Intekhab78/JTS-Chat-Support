import mongoose from "mongoose";

const rfqItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem", required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  targetPrice: { type: Number, default: null }
}, { _id: false });

const rfqBidSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  quotedPrice: { type: Number, required: true },
  expectedDeliveryDate: { type: Date, required: true },
  notes: { type: String, trim: true },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
});

const rfqSchema = new mongoose.Schema({
  rfqNumber: { type: String, required: true, unique: true },
  websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true },
  title: { type: String, required: true, trim: true },
  items: [rfqItemSchema],
  invitedSuppliers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Supplier" }],
  bids: [rfqBidSchema],
  status: { type: String, enum: ["open", "closed", "awarded", "cancelled"], default: "open" },
  expiryDate: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  notes: { type: String, trim: true }
}, { timestamps: true });

export const RFQ = mongoose.model("RFQ", rfqSchema);
