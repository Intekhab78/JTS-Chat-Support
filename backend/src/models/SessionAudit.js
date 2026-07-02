import mongoose from "mongoose";

const sessionAuditSchema = new mongoose.Schema(
  {
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ipAddress: { type: String, default: "127.0.0.1" },
    device: { type: String, default: "Desktop" },
    browser: { type: String, default: "Chrome" },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const SessionAudit = mongoose.model("SessionAudit", sessionAuditSchema);
