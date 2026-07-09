import mongoose from "mongoose";

const dealProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, default: 0 },
  quantity: { type: Number, default: 1 }
}, { _id: false });

const dealSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    dealName: { type: String, required: true, trim: true },
    dealValue: { type: Number, default: 0 },
    currency: { type: String, default: "USD" },
    expectedCloseDate: { type: Date, default: null },
    probability: { type: Number, min: 0, max: 100, default: 10 },
    stage: { type: String, default: "qualified", index: true },
    pipelineId: { type: mongoose.Schema.Types.ObjectId, ref: "Pipeline", default: null, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null, index: true },
    primaryContactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null, index: true },
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Contact" }],
    products: [dealProductSchema],
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    forecastCategory: {
      type: String,
      enum: ["pipeline", "best_case", "commit", "closed", "omitted"],
      default: "pipeline"
    },
    lostReason: { type: String, trim: true, default: "" },
    winReason: { type: String, trim: true, default: "" },
    competitor: { type: String, trim: true, default: "" },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    description: { type: String, trim: true, default: "" },
    tags: [{ type: String, trim: true }],
    isDeleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

export const Deal = mongoose.model("Deal", dealSchema);
