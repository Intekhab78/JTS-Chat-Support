import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { Size } from "../models/Size.js";
import { Color } from "../models/Color.js";
import { InventoryCategory } from "../models/InventoryCategory.js";
import { InventorySubcategory } from "../models/InventorySubcategory.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";

const models = {
  size: Size,
  color: Color,
  category: InventoryCategory,
  subcategory: InventorySubcategory
};

async function getAccessibleWebsiteIds(user) {
  const websiteIds = await getOwnedWebsiteIds(user);
  return websiteIds.map(String);
}

async function assertWebsiteAccess(user, websiteId) {
  const normalizedWebsiteId = String(websiteId || "");
  if (!normalizedWebsiteId) {
    throw new AppError("Website is required", 400);
  }
  const accessibleWebsiteIds = await getAccessibleWebsiteIds(user);
  if (!accessibleWebsiteIds.includes(normalizedWebsiteId)) {
    throw new AppError("Access denied", 403);
  }
  return normalizedWebsiteId;
}

export const listMasters = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const Model = models[type];
  if (!Model) throw new AppError("Invalid master type", 400);

  const accessibleWebsiteIds = await getAccessibleWebsiteIds(req.user);
  const query = { websiteId: { $in: accessibleWebsiteIds } };

  if (req.query.websiteId) {
    query.websiteId = await assertWebsiteAccess(req.user, req.query.websiteId);
  }

  const items = await Model.find(query).sort({ createdAt: -1 });
  res.json(items);
});

export const createMaster = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const Model = models[type];
  if (!Model) throw new AppError("Invalid master type", 400);

  const websiteId = await assertWebsiteAccess(req.user, req.body.websiteId);
  const name = String(req.body.name || "").trim();
  if (!name) throw new AppError("Name is required", 400);

  const payload = { websiteId, name, isActive: req.body.isActive !== false };
  if (type === "subcategory") {
    if (!req.body.categoryId) throw new AppError("Category is required for subcategory", 400);
    payload.categoryId = req.body.categoryId;
  }

  const item = await Model.create(payload);
  res.status(201).json(item);
});

export const updateMaster = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const Model = models[type];
  if (!Model) throw new AppError("Invalid master type", 400);

  const item = await Model.findById(id);
  if (!item) throw new AppError("Master item not found", 404);
  await assertWebsiteAccess(req.user, item.websiteId);

  const name = String(req.body.name || "").trim();
  if (name) item.name = name;
  
  if (req.body.isActive !== undefined) {
    item.isActive = Boolean(req.body.isActive);
  }

  if (type === "subcategory" && req.body.categoryId) {
    item.categoryId = req.body.categoryId;
  }

  await item.save();
  res.json(item);
});

export const deleteMaster = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const Model = models[type];
  if (!Model) throw new AppError("Invalid master type", 400);

  const item = await Model.findById(id);
  if (!item) throw new AppError("Master item not found", 404);
  await assertWebsiteAccess(req.user, item.websiteId);

  await item.deleteOne();
  res.status(204).send();
});
