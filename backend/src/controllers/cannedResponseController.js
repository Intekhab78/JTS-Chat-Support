import { CannedResponse } from "../models/CannedResponse.js";
import { broadcastDataChange } from "../services/dataSyncService.js";

function getTenantId(user) {
  if (user.role === "admin" || user.role === "client") return user._id;
  return user.managerId || user._id;
}

function canManageSharedShortcuts(user) {
  return ["admin", "client", "manager"].includes(user.role);
}

function canManagePersonalShortcuts(user) {
  return user.role === "agent";
}

export async function listCannedResponses(req, res) {
  const tenantId = getTenantId(req.user);
  const filters = [
    {
      $or: [
        { managerId: tenantId, visibility: "shared" },
        { managerId: tenantId, visibility: { $exists: false } }
      ]
    }
  ];

  if (canManagePersonalShortcuts(req.user)) {
    filters.push({ managerId: req.user._id, visibility: "personal" });
  }

  const responses = await CannedResponse.find({ $or: filters }).sort({ visibility: 1, shortcut: 1 });

  return res.json(
    responses.map((response) => {
      const visibility = response.visibility || "shared";
      const isOwnedByCurrentUser = String(response.managerId) === String(req.user._id);
      return {
        ...response.toObject(),
        visibility,
        scopeLabel: visibility === "personal" ? "Private" : "Shared",
        isOwnedByCurrentUser
      };
    })
  );
}

export async function createCannedResponse(req, res) {
  const { shortcut, content } = req.body;
  if (!shortcut || !content) {
    return res.status(400).json({ message: "Shortcut and content required" });
  }

  const normalizedShortcut = shortcut.toLowerCase().replace("/", "").trim();
  const tenantId = getTenantId(req.user);

  let managerId = tenantId;
  let visibility = "shared";

  if (canManagePersonalShortcuts(req.user)) {
    managerId = req.user._id;
    visibility = "personal";
  } else if (!canManageSharedShortcuts(req.user)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const existing = await CannedResponse.findOne({ managerId, shortcut: normalizedShortcut });
  if (existing) {
    return res.status(409).json({ message: `Shortcut '/${normalizedShortcut}' already exists.` });
  }

  try {
    const response = await CannedResponse.create({
      shortcut: normalizedShortcut,
      content,
      managerId,
      tenantId,
      visibility
    });

    broadcastDataChange({ entity: "shortcut", action: "created", data: { id: response._id } });

    return res.status(201).json({
      ...response.toObject(),
      visibility: response.visibility || visibility,
      scopeLabel: visibility === "personal" ? "Private" : "Shared",
      isOwnedByCurrentUser: true
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: `Shortcut '/${normalizedShortcut}' already exists.` });
    }
    throw err;
  }
}

export async function deleteCannedResponse(req, res) {
  const tenantId = getTenantId(req.user);

  const filters = [];

  if (canManageSharedShortcuts(req.user)) {
    filters.push({
      managerId: tenantId,
      $or: [{ visibility: "shared" }, { visibility: { $exists: false } }]
    });
  }

  if (canManagePersonalShortcuts(req.user)) {
    filters.push({ managerId: req.user._id, visibility: "personal" });
  }

  if (filters.length === 0) {
    return res.status(403).json({ message: "Access denied" });
  }

  const response = await CannedResponse.findOneAndDelete({
    _id: req.params.id,
    $or: filters
  });

  if (!response) {
    return res.status(404).json({ message: "Canned response not found" });
  }

  broadcastDataChange({ entity: "shortcut", action: "deleted", data: { id: req.params.id } });
  return res.json({ message: "Canned response deleted" });
}
