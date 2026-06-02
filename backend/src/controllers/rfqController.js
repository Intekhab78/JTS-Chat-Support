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

// @desc    Award RFQ to a supplier
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
  
  await rfq.save();
  res.status(200).json(rfq);
});
