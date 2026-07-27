import mongoose from "mongoose";

const alertItemSchema = new mongoose.Schema({
  alertLevel: { type: String, enum: ["critical", "warning", "info"], default: "info" },
  sourceModule: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const activityItemSchema = new mongoose.Schema({
  action: { type: String, required: true },
  userEmail: { type: String, default: "admin@enterprise.ae" },
  timestamp: { type: Date, default: Date.now }
});

const missionControlTelemetrySchema = new mongoose.Schema(
  {
    systemHealth: {
      overall: { type: String, default: "99.98% HEALTHY" },
      cpuPercent: { type: Number, default: 14.2 },
      memoryPercent: { type: Number, default: 42.8 },
      dbConnections: { type: Number, default: 28 },
      uptimePercent: { type: Number, default: 99.98 }
    },
    businessHealth: {
      mrrRunRate: { type: String, default: "$204,500" },
      arrRunRate: { type: String, default: "$2,454,000" },
      activeClients: { type: Number, default: 1420 },
      complianceScore: { type: Number, default: 98.4 }
    },
    activeAlerts: [alertItemSchema],
    activityFeed: [activityItemSchema],
    aiExecutiveSummary: {
      summaryText: { type: String, default: "System operating at peak 99.98% efficiency. Tax compliance and financial run-rates are on track for Q3 target." },
      riskScore: { type: Number, default: 12 },
      recommendations: [{ type: String }]
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const MissionControlTelemetry = mongoose.model("MissionControlTelemetry", missionControlTelemetrySchema);
