import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

roleSchema.index({ name: 1, createdBy: 1 }, { unique: true });

roleSchema.statics.resolvePermissionsForUser = async function resolvePermissionsForUser(user) {
  if (!user?.role) return undefined;
  const rawRole = String(user.role).trim().toLowerCase();
  const roleName = rawRole === "account" ? "accounts" : rawRole === "user" ? "agent" : rawRole;
  const candidateOwners = [];

  if (roleName === "client" && user._id) {
    candidateOwners.push(user._id);
  }
  if (user.managerId) {
    candidateOwners.push(user.managerId);
    try {
      const managerDoc = await mongoose.model("User").findById(user.managerId).select("managerId").lean();
      if (managerDoc?.managerId) candidateOwners.push(managerDoc.managerId);
    } catch { /* ignore */ }
  }
  if (Array.isArray(user.websiteIds) && user.websiteIds.length > 0) {
    try {
      const sites = await mongoose.model("Website").find({ _id: { $in: user.websiteIds } }).select("userId ownerId clientId managerId").lean();
      for (const s of sites) {
        if (s.userId) candidateOwners.push(s.userId);
        if (s.ownerId) candidateOwners.push(s.ownerId);
        if (s.clientId) candidateOwners.push(s.clientId);
        if (s.managerId) candidateOwners.push(s.managerId);
      }
    } catch { /* ignore */ }
  }

  if (candidateOwners.length > 0) {
    const tenantRole = await this.findOne({
      name: roleName,
      createdBy: { $in: candidateOwners },
      isActive: true
    }).sort({ updatedAt: -1 }).lean();
    if (tenantRole) {
      return Array.isArray(tenantRole.permissions) ? tenantRole.permissions : [];
    }
  }

  // Fallback to the most recently updated active Role with this name (so Role Manager updates always take precedence over stale initial seed)
  const latestRole = await this.findOne({
    name: roleName,
    isActive: true
  }).sort({ updatedAt: -1 }).lean();

  if (latestRole) {
    return Array.isArray(latestRole.permissions) ? latestRole.permissions : [];
  }
  return undefined;
};

export const Role = mongoose.model("Role", roleSchema);
