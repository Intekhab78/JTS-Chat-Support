import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Supplier } from "../models/Supplier.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { InventoryMovement } from "../models/InventoryMovement.js";
import { Customer } from "../models/Customer.js";
import { 
  checkAndNotifyLowStock, 
  notifyOrderStatusUpdate 
} from "../services/procurementNotificationService.js";
import { generatePurchaseOrderPDF } from "../services/pdfService.js";
import { User } from "../models/User.js";
import { Website } from "../models/Website.js";
import bcrypt from "bcryptjs";
import { getOwnedWebsiteIds, normalizeRole } from "../utils/roleUtils.js";
import { assertWebsiteAccess } from "../utils/websiteScope.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { addPOHistory, updateSupplierPerformance } from "../services/procurementIntelligenceService.js";


// @desc    Get all suppliers
// @route   GET /api/procurement/suppliers
// @access  Private (Internal)
export const getSuppliers = asyncHandler(async (req, res) => {
  const websiteIds = await getOwnedWebsiteIds(req.user);
  
  // Scoped to accessible websites if not a global admin
  const query = req.user.role === "admin" ? {} : {
    $or: [
      { websiteIds: { $in: websiteIds } },
      { websiteIds: { $size: 0 } } // Global suppliers
    ]
  };

  const suppliers = await Supplier.find(query).sort("companyName");
  res.status(200).json(suppliers);
});

// @desc    Create a new supplier and user credential
// @route   POST /api/procurement/suppliers
// @access  Private (Internal)
export const createSupplier = asyncHandler(async (req, res, next) => {
  const { companyName, contactPerson, email, phone, taxId, address, password } = req.body;
  const websiteIds = await getOwnedWebsiteIds(req.user);

  // Check if user with email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError("Email is already registered.", 400));
  }

  // Create Supplier
  const supplier = await Supplier.create({
    companyName,
    contactPerson,
    email,
    phone,
    taxId,
    address,
    websiteIds, // Scope it to the creator's websites
    createdBy: req.user._id
  });

  // Create User
  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: contactPerson || companyName,
    email,
    password: hashedPassword,
    role: "supplier",
    supplierId: supplier._id
  });

  res.status(201).json(supplier);
});

// @desc    Get all purchase orders
// @route   GET /api/procurement/orders
// @access  Private (Internal)
export const getPurchaseOrders = asyncHandler(async (req, res) => {
  const websiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  const role = normalizeRole(req.user.role);
  const query = {};
  if (role !== "admin") {
    query.websiteId = { $in: websiteIds };
  }
  if (websiteId) {
    assertWebsiteAccess(req.user, websiteIds, websiteId);
    query.websiteId = websiteId;
  }

  const orders = await PurchaseOrder.find(query)
    .populate("supplierId", "companyName email")
    .populate("websiteId", "websiteName")
    .sort("-createdAt");

  res.status(200).json(orders);
});

