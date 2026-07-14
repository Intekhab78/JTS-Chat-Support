import mongoose from "mongoose";

const salesTargetSchema = new mongoose.Schema(
  {
    websiteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Website",
      required: true,
      index: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true // null means overall website/company-wide target
    },
    targetValue: {
      type: Number,
      required: true,
      default: 0
    },
    targetCount: {
      type: Number,
      required: true,
      default: 0
    },
    period: {
      type: String,
      enum: ["monthly", "quarterly", "yearly"],
      default: "monthly",
      index: true
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true
    },
    year: {
      type: Number,
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

// Prevent duplicate targets for same website, owner (or company wide), period, month and year
salesTargetSchema.index({ websiteId: 1, ownerId: 1, period: 1, month: 1, year: 1 }, { unique: true });

export const SalesTarget = mongoose.model("SalesTarget", salesTargetSchema);
