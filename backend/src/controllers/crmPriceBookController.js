import { PriceBook } from "../models/PriceBook.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

export const listPriceBooks = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json([]);
  }

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  const pricebooks = await PriceBook.find(query).sort({ name: 1 });
  res.json(pricebooks);
});

export const createPriceBook = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const pricebook = await PriceBook.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  res.status(201).json(pricebook);
});

export const updatePriceBook = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const pricebook = await PriceBook.findById(req.params.id);

  if (!pricebook) throw new AppError("Price Book not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(pricebook.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const updated = await PriceBook.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

export const deletePriceBook = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const pricebook = await PriceBook.findById(req.params.id);

  if (!pricebook) throw new AppError("Price Book not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(pricebook.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  await PriceBook.findByIdAndDelete(req.params.id);
  res.json({ message: "Price Book deleted successfully" });
});
