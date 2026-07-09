import { Quotation } from "../models/Quotation.js";
import { Customer } from "../models/Customer.js";
import { Invoice } from "../models/Invoice.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { generateQuotationPDF } from "../services/pdfService.js";
import { env } from "../config/env.js";
import {
  createAndEmitCrmNotification,
  emitCustomerActivity,
  getPurchaseRecipientsForWebsite
} from "../utils/crmUtils.js";
import { formatCurrency } from "../utils/formatters.js";
import { advancePurchaseWorkflow } from "../services/purchaseWorkflowService.js";
import { assertWebsiteAccess } from "../utils/websiteScope.js";
import { calculateTotals, determineApprovalRole } from "../utils/salesEngine.js";
import { logCrmActivity } from "../services/activityLoggerService.js";

export const createQuotation = asyncHandler(async (req, res) => {
  const {
    customerId, websiteId, items = [], discountAmount = 0, shippingCharges = 0,
    currency = "INR", notes, terms, validUntil, quotationNumber, priceBookId, isInterState = false
  } = req.body;

  if (!customerId || !websiteId || !items.length) throw new AppError("Missing required fields.", 400);

  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError("Customer not found.", 404);

  // Compute itemized totals using Tax & Pricing Engine
  const totals = calculateTotals({
    items,
    discountAmount,
    shippingCharges,
    isInterState
  });

  // Revision/Version assignment
  let resolvedQuoteNumber = quotationNumber;
  let nextVersion = 1;
  
  if (resolvedQuoteNumber) {
    const highestVerQuote = await Quotation.findOne({ websiteId, quotationNumber: resolvedQuoteNumber }).sort({ version: -1 });
    if (highestVerQuote) {
      nextVersion = highestVerQuote.version + 1;
    }
  } else {
    resolvedQuoteNumber = `QT-${Date.now().toString().slice(-6)}`;
  }

  const quotationId = `${resolvedQuoteNumber}-V${nextVersion}`;

  // Multi-tier discount approval checking
  const totalDiscountPct = (totals.discountAmount / (totals.subtotal || 1)) * 100;
  const approvalCheck = determineApprovalRole(totalDiscountPct);

  let initialStatus = "sent";
  let initialApprovalStatus = "none";

  if (approvalCheck.approvalStatus !== "none") {
    initialStatus = "pending_approval";
    initialApprovalStatus = approvalCheck.approvalStatus;
  }

  const quotation = await Quotation.create({
    quotationId,
    quotationNumber: resolvedQuoteNumber,
    version: nextVersion,
    customerId,
    websiteId,
    ownerId: req.user._id,
    priceBookId: priceBookId || null,
    items: totals.items,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    shippingCharges: totals.shippingCharges,
    tax: totals.tax,
    total: totals.total,
    currency,
    notes,
    terms,
    status: initialStatus,
    approvalStatus: initialApprovalStatus,
    validUntil: validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
  });

  // Trigger Notifications
  if (initialStatus === "pending_approval" && req.user.managerId) {
    await createAndEmitCrmNotification({
      recipient: req.user.managerId,
      type: "crm_approval_required",
      title: "Quotation Approval Escalation",
      message: `Quote ${quotationId} requires approval due to discount.`,
      link: `/client?tab=crm`
    });
  }

  // Log Activity Timeline
  await logCrmActivity({
    websiteId,
    type: "quotation_sent",
    title: `Quotation Registered: ${quotationId}`,
    description: `Registered version revision ${nextVersion} with total value $${totals.total}. Approval state: ${initialApprovalStatus}.`,
    customerId,
    ownerId: req.user._id
  });

  res.status(201).json(quotation);
});

export const getCustomerQuotations = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError("Customer not found.", 404);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, customer.websiteId);

  const quotes = await Quotation.find({ customerId }).sort({ quotationNumber: 1, version: -1 });
  res.json(quotes);
});

export const updateQuotationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const quotation = await Quotation.findById(id);
  if (!quotation) throw new AppError("Quotation not found.", 404);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, quotation.websiteId);

  quotation.status = status;
  await quotation.save();

  if (status === "accepted") {
    const customer = await Customer.findById(quotation.customerId);
    if (customer) {
      customer.pipelineStage = "won";
      customer.status = "customer";
      customer.isLocked = true;
      await customer.save();

      // Automatically create a default Customer Success Onboarding profile
      const { CustomerSuccess } = await import("../models/CustomerSuccess.js");
      await CustomerSuccess.findOneAndUpdate(
        { websiteId: customer.websiteId, customerId: customer._id },
        { 
          websiteId: customer.websiteId,
          customerId: customer._id,
          onboardingStatus: "pending",
          healthScore: 80, // Default baseline health
          onboardingChecklist: {
            workspaceCreated: false,
            adminInvited: false,
            usersAdded: false,
            dataImported: false,
            trainingCompleted: false,
            goLive: false
          }
        },
        { upsert: true, new: true }
      );

      // Notify purchase team
      const purchaseRecipients = await getPurchaseRecipientsForWebsite(customer.websiteId, req.user.managerId);
      await Promise.all(purchaseRecipients.map(recipient => createAndEmitCrmNotification({
        recipient, type: "purchase_request_created", title: "Deal Won", message: `${customer.name} accepted quotation.`, link: `/purchase?tab=requests`
      })));
    }
  }

  res.json(quotation);
});

export const sendQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) throw new AppError("Quotation not found.", 404);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, quotation.websiteId);

  quotation.status = "sent";
  try {
    const pdf = await generateQuotationPDF(quotation);
    if (pdf) quotation.pdfUrl = pdf.path;
  } catch (err) { console.error(err); }
  
  await quotation.save();
  res.json(quotation);
});