export const getProcurementStats = async (req, res) => {
  try {
    const allWebsiteIds = await getOwnedWebsiteIds(req.user);
    
    // Build websiteId filter
    let websiteIds;
    if (req.query.websiteId) {
      // Use the provided websiteId directly (user is authenticated, route requires role)
      // Try to use it directly if it's in the manager's allowed list, 
      // OR if the manager can see it (shown in their website selector)
      const filtered = allWebsiteIds.filter(id => id.toString() === req.query.websiteId);
      websiteIds = filtered.length > 0 ? filtered : allWebsiteIds;
      // If manager has no websites in allWebsiteIds, allow direct query on provided websiteId
      if (allWebsiteIds.length === 0 && req.query.websiteId) {
        // Direct fallback for managers whose getOwnedWebsiteIds may not be configured
        const fallbackWebsite = await Website.findById(req.query.websiteId).select("_id");
        if (fallbackWebsite) websiteIds = [fallbackWebsite._id];
      }
    } else {
      websiteIds = allWebsiteIds;
    }

    // Guard: if still empty, return zeros rather than querying all data
    if (!websiteIds || websiteIds.length === 0) {
      return res.json({
        totalSpend: 0,
        statusDistribution: [],
        topSuppliers: [],
        lowStockCount: 0,
        lowStockItems: [],
        totalOrders: 0,
        crm: { wonDeals: 0, lockedDeals: 0, completedWorkflows: 0, wonRevenue: 0 }
      });
    }
    
    // 1. Total Spend (all non-draft POs)
    const spendData = await PurchaseOrder.aggregate([
      { $match: { websiteId: { $in: websiteIds }, status: { $ne: "draft" } } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);

    // 2. Status Distribution of POs
    const statusData = await PurchaseOrder.aggregate([
      { $match: { websiteId: { $in: websiteIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // 3. Top Suppliers
    const supplierData = await PurchaseOrder.aggregate([
      { $match: { websiteId: { $in: websiteIds } } },
      { $group: { _id: "$supplierId", totalValue: { $sum: "$total" }, orderCount: { $sum: 1 } } },
      { $sort: { totalValue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "suppliers",
          localField: "_id",
          foreignField: "_id",
          as: "supplier"
        }
      },
      { $unwind: "$supplier" }
    ]);

    // 4. Low Stock Items
    const lowStockItems = await InventoryItem.find({
      websiteId: { $in: websiteIds },
      $expr: { $lte: ["$quantity", "$reorderLevel"] }
    }).limit(5);

    // 5. Total PO count
    const totalOrders = await PurchaseOrder.countDocuments({ websiteId: { $in: websiteIds } });

    // 6. CRM Won Deals — supplement procurement view with real business activity
    // Check both pipelineStage and dealStage to be robust
    const wonDeals = await Customer.countDocuments({
      websiteId: { $in: websiteIds },
      $or: [{ pipelineStage: "won" }, { dealStage: "won" }]
    });
    const lockedDeals = await Customer.countDocuments({
      websiteId: { $in: websiteIds },
      isLocked: true
    });
    const completedWorkflows = await Customer.countDocuments({
      websiteId: { $in: websiteIds },
      purchaseWorkflowStatus: "completed"
    });
    const wonRevenueData = await Customer.aggregate([
      { $match: { websiteId: { $in: websiteIds }, $or: [{ pipelineStage: "won" }, { dealStage: "won" }] } },
      { $group: { _id: null, total: { $sum: "$leadValue" } } }
    ]);

    res.json({
      totalSpend: spendData[0]?.total || 0,
      statusDistribution: statusData,
      topSuppliers: supplierData,
      lowStockCount: await InventoryItem.countDocuments({
        websiteId: { $in: websiteIds },
        $expr: { $lte: ["$quantity", "$reorderLevel"] }
      }),
      lowStockItems,
      totalOrders,
      crm: {
        wonDeals,
        lockedDeals,
        completedWorkflows,
        wonRevenue: wonRevenueData[0]?.total || 0
      }
    });
  } catch (error) {
    console.error("getProcurementStats error:", error);
    res.status(500).json({ message: error.message });
  }
};


export const downloadPurchaseOrderPDF = asyncHandler(async (req, res, next) => {
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) return next(new AppError("Order not found", 404));

  const websiteIds = await getOwnedWebsiteIds(req.user);
  const role = normalizeRole(req.user.role);
  if (role !== "admin" && !websiteIds.some(id => id.toString() === order.websiteId.toString())) {
    return next(new AppError("Access denied", 403));
  }

  const [supplier, website] = await Promise.all([
    Supplier.findById(order.supplierId),
    Website.findById(order.websiteId)
  ]);

  const pdfBuffer = await generatePurchaseOrderPDF(order, supplier, website);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=PO-${order.poNumber}.pdf`);
  res.send(pdfBuffer);
});

// @desc    Create a new purchase order
// @route   POST /api/procurement/orders
// @access  Private (Internal)
export const createPurchaseOrder = asyncHandler(async (req, res, next) => {
  const { supplierId, websiteId, items, notes, terms, expectedDeliveryDate, crmCustomerId } = req.body;
  const validWebsiteIds = await getOwnedWebsiteIds(req.user);

  assertWebsiteAccess(req.user, validWebsiteIds, websiteId);

  // Validate and dynamically register any new inventory items
  const parsedItems = [];
  for (const item of items) {
    let itemId = item.itemId;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(itemId);
    if (!isValidObjectId || itemId === "new" || !itemId) {
      // Look up existing active item by name for this website to prevent duplicate SKUs
      let dbItem = await InventoryItem.findOne({
        websiteId,
        name: item.description.trim(),
        isDeleted: { $ne: true }
      });
      
      if (!dbItem) {
        // Create matching inventory item on the fly
        const cleanName = item.description.trim();
        const cleanPrefix = cleanName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "ITEM");
        const prefix = cleanPrefix.length === 3 ? cleanPrefix : "POITEM";
        const rand = Math.floor(1000 + Math.random() * 9000);
        const sku = `${prefix}-${rand}`;
        
        dbItem = await InventoryItem.create({
          websiteId,
          name: cleanName,
          sku,
          unit: "pcs",
          unitCost: Number(item.unitPrice || 0),
          quantity: 0,
          reorderLevel: 5
        });
      }
      itemId = dbItem._id;
    }
    
    parsedItems.push({
      itemId,
      description: item.description,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0),
      total: Number(item.quantity || 1) * Number(item.unitPrice || 0)
    });
  }

  // Calculate totals from validated items
  const total = parsedItems.reduce((acc, item) => acc + item.total, 0);

  const po = new PurchaseOrder({
    poNumber: `PO-${Date.now()}`,
    supplierId,
    websiteId,
    items: parsedItems,
    total,
    notes,
    terms,
    expectedDeliveryDate,
    crmCustomerId,
    status: "sent", // Assuming sending immediately
    createdBy: req.user._id
  });

  await addPOHistory(po, "sent", req.user._id, "Order created and issued to supplier.");
  await po.save();

  res.status(201).json(po);
});

// @desc    Update a purchase order
// @route   PATCH /api/procurement/orders/:id
// @access  Private (Internal)
export const updatePurchaseOrder = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const validWebsiteIds = await getOwnedWebsiteIds(req.user);

  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) return next(new AppError("Purchase order not found", 404));

  assertWebsiteAccess(req.user, validWebsiteIds, order.websiteId, "You do not have access to this order.");

  if (status && status !== order.status) {
    order.status = status;
    await addPOHistory(order, status, req.user._id);
  }

  // --- Automatic Stock Receipt ---
  if (order.status === "delivered" && !order.stockReceived) {
    for (const poItem of order.items) {
      if (!poItem.itemId) continue;
      
      const item = await InventoryItem.findById(poItem.itemId);
      if (item) {
        const previousQuantity = Number(item.quantity || 0);
        const nextQuantity = previousQuantity + Number(poItem.quantity);
        
        item.quantity = nextQuantity;
        await item.save();

        await InventoryMovement.create({
          websiteId: item.websiteId,
          itemId: item._id,
          type: "in",
          quantity: poItem.quantity,
          previousQuantity,
          balanceAfter: nextQuantity,
          reference: `PO-${order.poNumber}`,
          notes: `Automatic stock receipt from Purchase Order ${order.poNumber}`,
          createdBy: req.user._id
        });
        
        await checkAndNotifyLowStock(item._id);
      }
    }
    order.stockReceived = true;

    // Trigger performance update for supplier
    setTimeout(() => updateSupplierPerformance(order.supplierId), 0);
  }

  await order.save();

  res.status(200).json(order);
});
