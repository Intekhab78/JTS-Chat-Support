import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Supplier } from "../models/Supplier.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { InventoryMovement } from "../models/InventoryMovement.js";
import { 
  checkAndNotifyLowStock, 
  notifyOrderStatusUpdate, 
  notifyInvoiceUploaded 
} from "../services/procurementNotificationService.js";
import { generatePurchaseOrderPDF } from "../services/pdfService.js";
import { Website } from "../models/Website.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { addPOHistory, reconcilePO, updateSupplierPerformance } from "../services/procurementIntelligenceService.js";

// @desc    Get purchase orders for logged in supplier
// @route   GET /api/supplier/orders
// @access  Private (Supplier)
export const getSupplierOrders = asyncHandler(async (req, res, next) => {
  if (!req.user.supplierId) {
    return next(new AppError("User is not associated with any supplier record.", 403));
  }

  const { status, limit = 50, page = 1 } = req.query;
  const query = { supplierId: req.user.supplierId };
  if (status) query.status = status;

  const orders = await PurchaseOrder.find(query)
    .populate("websiteId", "websiteName")
    .sort("-createdAt")
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));

  res.status(200).json({ success: true, data: orders });
});

// @desc    Update purchase order status
// @route   PATCH /api/supplier/orders/:id/status
// @access  Private (Supplier)
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  if (!req.user.supplierId) {
    return next(new AppError("User is not associated with any supplier record.", 403));
  }

  const { status, expectedDeliveryDate } = req.body;
  const allowedStatuses = ["accepted", "shipped", "delivered", "cancelled"];

  if (!allowedStatuses.includes(status)) {
    return next(new AppError("Invalid status transition.", 400));
  }

  const order = await PurchaseOrder.findOne({
    _id: req.params.id,
    supplierId: req.user.supplierId
  });

  if (!order) {
    return next(new AppError("Purchase order not found or unauthorized.", 404));
  }

  if (status !== order.status) {
    order.status = status;
    await addPOHistory(order, status, req.user._id);
  }
  
  if (expectedDeliveryDate) {
    order.expectedDeliveryDate = expectedDeliveryDate;
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
          createdBy: req.user._id // The supplier User ID
        });
        await checkAndNotifyLowStock(item._id);
      }
    }
    order.stockReceived = true;
    
    // Trigger performance update for supplier
    setTimeout(() => updateSupplierPerformance(order.supplierId), 0);
  }

  await order.save();
  await notifyOrderStatusUpdate(order, "supplier");
  res.status(200).json({ success: true, data: order });
});

// @desc    Get supplier profile
// @route   GET /api/supplier/profile
// @access  Private (Supplier)
export const getSupplierProfile = asyncHandler(async (req, res, next) => {
  if (!req.user.supplierId) {
    return next(new AppError("User is not associated with any supplier record.", 403));
  }

  const supplier = await Supplier.findById(req.user.supplierId).populate("websiteIds", "websiteName");
  if (!supplier) {
    return next(new AppError("Supplier record not found.", 404));
  }

  res.status(200).json({ success: true, data: supplier });
});

// @desc    Update supplier profile
// @route   PATCH /api/supplier/profile
// @access  Private (Supplier)
export const updateSupplierProfile = asyncHandler(async (req, res, next) => {
  if (!req.user.supplierId) {
    return next(new AppError("User is not associated with any supplier record.", 403));
  }

  const { contactPerson, phone, address, taxId } = req.body;

  const supplier = await Supplier.findByIdAndUpdate(
    req.user.supplierId,
    { contactPerson, phone, address, taxId },
    { new: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: supplier });
});

// @desc    Upload an invoice for a purchase order
// @route   POST /api/supplier/orders/:id/invoice
// @access  Private (Supplier)
export const uploadInvoice = asyncHandler(async (req, res, next) => {
  if (!req.user.supplierId) {
    return next(new AppError("User is not associated with any supplier record.", 403));
  }

  const { invoiceUrl, invoiceAmount } = req.body;
  if (!invoiceUrl) {
    return next(new AppError("Invoice URL is required.", 400));
  }

  const order = await PurchaseOrder.findOne({
    _id: req.params.id,
    supplierId: req.user.supplierId
  });

  if (!order) {
    return next(new AppError("Purchase order not found or unauthorized.", 404));
  }

  // Usually invoices are uploaded after shipping or delivering
  if (order.status === "draft" || order.status === "sent") {
    return next(new AppError("Cannot upload invoice before accepting the order.", 400));
  }

  order.invoiceUrl = invoiceUrl;
  
  // Reconcile if amount is provided
  if (invoiceAmount) {
    await reconcilePO(order._id, Number(invoiceAmount), req.user._id);
  }

  await order.save();
  await notifyInvoiceUploaded(order);

  res.status(200).json({ success: true, data: order });
});

export const downloadPurchaseOrderPDF = asyncHandler(async (req, res, next) => {
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) return next(new AppError("Order not found", 404));

  // Verify this order belongs to the supplier
  if (order.supplierId.toString() !== req.user.supplierId.toString()) {
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

// @desc    Get inventory items for which this supplier is preferred
// @route   GET /api/supplier/inventory
// @access  Private (Supplier)
export const getSupplierInventory = asyncHandler(async (req, res, next) => {
  if (!req.user.supplierId) {
    return next(new AppError("User is not associated with any supplier record.", 403));
  }

  const items = await InventoryItem.find({ preferredSupplierId: req.user.supplierId })
    .populate("websiteId", "websiteName")
    .sort("name");

  res.status(200).json(items);
});

// @desc    Get financial ledger for supplier
// @route   GET /api/supplier/ledger
// @access  Private (Supplier)
export const getSupplierLedger = asyncHandler(async (req, res, next) => {
  if (!req.user.supplierId) {
    return next(new AppError("User is not associated with any supplier record.", 403));
  }

  const orders = await PurchaseOrder.find({ supplierId: req.user.supplierId })
    .select("poNumber total status reconciliation createdAt deliveryDate")
    .sort("-createdAt");

  // Calculate monthly stats for charts
  const monthlyStats = {};
  orders.forEach(o => {
    const month = new Date(o.createdAt).toLocaleString('default', { month: 'short' });
    if (!monthlyStats[month]) {
      monthlyStats[month] = { month, billed: 0, matched: 0 };
    }
    monthlyStats[month].billed += o.total;
    if (o.reconciliation?.status === "matched") {
      monthlyStats[month].matched += o.total;
    }
  });

  const stats = {
    totalBilled: orders.reduce((acc, o) => acc + o.total, 0),
    matchedAmount: orders.filter(o => o.reconciliation?.status === "matched").reduce((acc, o) => acc + o.total, 0),
    pendingAmount: orders.filter(o => o.status !== "delivered").reduce((acc, o) => acc + o.total, 0),
    mismatchCount: orders.filter(o => o.reconciliation?.status === "mismatch").length,
    monthlyTrend: Object.values(monthlyStats).reverse()
  };

  res.status(200).json({ orders, stats });
});
