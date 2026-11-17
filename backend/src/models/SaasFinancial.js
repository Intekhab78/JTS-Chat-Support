import mongoose from "mongoose";

const saasFinancialSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true, index: true }, // YYYY-MM
    serverCost: { type: Number, default: 0 },
    mongoCost: { type: Number, default: 0 },
    storageCost: { type: Number, default: 0 },
    bandwidthCost: { type: Number, default: 0 },
    emailCost: { type: Number, default: 0 },
    whatsappCost: { type: Number, default: 0 },
    smsCost: { type: Number, default: 0 },
    apiCost: { type: Number, default: 0 },
    backupCost: { type: Number, default: 0 },
    monitoringCost: { type: Number, default: 0 },
    cacBudget: { type: Number, default: 0 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const SaasFinancial = mongoose.model("SaasFinancial", saasFinancialSchema);
