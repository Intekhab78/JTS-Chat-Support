import mongoose from "mongoose";

const biWidgetSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ["kpi", "chart", "table"], default: "kpi" },
  chartType: { type: String, enum: ["bar", "line", "pie", "funnel"], default: "bar" },
  metric: { type: String, default: "revenue" } // revenue, tickets, ai_cost, sla_breach
}, { _id: false });

const biDashboardSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    name: { type: String, required: true, trim: true },
    widgets: [biWidgetSchema]
  },
  { timestamps: true }
);

export const BiDashboard = mongoose.model("BiDashboard", biDashboardSchema);
