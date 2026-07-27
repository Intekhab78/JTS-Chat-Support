import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorName: { type: String, trim: true },
    actorRole: { type: String, trim: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    websiteId: { type: mongoose.Schema.Types.ObjectId, ref: "Website", default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "" }
  },
  { timestamps: true }
);

auditLogSchema.pre("save", function (next) {
  if (!this.userId && this.actorId) this.userId = this.actorId;
  if (!this.actorId && this.userId) this.actorId = this.userId;
  next();
});

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
