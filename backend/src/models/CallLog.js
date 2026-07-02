import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    direction: { type: String, enum: ["incoming", "outgoing"], default: "outgoing", index: true },
    status: { type: String, enum: ["completed", "missed", "no_answer", "busy"], default: "completed", index: true },
    duration: { type: Number, default: 0 }, // in seconds
    recordingUrl: { type: String, trim: true, default: "" },
    transcript: { type: String, trim: true, default: "" },
    outcome: { type: String, trim: true, default: "" },
    followUpTaskId: { type: mongoose.Schema.Types.ObjectId, ref: "FollowUpTask", default: null }
  },
  { timestamps: true }
);

export const CallLog = mongoose.model("CallLog", callLogSchema);
