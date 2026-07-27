import mongoose from "mongoose";

const saasFinancialSchema = new mongoose.Schema(
  {
    month: { type: String, required: true, unique: true, index: true }, // YYYY-MM
    serverCost: { type: Number, default: 250 },
    mongoCost: { type: Number, default: 150 },
    storageCost: { type: Number, default: 45 },
    bandwidthCost: { type: Number, default: 30 },
    emailCost: { type: Number, default: 25 },
    whatsappCost: { type: Number, default: 40 },
    smsCost: { type: Number, default: 15 },
    apiCost: { type: Number, default: 50 },
    backupCost: { type: Number, default: 20 },
    monitoringCost: { type: Number, default: 15 },
    cacBudget: { type: Number, default: 500 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const SaasFinancial = mongoose.model("SaasFinancial", saasFinancialSchema);
