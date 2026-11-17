import { AuditLog } from "../models/AuditLog.js";
import { getOwnedWebsiteIds, normalizeRole } from "../utils/roleUtils.js";
import { escapeRegex } from "../utils/regexUtils.js";

export async function listAuditLogs(req, res) {
  try {
    const filter = {};
    const { websiteId, entityType, action, entityId, search } = req.query;
    const role = normalizeRole(req.user.role);

    if (role !== "admin") {
      const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
      if (websiteId) {
        const isOwned = ownedWebsiteIds.some((id) => id.toString() === String(websiteId));
        if (!isOwned) {
          return res.json([]);
        }
        filter.$or = [
          { websiteId },
          { websiteId: null, actorId: req.user._id },
          { websiteId: null, userId: req.user._id }
        ];
      } else {
        filter.$or = [
          { websiteId: { $in: ownedWebsiteIds } },
          { actorId: req.user._id },
          { userId: req.user._id }
        ];
      }
    } else if (websiteId) {
      filter.$or = [
        { websiteId },
        { websiteId: null }
      ];
    }

    if (entityType && entityType !== "all") filter.entityType = entityType;
    if (action) filter.action = action;
    if (entityId) filter.entityId = entityId;
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegex(String(search).trim()), "i");
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ action: rx }, { actorName: rx }, { entityType: rx }]
      });
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);

    const isInternal = ["admin", "client", "manager"].includes(role);
    const sanitizedLogs = isInternal ? logs : logs.map(log => {
      const plainLog = log.toObject();
      if (plainLog.metadata) {
        if (plainLog.metadata.email) plainLog.metadata.email = maskEmail(plainLog.metadata.email);
        if (plainLog.ipAddress) plainLog.ipAddress = maskIp(plainLog.ipAddress);
      }
      return plainLog;
    });

    res.json(sanitizedLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

function maskEmail(email) {
  if (!email || typeof email !== "string") return email;
  const [name, domain] = email.split("@");
  if (!domain) return "****";
  return `${name[0]}***@${domain}`;
}

function maskIp(ip) {
  if (!ip || typeof ip !== "string") return ip;
  return ip.replace(/\d+\.\d+$/, "***.***");
}
