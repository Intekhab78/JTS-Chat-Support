import { Deal } from "../models/Deal.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { logCrmActivity } from "../services/activityLoggerService.js";

export const listDeals = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { search, websiteId, pipelineId, stage, page = 1, limit = 20 } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json({ deals: [], pagination: { total: 0, page: 1, pages: 0 } });
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

  if (pipelineId) query.pipelineId = pipelineId;
  if (stage) query.stage = stage;

  if (search) {
    query.dealName = new RegExp(search, "i");
  }

  if (req.user.role === "sales") {
    query.ownerId = req.user._id;
  }

  const deals = await Deal.find(query)
    .populate("companyId", "companyName")
    .populate("primaryContactId", "firstName lastName displayName email")
    .populate("ownerId", "name email role")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Deal.countDocuments(query);

  res.json({
    deals,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

export const getDealDetails = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const deal = await Deal.findById(req.params.id)
    .populate("companyId", "companyName")
    .populate("primaryContactId", "firstName lastName displayName email")
    .populate("contacts", "firstName lastName displayName email")
    .populate("ownerId", "name email role");

  if (!deal) throw new AppError("Deal not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(deal.websiteId.toString())) {
    throw new AppError("Unauthorized access to this deal's data", 403);
  }

  res.json(deal);
});

export const createDeal = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, dealName } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const deal = await Deal.create({
    ...req.body,
    websiteId: resolvedWebsiteId,
    ownerId: req.body.ownerId || req.user._id
  });

  await logCrmActivity({
    websiteId: resolvedWebsiteId,
    type: "deal_created",
    title: "Deal Created",
    description: `New standalone sales deal "${deal.dealName}" created with value ${deal.dealValue}.`,
    dealId: deal._id,
    customerId: deal.customerId || null,
    ownerId: req.user._id
  });

  res.status(201).json(deal);
});

export const updateDeal = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const deal = await Deal.findById(req.params.id);

  if (!deal) throw new AppError("Deal not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(deal.websiteId.toString())) {
    throw new AppError("Unauthorized access to this deal's data", 403);
  }

  const previousState = deal.toObject();
  const updated = await Deal.findByIdAndUpdate(req.params.id, req.body, { new: true });

  if (previousState.stage !== updated.stage) {
    await logCrmActivity({
      websiteId: deal.websiteId,
      type: "stage_changed",
      title: "Deal Stage Progressed",
      description: `Deal "${updated.dealName}" stage changed from "${previousState.stage}" to "${updated.stage}".`,
      dealId: updated._id,
      ownerId: req.user._id
    });
  } else {
    await logCrmActivity({
      websiteId: deal.websiteId,
      type: "deal_updated",
      title: "Deal Updated",
      description: `Deal details updated for "${updated.dealName}".`,
      dealId: updated._id,
      ownerId: req.user._id
    });
  }

  res.json(updated);
});

export const deleteDeal = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const deal = await Deal.findById(req.params.id);

  if (!deal) throw new AppError("Deal not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(deal.websiteId.toString())) {
    throw new AppError("Unauthorized access to this deal's data", 403);
  }

  await Deal.findByIdAndDelete(req.params.id);
  res.json({ message: "Deal deleted successfully" });
});
