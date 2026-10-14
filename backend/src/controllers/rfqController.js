import { RFQ } from "../models/RFQ.js";
import { Supplier } from "../models/Supplier.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";

// @desc    Get all RFQs
// @route   GET /api/procurement/rfqs
export const getRFQs = asyncHandler(async (req, res) => {
  const websiteIds = await getOwnedWebsiteIds(req.user);
  const query = req.user.role === "admin" ? {} : { websiteId: { $in: websiteIds } };
  
  const rfqs = await RFQ.find(query)
    .populate("websiteId", "websiteName")
    .populate("invitedSuppliers", "companyName")
    .sort("-createdAt");
    
  res.status(200).json(rfqs);
});

// @desc    Create a new RFQ
// @route   POST /api/procurement/rfqs
export const createRFQ = asyncHandler(async (req, res) => {
  const { title, websiteId, items, invitedSuppliers, expiryDate, notes } = req.body;
  
  const count = await RFQ.countDocuments();
  const rfqNumber = `RFQ-${(count + 1).toString().padStart(4, '0')}`;
  
  const rfq = await RFQ.create({
    rfqNumber,
    title,
    websiteId,
    items,
    invitedSuppliers,
    expiryDate,
    notes,
    createdBy: req.user._id
  });
  
  res.status(201).json(rfq);
});

// @desc    Submit a bid for an RFQ
// @route   POST /api/procurement/rfqs/:id/bids
export const submitBid = asyncHandler(async (req, res, next) => {
  const { quotedPrice, expectedDeliveryDate, notes } = req.body;
  const rfq = await RFQ.findById(req.params.id);
  
  if (!rfq) return next(new AppError("RFQ not found", 404));
  if (rfq.status !== "open") return next(new AppError("RFQ is no longer accepting bids", 400));
  if (new Date() > rfq.expiryDate) return next(new AppError("RFQ has expired", 400));
  
  const supplierId = req.user.supplierId;
  if (!supplierId) return next(new AppError("Only suppliers can submit bids", 403));
  
  // Check if supplier already bid
  const existing = rfq.bids.find(b => b.supplierId.toString() === supplierId.toString());
  if (existing) return next(new AppError("You have already submitted a bid for this RFQ", 400));
  
  rfq.bids.push({
    supplierId,
    quotedPrice,
    expectedDeliveryDate,
    notes
  });
  
  await rfq.save();
  res.status(201).json(rfq);
});

// @desc    Award RFQ to a supplier and auto-generate Purchase Order
// @route   POST /api/procurement/rfqs/:id/award
export const awardRFQ = asyncHandler(async (req, res, next) => {
  const { bidId } = req.body;
  const rfq = await RFQ.findById(req.params.id);
  
  if (!rfq) return next(new AppError("RFQ not found", 404));
  
  const bid = rfq.bids.id(bidId);
  if (!bid) return next(new AppError("Bid not found", 404));
  
  rfq.status = "awarded";
  bid.status = "accepted";
  
  // Reject others
  rfq.bids.forEach(b => {
    if (b._id.toString() !== bidId) b.status = "rejected";
  });
  
  // Auto-generate Purchase Order from awarded bid
  let createdPo = null;
  try {
    const { PurchaseOrder } = await import("../models/PurchaseOrder.js");
    const { InventoryItem } = await import("../models/InventoryItem.js");
    const { addPOHistory } = await import("../services/procurementIntelligenceService.js");

    const poItems = [];
    const itemCount = rfq.items?.length || 1;
    const unitPriceCalculated = Math.round((Number(bid.quotedPrice || 0) / itemCount) * 100) / 100;

    for (const item of (rfq.items || [])) {
      let itemId = item.itemId;
      if (!itemId) {
        let dbItem = await InventoryItem.findOne({ websiteId: rfq.websiteId, name: item.name || item.description });
        if (!dbItem) {
          dbItem = await InventoryItem.create({
            websiteId: rfq.websiteId,
            name: item.name || item.description || "Procured Material",
            sku: `SKU-${Date.now().toString().slice(-4)}-${Math.floor(Math.random() * 100)}`,
            quantity: 0,
            unitPrice: unitPriceCalculated,
            reorderLevel: 5
          });
        }
        itemId = dbItem._id;
      }

      const qty = Number(item.quantity || 1);
      poItems.push({
        itemId,
        description: item.name || item.description || "RFQ Material",
        quantity: qty,
        unitPrice: unitPriceCalculated,
        total: Math.round(qty * unitPriceCalculated * 100) / 100
      });
    }

    const poNumber = `PO-RFQ-${Date.now().toString().slice(-6)}`;
    createdPo = await PurchaseOrder.create({
      poNumber,
      supplierId: bid.supplierId,
      websiteId: rfq.websiteId,
      items: poItems,
      subtotal: Number(bid.quotedPrice || 0),
      total: Number(bid.quotedPrice || 0),
      currency: "INR",
      status: "sent",
      expectedDeliveryDate: bid.expectedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: `Awarded from RFQ ${rfq.rfqNumber || rfq._id}. Supplier note: ${bid.notes || "None"}`,
      terms: rfq.notes || "Standard Procurement Terms",
      createdBy: req.user._id
    });

    await addPOHistory(createdPo, "sent", req.user._id, `Auto-created upon awarding RFQ ${rfq.rfqNumber || rfq._id}`);
  } catch (poErr) {
    console.error("[awardRFQ] Error auto-generating PurchaseOrder:", poErr);
  }

  await rfq.save();
  res.status(200).json({ rfq, purchaseOrder: createdPo });
});
