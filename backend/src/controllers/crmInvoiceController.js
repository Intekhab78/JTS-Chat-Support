import { Invoice } from "../models/Invoice.js";
import { Customer } from "../models/Customer.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { createActivityEvent } from "../services/activityService.js";
import { advancePurchaseWorkflow } from "../services/purchaseWorkflowService.js";
import { assertSameWebsite, buildInvoiceTenantFilter, toWebsiteIdStrings } from "../utils/invoiceAccess.js";

async function resolveOwnedWebsiteIds(req) {
  return req.ownedWebsiteIds || await getOwnedWebsiteIds(req.user);
}

async function findAuthorizedCustomer(customerId, websiteId, ownedWebsiteIds) {
  const customer = await Customer.findOne({
    _id: customerId,
    websiteId: { $in: ownedWebsiteIds }
  }).select("websiteId");

  if (!customer) {
    throw new AppError("Access denied", 403);
  }

  assertSameWebsite(customer.websiteId, websiteId, "Customer does not belong to this invoice website.");
  return customer;
}

async function findAuthorizedInvoice(req, invoiceId) {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const invoice = await Invoice.findOne(buildInvoiceTenantFilter(invoiceId, ownedWebsiteIds));

  if (!invoice) {
    throw new AppError("Access denied", 403);
  }

  await findAuthorizedCustomer(invoice.customerId, invoice.websiteId, ownedWebsiteIds);
  return { invoice, ownedWebsiteIds };
}

export const listAllInvoices = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const invoices = await Invoice.find({ websiteId: { $in: ownedWebsiteIds } })
    .populate("customerId", "name websiteId")
    .sort({ issuedAt: -1 });

  const authorizedInvoices = invoices.filter((invoice) => {
    const customerWebsiteId = invoice.customerId?.websiteId;
    return customerWebsiteId && String(customerWebsiteId) === String(invoice.websiteId);
  });

  res.json(authorizedInvoices);
});

export const getCustomerInvoices = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const customerId = req.params.customerId || req.params.id;
  const customer = await Customer.findOne({
    _id: customerId,
    websiteId: { $in: ownedWebsiteIds }
  }).select("websiteId");

  if (!customer) {
    throw new AppError("Access denied", 403);
  }

  const invoices = await Invoice.find({
    customerId,
    websiteId: customer.websiteId
  }).sort({ issuedAt: -1 });

  res.json(invoices);
});

export const createInvoice = asyncHandler(async (req, res) => {
  const { customerId, websiteId, items, total, currency, notes, quotationId, status } = req.body;
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const customer = await Customer.findOne({
    _id: customerId,
    websiteId: { $in: ownedWebsiteIds }
  }).select("websiteId");

  if (!customer) {
    throw new AppError("Access denied", 403);
  }

  const resolvedWebsiteId = websiteId || customer.websiteId;

  if (!resolvedWebsiteId || !toWebsiteIdStrings(ownedWebsiteIds).includes(String(resolvedWebsiteId))) {
    throw new AppError("Access denied", 403);
  }

  assertSameWebsite(customer.websiteId, resolvedWebsiteId, "Customer does not belong to this invoice website.");

  const invoiceId = `INV-${Date.now().toString().slice(-6)}`;
  const invoice = await Invoice.create({
    invoiceId, quotationId, customerId, websiteId: resolvedWebsiteId, ownerId: req.user._id,
    items: items || [], total: total || 0, currency: currency || "INR", status: status || "pending", issuedAt: new Date(), notes
  });

  await createActivityEvent({
    actor: req.user, websiteId: resolvedWebsiteId, entityType: "customer", entityId: customerId,
    type: "invoice_created", summary: `Invoice ${invoiceId} created`, metadata: { total }
  });

  await advancePurchaseWorkflow({
    customerId,
    status: invoice.status === "paid" ? "completed" : "invoice_ready",
    actor: req.user,
    reason: invoice.status === "paid" ? "paid_invoice_created" : "invoice_created"
  });

  res.status(201).json(invoice);
});

export const generateInvoicePdf = asyncHandler(async (req, res) => {
  const { invoice } = await findAuthorizedInvoice(req, req.params.id);
  const { generateInvoicePDF } = await import("../services/pdfService.js");
  const pdfResult = await generateInvoicePDF(invoice);
  if (pdfResult) {
    invoice.pdfUrl = pdfResult.path;
    await invoice.save();
  }
  res.json(invoice);
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const { invoice, ownedWebsiteIds } = await findAuthorizedInvoice(req, req.params.id);
  const nextCustomerId = req.body.customerId || invoice.customerId;
  const nextWebsiteId = req.body.websiteId || invoice.websiteId;

  await findAuthorizedCustomer(nextCustomerId, nextWebsiteId, ownedWebsiteIds);

  const updatedInvoice = await Invoice.findOneAndUpdate(
    buildInvoiceTenantFilter(req.params.id, ownedWebsiteIds),
    req.body,
    { new: true }
  );

  if (!updatedInvoice) throw new AppError("Access denied", 403);

  await advancePurchaseWorkflow({
    customerId: updatedInvoice.customerId,
    status: updatedInvoice.status === "paid" ? "completed" : "invoice_ready",
    actor: req.user,
    reason: updatedInvoice.status === "paid" ? "invoice_marked_paid" : "invoice_updated"
  });

  res.json(updatedInvoice);
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const { ownedWebsiteIds } = await findAuthorizedInvoice(req, req.params.id);
  await Invoice.findOneAndDelete(buildInvoiceTenantFilter(req.params.id, ownedWebsiteIds));
  res.json({ success: true });
});
