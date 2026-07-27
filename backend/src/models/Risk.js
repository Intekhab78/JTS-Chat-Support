import mongoose from "mongoose";

const riskCommentSchema = new mongoose.Schema({
  content: { type: String, required: true, trim: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  authorName: { type: String, default: "System User" },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const riskAttachmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true });

const riskSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: [
        "Business Risk",
        "Technical Risk",
        "Security Risk",
        "Compliance Risk",
        "Operational Risk",
        "Financial Risk",
        "Infrastructure Risk"
      ],
      required: true,
      index: true
    },
    probability: { type: Number, min: 1, max: 5, default: 3 },
    impact: { type: Number, min: 1, max: 5, default: 3 },
    riskScore: { type: Number, default: 9, index: true },
    mitigationPlan: { type: String, default: "" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    status: {
      type: String,
      enum: ["open", "in_mitigation", "accepted", "closed"],
      default: "open",
      index: true
    },
    reviewDate: { type: Date, default: null },
    resolutionDate: { type: Date, default: null },
    attachments: [riskAttachmentSchema],
    comments: [riskCommentSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

riskSchema.pre("save", function (next) {
  this.riskScore = (this.probability || 3) * (this.impact || 3);
  if (this.status === "closed" && !this.resolutionDate) {
    this.resolutionDate = new Date();
  }
  next();
});

export const Risk = mongoose.model("Risk", riskSchema);
