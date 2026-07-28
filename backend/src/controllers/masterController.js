import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { Size } from "../models/Size.js";
import { Color } from "../models/Color.js";
import { InventoryCategory } from "../models/InventoryCategory.js";
import { InventorySubcategory } from "../models/InventorySubcategory.js";
import { Brand } from "../models/Brand.js";
import { Unit } from "../models/Unit.js";
import { Supplier } from "../models/Supplier.js";
import { TaxMaster } from "../models/TaxMaster.js";
import { User } from "../models/User.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { broadcastDataChange } from "../services/dataSyncService.js";

const models = {
  size: Size,
  color: Color,
  category: InventoryCategory,
  subcategory: InventorySubcategory,
  brand: Brand,
  unit: Unit,
  supplier: Supplier,
  tax: TaxMaster
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
  
  let query = {};
  if (type === "supplier") {
    query = req.user.role === "admin" ? {} : {
      $or: [
        { websiteIds: { $in: accessibleWebsiteIds } },
        { websiteIds: { $size: 0 } }
      ]
    };
    if (req.query.websiteId) {
      const targetWebsiteId = await assertWebsiteAccess(req.user, req.query.websiteId);
      query = { websiteIds: targetWebsiteId };
    }
  } else {
    query = { websiteId: { $in: accessibleWebsiteIds } };
    if (req.query.websiteId) {
      query.websiteId = await assertWebsiteAccess(req.user, req.query.websiteId);
    }
  }

  const items = await Model.find(query).sort({ createdAt: -1 });

  if (type === "supplier") {
    const mapped = items.map(item => ({
      _id: item._id,
      name: item.companyName,
      companyName: item.companyName,
      contactPerson: item.contactPerson,
      email: item.email,
      phone: item.phone,
      isActive: item.status === "active",
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));
    return res.json(mapped);
  }

  res.json(items);
});

export const createMaster = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const Model = models[type];
  if (!Model) throw new AppError("Invalid master type", 400);

  const websiteId = await assertWebsiteAccess(req.user, req.body.websiteId);

  if (type === "supplier") {
    const companyName = String(req.body.name || req.body.companyName || "").trim();
    if (!companyName) throw new AppError("Company name is required", 400);
    const email = String(req.body.email || `${companyName.toLowerCase().replace(/\s+/g, "")}@example.com`).trim();

    const duplicate = await Supplier.findOne({
      $or: [
        { companyName },
        { email }
      ]
    });
    if (duplicate) throw new AppError("Supplier with this name or email already exists", 400);

    const supplier = await Supplier.create({
      companyName,
      email,
      contactPerson: req.body.contactPerson || "",
      phone: req.body.phone || "",
      websiteIds: [websiteId],
      status: req.body.isActive === false ? "inactive" : "active",
      createdBy: req.user._id
    });

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.default.hash("DefaultPassword123!", 12);
    await User.create({
      name: companyName,
      email,
      password: hashedPassword,
      role: "supplier",
      supplierId: supplier._id
    });

    return res.status(201).json({
      _id: supplier._id,
      name: supplier.companyName,
      companyName: supplier.companyName,
      isActive: supplier.status === "active",
      createdAt: supplier.createdAt
    });
  }

  const name = String(req.body.name || "").trim();
  if (!name) throw new AppError("Name is required", 400);

  // Duplicate Check
  const duplicateQuery = { websiteId, name };
  if (type === "subcategory") {
    if (!req.body.categoryId) throw new AppError("Category is required for subcategory", 400);
    duplicateQuery.categoryId = req.body.categoryId;
  }
  const duplicate = await Model.findOne(duplicateQuery);
  if (duplicate) {
    throw new AppError("Master item with this name already exists", 400);
  }

  const payload = { websiteId, name, isActive: req.body.isActive !== false };
  if (type === "subcategory") {
    payload.categoryId = req.body.categoryId;
  }
  if (type === "tax") {
    payload.rate = Number(req.body.rate || req.body.taxRate || 0);
    payload.taxCode = req.body.taxCode || "";
    payload.description = req.body.description || "";
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

  if (type === "supplier") {
    const name = String(req.body.name || req.body.companyName || "").trim();
    if (name) {
      const duplicate = await Supplier.findOne({ _id: { $ne: id }, companyName: name });
      if (duplicate) throw new AppError("Supplier with this name already exists", 400);
      item.companyName = name;
    }
    if (req.body.isActive !== undefined) {
      item.status = req.body.isActive ? "active" : "inactive";
    }
    await item.save();
    return res.json({
      _id: item._id,
      name: item.companyName,
      companyName: item.companyName,
      isActive: item.status === "active",
      createdAt: item.createdAt
    });
  }

  await assertWebsiteAccess(req.user, item.websiteId);

  const name = String(req.body.name || "").trim();
  if (name && name !== item.name) {
    const duplicateQuery = { websiteId: item.websiteId, name };
    if (type === "subcategory") {
      duplicateQuery.categoryId = req.body.categoryId || item.categoryId;
    }
    const duplicate = await Model.findOne(duplicateQuery);
    if (duplicate) throw new AppError("Master item with this name already exists", 400);
    item.name = name;
  }

  if (req.body.isActive !== undefined) {
    item.isActive = Boolean(req.body.isActive);
  }

  if (type === "subcategory" && req.body.categoryId) {
    item.categoryId = req.body.categoryId;
  }

  if (type === "tax") {
    if (req.body.rate !== undefined) item.rate = Number(req.body.rate);
    if (req.body.taxCode !== undefined) item.taxCode = req.body.taxCode;
    if (req.body.description !== undefined) item.description = req.body.description;
  }

  await item.save();
  broadcastDataChange({ entity: type, action: "updated", websiteId: item.websiteId, data: { id: item._id } });
  broadcastDataChange({ entity: "master", action: "updated", websiteId: item.websiteId, data: { id: item._id } });
  res.json(item);
});

export const deleteMaster = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const Model = models[type];
  if (!Model) throw new AppError("Invalid master type", 400);

  const item = await Model.findById(id);
  if (!item) throw new AppError("Master item not found", 404);

  if (type === "supplier") {
    await User.deleteMany({ supplierId: item._id });
    await item.deleteOne();
    broadcastDataChange({ entity: "supplier", action: "deleted", data: { id } });
    broadcastDataChange({ entity: "master", action: "deleted", data: { id } });
    return res.status(204).send();
  }

  await assertWebsiteAccess(req.user, item.websiteId);
  const websiteId = item.websiteId;
  await item.deleteOne();
  broadcastDataChange({ entity: type, action: "deleted", websiteId, data: { id } });
  broadcastDataChange({ entity: "master", action: "deleted", websiteId, data: { id } });
  res.status(204).send();
});
