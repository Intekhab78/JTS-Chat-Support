import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    paymentNumber: { type: String, required: true, unique: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now, index: true },
    referenceNumber: { type: String, default: "" },
    transactionId: { type: String, default: "" },
    gateway: { type: String, default: "cash" }, // stripe, razorpay, cash, bank_transfer
    paymentMethod: { type: String, default: "cash" }, // card, upi, netbanking, cheque
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "completed",
      index: true
    },
    notes: { type: String, default: "" },
    attachments: [{
      filename: { type: String, trim: true },
      url: { type: String, trim: true }
    }]
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
