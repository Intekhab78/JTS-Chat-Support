import mongoose from "mongoose";

const biAlertSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    metric: { type: String, enum: ["revenue", "tickets", "ai_cost", "sla_breach"], required: true },
    operator: { type: String, enum: ["gt", "lt"], default: "gt" },
    value: { type: Number, required: true },
    emails: [{ type: String }],
    triggered: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const BiAlert = mongoose.model("BiAlert", biAlertSchema);
