import mongoose from "mongoose";

const tenantConfigSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, unique: true, index: true },
    orgName: { type: String, default: "Enterprise Org" },
    brandingLogo: { type: String, default: "" },
    fiscalYearStart: { type: String, default: "January" },
    timezone: { type: String, default: "UTC" },
    businessHours: [
      {
        day: { type: String },
        open: { type: String, default: "09:00" },
        close: { type: String, default: "18:00" }
      }
    ]
  },
  { timestamps: true }
);

export const TenantConfig = mongoose.model("TenantConfig", tenantConfigSchema);
