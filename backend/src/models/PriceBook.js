import mongoose from "mongoose";

const pricingRuleSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  customPrice: { type: Number, required: true },
  minQuantity: { type: Number, default: 1 }
}, { _id: false });

const priceBookSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["default", "retail", "wholesale", "corporate", "dealer", "seasonal", "regional"],
      default: "retail",
      index: true
    },
    currency: { type: String, default: "INR" },
    activeFrom: { type: Date, default: null },
    activeTo: { type: Date, default: null },
    pricingRules: [pricingRuleSchema],
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

export const PriceBook = mongoose.model("PriceBook", priceBookSchema);
