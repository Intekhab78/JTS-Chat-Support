import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true, default: "" },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true, default: "" },
    taxId: { type: String, trim: true, default: "" }, // GST/VAT
    address: { type: String, trim: true, default: "" },
    paymentTerms: { type: String, trim: true, default: "Net 30" },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active"
    },
    websiteIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Website" }],
    notes: { type: String, trim: true, default: "" },
    performanceMetrics: {
      avgLeadTimeHours: { type: Number, default: 0 },
      fulfillmentRate: { type: Number, default: 0 },
      onTimeDeliveryRate: { type: Number, default: 0 },
      totalOrdersCompleted: { type: Number, default: 0 }
    },
    rating: { type: Number, default: 100, min: 0, max: 100 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Supplier = mongoose.model("Supplier", supplierSchema);
