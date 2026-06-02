import { InventoryItem } from "../models/InventoryItem.js";
import { InventoryMovement } from "../models/InventoryMovement.js";
import { Website } from "../models/Website.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { getSocketServer } from "../sockets/index.js";
import { createDraftFromLowStock } from "../services/purchaseOrderService.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

function normalizeText(value = "") {
  return String(value || "").trim();
}

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

async function assertItemAccess(user, itemId) {
  const item = await InventoryItem.findById(itemId);
  if (!item) throw new AppError("Inventory item not found", 404);
  await assertWebsiteAccess(user, item.websiteId);
  return item;
}

export const getInventoryMeta = asyncHandler(async (req, res) => {
  const accessibleWebsiteIds = await getAccessibleWebsiteIds(req.user);
  const websites = await Website.find({ _id: { $in: accessibleWebsiteIds } })
    .select("websiteName domain")
    .sort({ websiteName: 1 });

  res.json({
    websites
  });
});

export const listInventoryItems = asyncHandler(async (req, res) => {
  const accessibleWebsiteIds = await getAccessibleWebsiteIds(req.user);
  const query = { websiteId: { $in: accessibleWebsiteIds } };

  if (req.query.websiteId) {
    query.websiteId = await assertWebsiteAccess(req.user, req.query.websiteId);
  }

  const items = await InventoryItem.find(query)
    .populate("websiteId", "websiteName domain")
    .sort({ createdAt: -1 });

  res.json(items);
});

export const searchInventoryItems = asyncHandler(async (req, res) => {
  const accessibleWebsiteIds = await getAccessibleWebsiteIds(req.user);
  const q = normalizeText(req.query.q);
  const websiteId = req.query.websiteId;

  const filter = { websiteId: { $in: accessibleWebsiteIds }, isActive: true };

  if (websiteId) {
    const checkedId = await assertWebsiteAccess(req.user, websiteId);
    filter.websiteId = checkedId;
  }

  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { name: regex },
      { sku: regex },
      { description: regex },
      { category: regex },
      { brand: regex }
    ];
  }

  const items = await InventoryItem.find(filter)
    .select("name sku unitCost unit quantity category brand description")
    .sort({ name: 1 })
    .limit(15);

  res.json(items);
});

