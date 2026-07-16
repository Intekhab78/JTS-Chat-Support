import { Invoice } from "../models/Invoice.js";
import { Customer } from "../models/Customer.js";
import { Quotation } from "../models/Quotation.js";
import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { createActivityEvent } from "../services/activityService.js";
import { advancePurchaseWorkflow } from "../services/purchaseWorkflowService.js";
import { assertSameWebsite, buildInvoiceTenantFilter, toWebsiteIdStrings } from "../utils/invoiceAccess.js";
import { logCrmActivity } from "../services/activityLoggerService.js";
import { sendInvoiceDispatchNotification } from "../services/dispatchNotificationService.js";
import { applyTaxToInvoice } from "../utils/taxCalculator.js";
import { Payment } from "../models/Payment.js";
import { env } from "../config/env.js";
import crypto from "crypto";
import Razorpay from "razorpay";

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
  const billingAddress = req.body.billingAddress || {};
  
  const taxApplied = applyTaxToInvoice({
    items: items || [],
    billingAddress,
    discountAmount: req.body.discountAmount || 0,
    shippingCharges: req.body.shippingCharges || 0,
    adjustment: req.body.adjustment || 0
  });

  const invoice = await Invoice.create({
    invoiceId, quotationId, customerId, websiteId: resolvedWebsiteId, ownerId: req.user._id,
    items: taxApplied.items,
    subtotal: taxApplied.subtotal,
    tax: taxApplied.tax,
    total: taxApplied.total,
    discountAmount: req.body.discountAmount || 0,
    shippingCharges: req.body.shippingCharges || 0,
    adjustment: req.body.adjustment || 0,
    currency: currency || "INR",
    status: status || "pending",
    issuedAt: new Date(),
    notes,
    billingAddress,
    shippingAddress: req.body.shippingAddress || {}
  });

  if (quotationId) {
    try {
      const isOid = mongoose.isValidObjectId(quotationId);
      const query = isOid ? { _id: quotationId } : { quotationId };
      const quote = await Quotation.findOne(query);
      if (quote) {
        quote.status = "converted";
        quote.invoiceId = invoice._id;
        quote.invoiceNumber = invoiceId;
        await quote.save();
      }
    } catch (err) {
      console.error("Failed to link quotation to invoice:", err);
    }
  }

  await logCrmActivity({
    websiteId: resolvedWebsiteId,
    type: "invoice_created",
    title: `Invoice Created: ${invoiceId}`,
    description: `Invoice issued with total value $${invoice.total}.`,
    customerId,
    ownerId: req.user._id
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

  if (invoice.status !== "draft") {
    sendInvoiceDispatchNotification(invoice).catch(err => console.error(err));
  }

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

  let updateData = { ...req.body };
  if (req.body.items || req.body.billingAddress) {
    const currentInvoice = await Invoice.findOne(buildInvoiceTenantFilter(req.params.id, ownedWebsiteIds));
    if (currentInvoice) {
      const mergedInvoiceData = {
        items: req.body.items || currentInvoice.items,
        billingAddress: req.body.billingAddress || currentInvoice.billingAddress,
        discountAmount: req.body.discountAmount !== undefined ? req.body.discountAmount : currentInvoice.discountAmount,
        shippingCharges: req.body.shippingCharges !== undefined ? req.body.shippingCharges : currentInvoice.shippingCharges,
        adjustment: req.body.adjustment !== undefined ? req.body.adjustment : currentInvoice.adjustment
      };
      const taxApplied = applyTaxToInvoice(mergedInvoiceData);
      Object.assign(updateData, taxApplied);
    }
  }

  const updatedInvoice = await Invoice.findOneAndUpdate(
    buildInvoiceTenantFilter(req.params.id, ownedWebsiteIds),
    updateData,
    { new: true }
  );

  if (!updatedInvoice) throw new AppError("Access denied", 403);

  if (invoice.status !== updatedInvoice.status) {
    await logCrmActivity({
      websiteId: updatedInvoice.websiteId,
      type: "status_changed",
      title: `Invoice Status Shifted: ${updatedInvoice.invoiceId}`,
      description: `Invoice status progressed from "${invoice.status}" to "${updatedInvoice.status}".`,
      customerId: updatedInvoice.customerId,
      ownerId: req.user._id
    });
  }

  await advancePurchaseWorkflow({
    customerId: updatedInvoice.customerId,
    status: updatedInvoice.status === "paid" ? "completed" : "invoice_ready",
    actor: req.user,
    reason: updatedInvoice.status === "paid" ? "invoice_marked_paid" : "invoice_updated"
  });

  if (invoice.status !== updatedInvoice.status && ["sent", "pending", "paid"].includes(updatedInvoice.status)) {
    sendInvoiceDispatchNotification(updatedInvoice).catch(err => console.error(err));
  }

  res.json(updatedInvoice);
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const { ownedWebsiteIds } = await findAuthorizedInvoice(req, req.params.id);
  await Invoice.findOneAndDelete(buildInvoiceTenantFilter(req.params.id, ownedWebsiteIds));
  res.json({ success: true });
});

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { invoice } = await findAuthorizedInvoice(req, req.params.id);

  if (invoice.status === "paid") {
    throw new AppError("Invoice is already paid", 400);
  }

  const keyId = env.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = env.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new AppError("Razorpay keys are not configured in system settings.", 500);
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });

  const amountInPaise = Math.round(invoice.total * 100);
  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: invoice.currency || "INR",
    receipt: invoice.invoiceId,
    notes: {
      website_source: "JTS Chat Support",
      invoiceId: invoice.invoiceId
    }
  });

  res.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: keyId
  });
});

export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const { invoice } = await findAuthorizedInvoice(req, req.params.id);

  const keySecret = env.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new AppError("Razorpay API Configuration missing.", 500);
  }

  // Validate signature
  const hmac = crypto.createHmac("sha256", keySecret);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generatedSignature = hmac.digest("hex");

  if (generatedSignature !== razorpay_signature) {
    throw new AppError("Payment verification failed. Signature mismatch.", 400);
  }

  // Update invoice if not already paid
  if (invoice.status !== "paid") {
    invoice.status = "paid";
    invoice.paidAmount = invoice.total;
    await invoice.save();

    // Create payment record
    await Payment.create({
      websiteId: invoice.websiteId,
      paymentNumber: `PMT-${Date.now()}`,
      invoiceId: invoice._id,
      customerId: invoice.customerId,
      amount: invoice.total,
      gateway: "razorpay",
      status: "completed",
      transactionId: razorpay_payment_id,
      notes: `Verified from frontend checkout signature`
    });

    // Log timeline activity
    await logCrmActivity({
      websiteId: invoice.websiteId,
      type: "payment",
      title: `Invoice Paid via Razorpay: ${invoice.invoiceId}`,
      description: `Razorpay payment ${razorpay_payment_id} verified. Marked paid.`,
      customerId: invoice.customerId,
      ownerId: invoice.ownerId
    }).catch(() => {});

    // Advance purchase workflows
    await advancePurchaseWorkflow({
      customerId: invoice.customerId,
      status: "completed",
      actor: null,
      reason: "razorpay_payment_verified"
    }).catch(() => {});
  }

  res.json({ success: true, message: "Payment verified and recorded." });
});
