import mongoose from "mongoose";

const cannedResponseSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    shortcut: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    category: { type: String, default: "general", index: true },
    tags: [{ type: String }]
  },
  { timestamps: true }
);

cannedResponseSchema.index({ websiteId: 1, shortcut: 1 }, { unique: true });

export const CannedResponse = mongoose.model("CannedResponse", cannedResponseSchema);