export const listAllQuotations = asyncHandler(async (req, res) => {
  const { websiteId } = req.query;
  if (!websiteId) throw new AppError("Website ID is required.", 400);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, websiteId);

  const quotes = await Quotation.find({ websiteId })
    .populate("customerId", "name email companyName recordType")
    .sort({ createdAt: -1 });

  res.json(quotes);
});

export const getQuotationsReports = asyncHandler(async (req, res) => {
  const { websiteId } = req.query;
  if (!websiteId) throw new AppError("Website ID is required.", 400);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, websiteId);

  res.json({ success: true, message: "Quotation reports loaded" });
});

export const createQuotationPayment = asyncHandler(async (req, res) => {
  const stripeKey = env.stripeSecretKey;
  if (!stripeKey) throw new AppError("Stripe not configured", 500);
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeKey);

  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) throw new AppError("Quotation not found.", 404);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, quotation.websiteId);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(quotation.total * 100),
    currency: (quotation.currency || 'INR').toLowerCase(),
    metadata: { quotationId: quotation.quotationId }
  });

  res.json({ clientSecret: paymentIntent.client_secret });
});

export const updateQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) throw new AppError("Quotation not found.", 404);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, quotation.websiteId);

  const items = req.body.items || quotation.items;
  const discountAmount = req.body.discountAmount !== undefined ? Number(req.body.discountAmount) : quotation.discountAmount;
  const shippingCharges = req.body.shippingCharges !== undefined ? Number(req.body.shippingCharges) : quotation.shippingCharges;
  const isInterState = req.body.isInterState !== undefined ? req.body.isInterState : (quotation.isInterState || false);

  const totals = calculateTotals({
    items,
    discountAmount,
    shippingCharges,
    isInterState
  });

  if (quotation.status === "draft") {
    // Modify in place
    const updated = await Quotation.findByIdAndUpdate(req.params.id, {
      ...req.body,
      items: totals.items,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      shippingCharges: totals.shippingCharges,
      tax: totals.tax,
      total: totals.total,
      isInterState
    }, { new: true });
    return res.json(updated);
  } else {
    // Create new version revision
    const highestVerQuote = await Quotation.findOne({ 
      websiteId: quotation.websiteId, 
      quotationNumber: quotation.quotationNumber 
    }).sort({ version: -1 });

    const nextVersion = (highestVerQuote ? highestVerQuote.version : quotation.version) + 1;
    const nextQuotationId = `${quotation.quotationNumber}-V${nextVersion}`;

    // Multi-tier discount check for new draft version
    const totalDiscountPct = (totals.discountAmount / (totals.subtotal || 1)) * 100;
    const approvalCheck = determineApprovalRole(totalDiscountPct);

    let initialStatus = "draft";
    let initialApprovalStatus = "none";

    const newVersion = await Quotation.create({
      ...quotation.toObject(),
      _id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      quotationId: nextQuotationId,
      version: nextVersion,
      items: totals.items,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      shippingCharges: totals.shippingCharges,
      tax: totals.tax,
      total: totals.total,
      isInterState,
      status: initialStatus,
      approvalStatus: initialApprovalStatus,
      approvalHistory: [],
      notes: req.body.notes !== undefined ? req.body.notes : quotation.notes,
      validUntil: req.body.validUntil !== undefined ? req.body.validUntil : quotation.validUntil
    });

    // Log Activity Timeline
    await logCrmActivity({
      websiteId: quotation.websiteId,
      type: "quotation_sent",
      title: `New Quotation Revision: ${nextQuotationId}`,
      description: `Created version revision ${nextVersion} from ${quotation.quotationId} with total value $${totals.total}.`,
      customerId: quotation.customerId,
      ownerId: req.user._id
    });

    return res.json(newVersion);
  }
});

export const deleteQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) throw new AppError("Quotation not found.", 404);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, quotation.websiteId);

  await Quotation.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export const approveQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) throw new AppError("Quotation not found.", 404);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, quotation.websiteId);

  const totalDiscountPct = (quotation.discountAmount / (quotation.subtotal || 1)) * 100;
  
  // Resolve role checks
  let nextStatus = "approved";
  let nextApprovalStatus = "approved";

  if (quotation.approvalStatus === "pending_manager" && totalDiscountPct > 20) {
    nextStatus = "pending_approval";
    nextApprovalStatus = "pending_regional_manager";
  } else if (quotation.approvalStatus === "pending_regional_manager" && totalDiscountPct > 30) {
    nextStatus = "pending_approval";
    nextApprovalStatus = "pending_director";
  }

  quotation.status = nextStatus === "approved" ? "sent" : "pending_approval";
  quotation.approvalStatus = nextApprovalStatus;
  
  quotation.approvalHistory.push({
    approverId: req.user._id,
    action: "approved",
    comments: req.body.comments || "Approved."
  });

  await quotation.save();

  // Log activity
  await logCrmActivity({
    websiteId: quotation.websiteId,
    type: "quotation_approved",
    title: `Quotation Approved: ${quotation.quotationId}`,
    description: `Escalation stage updated to "${nextApprovalStatus}".`,
    customerId: quotation.customerId,
    ownerId: req.user._id
  });

  res.json(quotation);
});

export const denyQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) throw new AppError("Quotation not found.", 404);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, quotation.websiteId);

  quotation.status = "rejected";
  quotation.approvalStatus = "rejected";
  
  quotation.approvalHistory.push({
    approverId: req.user._id,
    action: "rejected",
    comments: req.body.comments || "Rejected."
  });

  await quotation.save();

  res.json(quotation);
});
