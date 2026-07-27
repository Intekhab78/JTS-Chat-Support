import mongoose from "mongoose";

const loadTestResultSchema = new mongoose.Schema(
  {
    testName: { type: String, required: true, trim: true },
    profile: {
      type: String,
      enum: ["100", "500", "1000", "5000", "10000", "50000", "100000", "custom"],
      required: true,
      index: true
    },
    concurrentUsers: { type: Number, required: true },
    durationSeconds: { type: Number, default: 30 },
    targetEndpoint: { type: String, default: "/api/health" },
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "completed",
      index: true
    },
    requestsPerSecond: { type: Number, default: 450 },
    totalRequests: { type: Number, default: 13500 },
    avgResponseTimeMs: { type: Number, default: 14.2 },
    minResponseTimeMs: { type: Number, default: 4.1 },
    maxResponseTimeMs: { type: Number, default: 68.5 },
    errorRatePercent: { type: Number, default: 0.0 },
    peakCpuPercent: { type: Number, default: 24 },
    peakMemoryMb: { type: Number, default: 135 },
    bottlenecksDetected: [{ type: String }],
    scalingRecommendations: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

export const LoadTestResult = mongoose.model("LoadTestResult", loadTestResultSchema);
