import { Invoice } from "../models/Invoice.js";
import { Customer } from "../models/Customer.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { createActivityEvent } from "../services/activityService.js";
import { advancePurchaseWorkflow } from "../services/purchaseWorkflowService.js";

export const listAllInvoices = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const invoices = await Invoice.find({ websiteId: { $in: ownedWebsiteIds } })
    .populate("customerId", "name")
    .sort({ issuedAt: -1 });
  res.json(invoices);
});

export const getCustomerInvoices = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const customerId = req.params.customerId || req.params.id;
  const customer = await Customer.findById(customerId).select("websiteId");
  if (!customer || !ownedWebsiteIds.map(String).includes(String(customer.websiteId))) {
    throw new AppError("Access denied", 403);
  }
  const invoices = await Invoice.find({ customerId }).sort({ issuedAt: -1 });
  res.json(invoices);
});

export const createInvoice = asyncHandler(async (req, res) => {
  const { customerId, websiteId, items, total, currency, notes, quotationId, status } = req.body;
  const invoiceId = `INV-${Date.now().toString().slice(-6)}`;
  const invoice = await Invoice.create({
    invoiceId, quotationId, customerId, websiteId, ownerId: req.user._id,
    items: items || [], total: total || 0, currency: currency || "INR", status: status || "pending", issuedAt: new Date(), notes
  });

  await createActivityEvent({
    actor: req.user, websiteId, entityType: "customer", entityId: customerId,
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
  const invoice = await Invoice.findById(req.params.id);
  const { generateInvoicePDF } = await import("../services/pdfService.js");
  const pdfResult = await generateInvoicePDF(invoice);
  if (pdfResult) {
    invoice.pdfUrl = pdfResult.path;
    await invoice.save();
  }
  res.json(invoice);
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!invoice) throw new AppError("Invoice not found", 404);
  await advancePurchaseWorkflow({
    customerId: invoice.customerId,
    status: invoice.status === "paid" ? "completed" : "invoice_ready",
    actor: req.user,
    reason: invoice.status === "paid" ? "invoice_marked_paid" : "invoice_updated"
  });
  res.json(invoice);
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  await Invoice.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});
