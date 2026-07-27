import mongoose from "mongoose";

const biWidgetSchema = new mongoose.Schema({
  widgetKey: { type: String, required: true },
  widgetName: { type: String, required: true },
  chartType: { type: String, enum: ["area", "bar", "pie", "funnel", "heatmap", "cohort", "kpi_card"], default: "kpi_card" },
  metricValue: { type: String, default: "" }
});

const scheduledBiReportSchema = new mongoose.Schema({
  reportName: { type: String, required: true },
  frequency: { type: String, enum: ["daily", "weekly", "monthly"], default: "weekly" },
  recipientEmails: [{ type: String }],
  lastSentAt: { type: Date, default: Date.now }
});

const enterpriseBiAnalyticsSchema = new mongoose.Schema(
  {
    dashboardName: { type: String, required: true, trim: true },
    dashboardType: {
      type: String,
      enum: ["executive", "kpi", "revenue", "compliance", "sales", "consultant", "branch"],
      default: "executive",
      index: true
    },
    widgets: [biWidgetSchema],
    scheduledReports: [scheduledBiReportSchema],
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const EnterpriseBiAnalytics = mongoose.model("EnterpriseBiAnalytics", enterpriseBiAnalyticsSchema);
