import mongoose from "mongoose";

const orgPoliciesSchema = new mongoose.Schema({
  allowCrossReporting: { type: Boolean, default: true },
  enforceMfa: { type: Boolean, default: true },
  ipWhitelist: [{ type: String }]
});

const multiOrganizationSchema = new mongoose.Schema(
  {
    orgName: { type: String, required: true, trim: true },
    orgCode: { type: String, required: true, trim: true, unique: true, index: true },
    orgType: {
      type: String,
      enum: ["holding_company", "subsidiary", "branch", "business_unit", "department"],
      default: "holding_company",
      index: true
    },
    parentOrgId: { type: mongoose.Schema.Types.ObjectId, ref: "MultiOrganization", default: null, index: true },
    country: { type: String, default: "United Arab Emirates" },
    currency: { type: String, default: "AED" },
    trnNumber: { type: String, default: "" },
    centralBillingEnabled: { type: Boolean, default: true },
    sharedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    orgPolicies: { type: orgPoliciesSchema, default: () => ({ allowCrossReporting: true, enforceMfa: true, ipWhitelist: ["0.0.0.0/0"] }) },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const MultiOrganization = mongoose.model("MultiOrganization", multiOrganizationSchema);
