import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    name: { type: String, required: true, trim: true },
    serialNumber: { type: String, required: true, trim: true, index: true },
    warrantyExpiry: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "expired", "inactive"],
      default: "active",
      index: true
    },
    value: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Asset = mongoose.model("Asset", assetSchema);
