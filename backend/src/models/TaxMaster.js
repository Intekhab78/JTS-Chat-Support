import mongoose from "mongoose";

const taxMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    rate: {
      type: Number,
      required: true,
      default: 0
    },
    taxCode: {
      type: String,
      trim: true,
      default: ""
    },
    description: {
      type: String,
      default: ""
    },
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

taxMasterSchema.index({ websiteId: 1, name: 1 }, { unique: true });

export const TaxMaster = mongoose.model("TaxMaster", taxMasterSchema);
