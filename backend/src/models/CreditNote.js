import mongoose from "mongoose";

const creditNoteSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    creditNoteNumber: { type: String, required: true, unique: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["applied", "refunded", "cancelled"],
      default: "applied",
      index: true
    },
    reason: { type: String, default: "" },
    refundId: { type: String, default: "" }
  },
  { timestamps: true }
);

export const CreditNote = mongoose.model("CreditNote", creditNoteSchema);
