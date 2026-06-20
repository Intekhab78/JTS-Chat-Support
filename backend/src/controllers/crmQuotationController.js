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

export const createQuotation = asyncHandler(async (req, res) => {
  const { customerId, websiteId, items, subtotal, tax, total, currency, notes, terms, validUntil } = req.body;
  if (!customerId || !websiteId || !items || !total) throw new AppError("Missing required fields.", 400);

  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError("Customer not found.", 404);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, websiteId);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, customer.websiteId);
  if (String(customer.websiteId) !== String(websiteId)) {
    throw new AppError("Customer does not belong to this website.", 400);
  }

  const isManager = ["admin", "client", "manager"].includes(req.user.role);
  const requiresApproval = total > 50000 && !isManager;
  const status = requiresApproval ? "pending_approval" : "sent";
  const quotationId = `QT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

  const quotation = await Quotation.create({
    quotationId, customerId, websiteId, ownerId: req.user._id, items, subtotal, tax, total,
    currency: currency || "INR", notes, terms, status,
    validUntil: validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
  });

  if (requiresApproval && req.user.managerId) {
    await createAndEmitCrmNotification({
      recipient: req.user.managerId, type: "crm_approval_required",
      title: "Deal Approval Required", message: `Quotation ${formatCurrency(total)} requires authorization.`, link: `/client?tab=crm&leadId=${customerId}`
    });
  }

  await advancePurchaseWorkflow({
    customerId,
    status: "quotation_ready",
    actor: req.user,
    reason: "quotation_created"
  });

  res.status(201).json(quotation);
});

export const getCustomerQuotations = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError("Customer not found.", 404);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, customer.websiteId);

  const quotes = await Quotation.find({ customerId }).sort({ createdAt: -1 });
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
  await advancePurchaseWorkflow({
    customerId: quotation.customerId,
    status: "quotation_ready",
    actor: req.user,
    reason: "quotation_sent"
  });
  res.json(quotation);
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

  const updated = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
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

  quotation.status = "sent";
  await quotation.save();
  await advancePurchaseWorkflow({
    customerId: quotation.customerId,
    status: "quotation_ready",
    actor: req.user,
    reason: "quotation_approved"
  });
  res.json(quotation);
});

export const denyQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) throw new AppError("Quotation not found.", 404);
  assertWebsiteAccess(req.user, req.ownedWebsiteIds, quotation.websiteId);

  quotation.status = "denied";
  await quotation.save();
  res.json(quotation);
});
