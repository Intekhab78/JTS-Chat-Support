import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    industry: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    gstVat: { type: String, trim: true, default: "" },
    companyEmail: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    billingAddress: { type: String, trim: true, default: "" },
    shippingAddress: { type: String, trim: true, default: "" },
    employees: { type: Number, default: 0 },
    annualRevenue: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    parentCompany: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    description: { type: String, trim: true, default: "" },
    tags: [{ type: String, trim: true }],
    status: { type: String, default: "active" }
  },
  { timestamps: true }
);

export const Company = mongoose.model("Company", companySchema);
