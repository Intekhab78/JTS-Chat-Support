import mongoose from "mongoose";

const debitNoteSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    debitNoteNumber: { type: String, required: true, unique: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
      index: true
    },
    reason: { type: String, default: "" }
  },
  { timestamps: true }
);

export const DebitNote = mongoose.model("DebitNote", debitNoteSchema);
