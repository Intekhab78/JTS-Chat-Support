import { CrmDocument } from "../models/CrmDocument.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { logCrmActivity } from "../services/activityLoggerService.js";

export const listDocuments = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId, category, folderPath = "/", page = 1, limit = 50 } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json({ documents: [], pagination: { total: 0, page: 1, pages: 0 } });
  }

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access to this website's data", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (customerId) query.customerId = customerId;
  if (category) query.category = category;
  if (folderPath) query.folderPath = folderPath;

  const documents = await CrmDocument.find(query)
    .populate("uploadedBy", "name email role")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await CrmDocument.countDocuments(query);

  res.json({
    documents,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

export const createDocument = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId, name, category, fileUrl, fileSize, fileType, folderPath } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const document = await CrmDocument.create({
    ...req.body,
    websiteId: resolvedWebsiteId,
    uploadedBy: req.user._id
  });

  // Log to Activity Timeline
  await logCrmActivity({
    websiteId: resolvedWebsiteId,
    type: "document_shared",
    title: `Document Uploaded: ${name}`,
    description: `Category: ${category}.`,
    customerId,
    ownerId: req.user._id
  });

  res.status(201).json(document);
});

export const deleteDocument = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const document = await CrmDocument.findById(req.params.id);

  if (!document) throw new AppError("Document not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(document.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  await CrmDocument.findByIdAndDelete(req.params.id);
  res.json({ message: "Document deleted successfully" });
});