export const getInventoryItem = asyncHandler(async (req, res) => {
  const item = await assertItemAccess(req.user, req.params.id);
  const populatedItem = await InventoryItem.findById(item._id)
    .populate("websiteId", "websiteName domain")
    .populate("categoryId", "name")
    .populate("subcategoryId", "name")
    .populate("sizeId", "name")
    .populate("colorId", "name");

  const recentMovements = await InventoryMovement.find({ itemId: item._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("createdBy", "name email");

  res.json({
    item: populatedItem,
    movements: recentMovements
  });
});

export const createInventoryItem = asyncHandler(async (req, res) => {
  const websiteId = await assertWebsiteAccess(req.user, req.body.websiteId);

  const name = normalizeText(req.body.name);
  let sku = normalizeText(req.body.sku).toUpperCase();
  
  if (!name) throw new AppError("Item name is required", 400);

  // Auto-generate SKU if not provided
  if (!sku) {
    const prefix = name.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    sku = `${prefix}-${timestamp}`;
  }

  const existing = await InventoryItem.findOne({ websiteId, sku });
  if (existing) throw new AppError("SKU already exists for this website", 400);

  const item = await InventoryItem.create({
    websiteId,
    name,
    sku,
    category: normalizeText(req.body.category),
    categoryId: req.body.categoryId || null,
    subcategoryId: req.body.subcategoryId || null,
    sizeId: req.body.sizeId || null,
    colorId: req.body.colorId || null,
    brand: normalizeText(req.body.brand),
    unit: normalizeText(req.body.unit) || "pcs",
    unitCost: Number(req.body.unitCost || 0),
    quantity: Number(req.body.quantity || 0),
    reorderLevel: Number(req.body.reorderLevel || 0),
    description: normalizeText(req.body.description),
    notes: normalizeText(req.body.notes),
    isActive: req.body.isActive !== false,
    createdBy: req.user._id
  });

  const populatedItem = await InventoryItem.findById(item._id)
    .populate("websiteId", "websiteName domain")
    .populate("categoryId", "name")
    .populate("subcategoryId", "name")
    .populate("sizeId", "name")
    .populate("colorId", "name");

  res.status(201).json(populatedItem);
});

export const updateInventoryItem = asyncHandler(async (req, res) => {
  const item = await assertItemAccess(req.user, req.params.id);

  const nextSku = normalizeText(req.body.sku ?? item.sku).toUpperCase();
  const nextName = normalizeText(req.body.name ?? item.name);
  if (!nextName) throw new AppError("Item name is required", 400);
  if (!nextSku) throw new AppError("SKU is required", 400);

  const duplicate = await InventoryItem.findOne({
    _id: { $ne: item._id },
    websiteId: item.websiteId,
    sku: nextSku
  });
  if (duplicate) throw new AppError("SKU already exists for this website", 400);

  item.name = nextName;
  item.sku = nextSku;
  item.category = normalizeText(req.body.category ?? item.category);
  if (req.body.categoryId !== undefined) item.categoryId = req.body.categoryId || null;
  if (req.body.subcategoryId !== undefined) item.subcategoryId = req.body.subcategoryId || null;
  if (req.body.sizeId !== undefined) item.sizeId = req.body.sizeId || null;
  if (req.body.colorId !== undefined) item.colorId = req.body.colorId || null;
  item.brand = normalizeText(req.body.brand ?? item.brand);
  item.unit = normalizeText(req.body.unit ?? item.unit) || "pcs";
  if (req.body.unitCost !== undefined) item.unitCost = Number(req.body.unitCost || 0);
  if (req.body.quantity !== undefined) item.quantity = Number(req.body.quantity || 0);
  if (req.body.reorderLevel !== undefined) item.reorderLevel = Number(req.body.reorderLevel || 0);
  item.description = normalizeText(req.body.description ?? item.description);
  item.notes = normalizeText(req.body.notes ?? item.notes);
  if (typeof req.body.isActive === "boolean") item.isActive = req.body.isActive;

  await item.save();
  const populatedItem = await InventoryItem.findById(item._id)
    .populate("websiteId", "websiteName domain")
    .populate("categoryId", "name")
    .populate("subcategoryId", "name")
    .populate("sizeId", "name")
    .populate("colorId", "name");

  res.json(populatedItem);
});

export const deleteInventoryItem = asyncHandler(async (req, res) => {
  const item = await assertItemAccess(req.user, req.params.id);
  await InventoryMovement.deleteMany({ itemId: item._id });
  await item.deleteOne();
  res.status(204).send();
});

export const listInventoryMovements = asyncHandler(async (req, res) => {
  const accessibleWebsiteIds = await getAccessibleWebsiteIds(req.user);
  const query = { websiteId: { $in: accessibleWebsiteIds } };

  if (req.query.websiteId) {
    query.websiteId = await assertWebsiteAccess(req.user, req.query.websiteId);
  }

  if (req.query.itemId) {
    const item = await assertItemAccess(req.user, req.query.itemId);
    query.itemId = item._id;
  }

  if (req.query.type) {
    query.type = req.query.type;
  }

  const movements = await InventoryMovement.find(query)
    .populate("itemId", "name sku unit quantity")
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .limit(200);

  res.json(movements);
});

export const createInventoryMovement = asyncHandler(async (req, res) => {
  const item = await assertItemAccess(req.user, req.body.itemId);
  const type = normalizeText(req.body.type).toLowerCase();
  const quantity = Number(req.body.quantity);

  if (!["in", "out", "adjust"].includes(type)) {
    throw new AppError("Movement type must be in, out, or adjust", 400);
  }

  if (!Number.isFinite(quantity) || quantity === 0) {
    throw new AppError("Quantity must be a non-zero number", 400);
  }

  const previousQuantity = Number(item.quantity || 0);
  let nextQuantity = previousQuantity;

  if (type === "in") {
    if (quantity < 0) throw new AppError("Stock in quantity must be positive", 400);
    nextQuantity += quantity;
  }

  if (type === "out") {
    if (quantity < 0) throw new AppError("Stock out quantity must be positive", 400);
    if (previousQuantity < quantity) throw new AppError("Insufficient stock for stock out", 400);
    nextQuantity -= quantity;
  }

  if (type === "adjust") {
    nextQuantity += quantity;
    if (nextQuantity < 0) throw new AppError("Adjustment cannot reduce stock below zero", 400);
  }

  item.quantity = nextQuantity;
  await item.save();

  const movement = await InventoryMovement.create({
    websiteId: item.websiteId,
    itemId: item._id,
    type,
    quantity,
    previousQuantity,
    balanceAfter: nextQuantity,
    reference: normalizeText(req.body.reference),
    notes: normalizeText(req.body.notes),
    createdBy: req.user._id
  });

  const populatedMovement = await InventoryMovement.findById(movement._id)
    .populate("itemId", "name sku unit quantity")
    .populate("createdBy", "name email");

  // Low Stock Automation Trigger
  if (item.reorderLevel > 0 && nextQuantity <= item.reorderLevel) {
    try {
      const website = await Website.findById(item.websiteId);
      const notifications = [];

      const io = getSocketServer();

      // 1. Notify the User who performed the action (YOU)
      const note1 = await Notification.create({
        recipient: req.user._id,
        type: "inventory_low_stock",
        title: "Low Stock Alert (Confirmed)",
        message: `Item "${item.name}" (${item.sku}) is low: ${nextQuantity} remaining.`,
        entityType: "inventory",
        entityId: item._id.toString()
      });
      if (io) io.to(`us_${req.user._id}`).emit("notification:new", note1);

      // 2. Notify Website Owner (Client) and Sales Team
      if (website && website.managerId) {
        const recipients = await User.find({
          $or: [
            { _id: website.managerId },
            { managerId: website.managerId, role: "sales" },
            { websiteIds: website._id, role: "sales" }
          ]
        }).select("_id");

        for (const r of recipients) {
          if (r._id.toString() === req.user._id.toString()) continue; // already handled
          
          const note = await Notification.create({
            recipient: r._id,
            type: "inventory_low_stock",
            title: "Low Stock Alert",
            message: `Item "${item.name}" (${item.sku}) has reached low stock level: ${nextQuantity} remaining.`,
            entityType: "inventory",
            entityId: item._id.toString()
          });
          if (io) io.to(`us_${r._id}`).emit("notification:new", note);
        }
      }

      // 3. Notify Preferred Supplier
      if (item.preferredSupplierId) {
        const supplierUser = await User.findOne({ supplierId: item.preferredSupplierId });
        if (supplierUser) {
          const note3 = await Notification.create({
            recipient: supplierUser._id,
            type: "inventory_low_stock",
            title: "Inventory Replenishment Needed",
            message: `One of your assigned items "${item.name}" is low on stock (${nextQuantity} left).`,
            entityType: "inventory",
            entityId: item._id.toString()
          });
          if (io) io.to(`us_${supplierUser._id}`).emit("notification:new", note3);
        }
      }

      // 4. Create Draft Purchase Order for Replenishment
      await createDraftFromLowStock(item._id);
    } catch (notifyErr) {
      console.error("Failed to trigger low stock notifications:", notifyErr);
    }
  }

  res.status(201).json({
    ...populatedMovement.toObject(),
    debugInfo: {
      reorderLevel: item.reorderLevel,
      nextQuantity: nextQuantity,
      triggered: (item.reorderLevel > 0 && nextQuantity <= item.reorderLevel)
    }
  });
});
