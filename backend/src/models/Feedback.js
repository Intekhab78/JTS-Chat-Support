import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    type: {
      type: String,
      enum: ["nps", "csat", "ces"],
      default: "csat",
      index: true
    },
    score: { type: Number, required: true }, // e.g. 0-10 for NPS, 1-5 for CSAT
    comment: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Feedback = mongoose.model("Feedback", feedbackSchema);
