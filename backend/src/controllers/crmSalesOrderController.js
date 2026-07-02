import { SalesOrder } from "../models/SalesOrder.js";
import { Quotation } from "../models/Quotation.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { logCrmActivity } from "../services/activityLoggerService.js";
import { calculateTotals } from "../utils/salesEngine.js";

export const listSalesOrders = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId, status } = req.query;

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

  if (customerId) query.customerId = customerId;
  if (status) query.status = status;

  const orders = await SalesOrder.find(query)
    .populate("customerId", "name companyName email")
    .populate("ownerId", "name email role")
    .sort({ createdAt: -1 });

  res.json(orders);
});

export const createSalesOrder = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const orderNumber = `SO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  const order = await SalesOrder.create({
    ...req.body,
    websiteId: resolvedWebsiteId,
    orderNumber,
    ownerId: req.user._id
  });

  // Log to Activity Timeline
  await logCrmActivity({
    websiteId: resolvedWebsiteId,
    type: "sales_order",
    title: `Sales Order Created: ${orderNumber}`,
    description: `Order total value: $${order.totalAmount}.`,
    customerId: order.customerId,
    ownerId: req.user._id
  });

  res.status(201).json(order);
});

export const updateSalesOrderStatus = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const order = await SalesOrder.findById(req.params.id);

  if (!order) throw new AppError("Sales Order not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(order.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const previousStatus = order.status;
  const updated = await SalesOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });

  if (previousStatus !== updated.status) {
    await logCrmActivity({
      websiteId: order.websiteId,
      type: "status_changed",
      title: `Order Status Shifted: ${order.orderNumber}`,
      description: `Progressed status from "${previousStatus}" to "${updated.status}".`,
      customerId: order.customerId,
      ownerId: req.user._id
    });
  }

  res.json(updated);
});

export const convertQuotationToOrder = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const quotation = await Quotation.findById(req.params.quoteId);

  if (!quotation) throw new AppError("Quotation not found", 404);
  
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(quotation.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const orderNumber = `SO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  
  // Construct items matching SalesOrder schema
  const orderItems = quotation.items.map(item => ({
    productId: item.productId || quotation._id, // fallback to quotation ID if not linked
    sku: item.sku || "CUSTOM",
    name: item.description,
    quantity: item.quantity,
    unitPrice: item.price,
    discount: item.discount,
    taxRate: item.taxRate,
    taxAmount: item.taxAmount,
    subtotal: item.subtotal,
    total: item.total
  }));

  const order = await SalesOrder.create({
    websiteId: quotation.websiteId,
    orderNumber,
    customerId: quotation.customerId,
    quotationId: quotation._id,
    status: "confirmed",
    items: orderItems,
    subtotal: quotation.subtotal,
    discountAmount: quotation.discountAmount,
    taxAmount: quotation.tax,
    shippingCharges: quotation.shippingCharges,
    totalAmount: quotation.total,
    ownerId: req.user._id
  });

  // Mark quotation as converted
  quotation.status = "converted";
  await quotation.save();

  // Log to Activity Timeline
  await logCrmActivity({
    websiteId: quotation.websiteId,
    type: "sales_order",
    title: `Quotation Converted: ${orderNumber}`,
    description: `Quotation ${quotation.quotationId} successfully converted to confirmed Sales Order ${orderNumber}. Inventory reserved (placeholder).`,
    customerId: quotation.customerId,
    ownerId: req.user._id
  });

  res.status(201).json(order);
});
