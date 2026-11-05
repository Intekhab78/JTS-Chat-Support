import { AuditLog } from "../models/AuditLog.js";

export async function logAuditEvent({
  actor = null,
  userId = null,
  action,
  entityType,
  resource,
  entityId,
  resourceId,
  websiteId = null,
  metadata = {},
  changes = null,
  details = null,
  userAgent = "",
  ipAddress = "",
  before = null,
  after = null
}) {
  const resolvedEntityType = entityType || resource || "system";
  const resolvedEntityId = entityId || resourceId || resolvedEntityType;
  if (!action) return null;

  const resolvedMetadata = { ...(metadata || {}) };
  if (changes && resolvedMetadata.changes === undefined) resolvedMetadata.changes = changes;
  if (details && resolvedMetadata.details === undefined) resolvedMetadata.details = details;
  if (userAgent && resolvedMetadata.userAgent === undefined) resolvedMetadata.userAgent = userAgent;

  // Calculate diff if before and after are provided
  if (before && after) {
    const diff = {};
    const beforeObj = before.toObject ? before.toObject() : before;
    const afterObj = after.toObject ? after.toObject() : after;

    Object.keys(afterObj).forEach(key => {
      // Skip internal fields and unchanged fields
      if (key.startsWith('_') || key === 'updatedAt' || key === 'createdAt' || key === '__v') return;
      
      const bStr = JSON.stringify(beforeObj[key]);
      const aStr = JSON.stringify(afterObj[key]);
      
      if (bStr !== aStr) {
        diff[key] = {
          before: beforeObj[key],
          after: afterObj[key]
        };
      }
    });

    if (Object.keys(diff).length > 0) {
      resolvedMetadata.diff = diff;
    }
  }

  try {
    return await AuditLog.create({
      actorId: actor?._id || userId || null,
      actorName: actor?.name || (userId ? "Authenticated User" : "System"),
      actorRole: actor?.role || (userId ? "staff" : "system"),
      action,
      entityType: String(resolvedEntityType),
      entityId: String(resolvedEntityId),
      websiteId,
      metadata: resolvedMetadata,
      ipAddress
    });
  } catch (error) {
    console.error("Audit log error:", error.message);
    return null;
  }
}
