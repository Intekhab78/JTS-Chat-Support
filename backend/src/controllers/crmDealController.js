import mongoose from "mongoose";
import * as dealService from "../services/dealService.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

export const listDeals = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { search, websiteId, pipelineId, stage, customerId, page = 1, limit = 20 } = req.query;

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

  if (customerId) {
    const orConditions = [
      { primaryContactId: customerId },
      { companyId: customerId }
    ];
    try {
      const CustomerModel = mongoose.model("Customer");
      const customer = await CustomerModel.findById(customerId);
      if (customer && customer.email) {
        const ContactModel = mongoose.model("Contact");
        const contacts = await ContactModel.find({ 
          email: customer.email.toLowerCase().trim(),
          isDeleted: { $ne: true }
        }).select("_id");
        const contactIds = contacts.map(c => c._id);
        if (contactIds.length > 0) {
          orConditions.push({ primaryContactId: { $in: contactIds } });
          orConditions.push({ contacts: { $in: contactIds } });
        }
      }
    } catch (err) {
      console.error("Failed to enrich deal query by customerId:", err);
    }
    query.$or = orConditions;
  }

  if (req.user.role === "sales") {
    query.ownerId = req.user._id;
  }

  const result = await dealService.getDealsList(query, {
    page: parseInt(page),
    limit: parseInt(limit)
  });

  res.json(result);
});

export const getDealDetails = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const deal = await dealService.getDeal(req.params.id);

  if (!ownedWebsiteIds.map(id => id.toString()).includes(deal.websiteId.toString())) {
    throw new AppError("Unauthorized access to this deal's data", 403);
  }

  res.json(deal);
});

export const createDeal = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const deal = await dealService.createDeal(
    { ...req.body, websiteId: resolvedWebsiteId },
    req.user._id
  );

  res.status(201).json(deal);
});

export const updateDeal = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const deal = await dealService.getDeal(req.params.id);

  if (!ownedWebsiteIds.map(id => id.toString()).includes(deal.websiteId.toString())) {
    throw new AppError("Unauthorized access to this deal's data", 403);
  }

  const updated = await dealService.updateDeal(req.params.id, req.body, req.user._id);
  res.json(updated);
});

export const deleteDeal = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const deal = await dealService.getDeal(req.params.id);

  if (!ownedWebsiteIds.map(id => id.toString()).includes(deal.websiteId.toString())) {
    throw new AppError("Unauthorized access to this deal's data", 403);
  }

  const response = await dealService.deleteDeal(req.params.id, req.user._id);
  res.json(response);
});
