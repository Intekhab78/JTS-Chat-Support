import { Payment } from "../models/Payment.js";
import { Invoice } from "../models/Invoice.js";
import { CreditNote } from "../models/CreditNote.js";
import { Customer } from "../models/Customer.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { logCrmActivity } from "../services/activityLoggerService.js";
import { PaymentGatewayManager } from "../services/paymentGateway.js";
import { advancePurchaseWorkflow } from "../services/purchaseWorkflowService.js";

export const listPayments = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId } = req.query;

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

  const payments = await Payment.find(query)
    .populate("invoiceId", "invoiceId total")
    .sort({ paymentDate: -1 });

  res.json(payments);
});

export const createPayment = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const { websiteId, invoiceId, customerId, amount, gateway, paymentMethod, referenceNumber } = req.body;

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new AppError("Invoice not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(invoice.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const paymentNumber = `PAY-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

  // Log transaction
  const payment = await Payment.create({
    websiteId: invoice.websiteId,
    paymentNumber,
    invoiceId,
    customerId: customerId || invoice.customerId,
    amount,
    gateway: gateway || "cash",
    paymentMethod: paymentMethod || "cash",
    referenceNumber,
    status: "completed"
  });

  // Calculate allocation
  invoice.paidAmount = (invoice.paidAmount || 0) + amount;
  if (invoice.paidAmount >= invoice.total) {
    invoice.status = "paid";
  } else {
    invoice.status = "partially_paid";
  }
  await invoice.save();

  if (invoice.status === "paid") {
    try {
      // Advance purchase workflow to completed
      await advancePurchaseWorkflow({
        customerId: invoice.customerId,
        status: "completed",
        actor: req.user,
        reason: "invoice_fully_paid"
      });

      // Update customer CRM pipeline stage to won
      const customer = await Customer.findById(invoice.customerId);
      if (customer && customer.pipelineStage !== "won") {
        customer.pipelineStage = "won";
        await customer.save();

        await logCrmActivity({
          websiteId: invoice.websiteId,
          type: "lead_won",
          title: `Lead Won: ${customer.name || customer.companyName}`,
          description: `Lead transitioned to won stage because invoice ${invoice.invoiceId} was fully paid.`,
          customerId: invoice.customerId,
          ownerId: req.user._id
        });
      }
    } catch (err) {
      console.error("Failed to advance workflow/CRM stage on paid invoice:", err);
    }
  }

  // Log timeline activity
  await logCrmActivity({
    websiteId: invoice.websiteId,
    type: "payment_received",
    title: `Payment Received: ${paymentNumber}`,
    description: `Allocated $${amount} to invoice ${invoice.invoiceId}. Status: ${invoice.status}.`,
    customerId: invoice.customerId,
    ownerId: req.user._id
  });

  res.status(201).json(payment);
});

export const refundPayment = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new AppError("Payment log not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(payment.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const invoice = await Invoice.findById(payment.invoiceId);
  if (!invoice) throw new AppError("Invoice not found", 404);

  // Call Gateway Provider abstraction
  const provider = PaymentGatewayManager.getProvider(payment.gateway);
  const refundResult = await provider.refundTransaction({
    transactionId: payment.transactionId,
    amount: payment.amount
  });

  payment.status = "refunded";
  await payment.save();

  // Create Credit Note
  const creditNoteNumber = `CN-${Date.now().toString().slice(-6)}`;
  await CreditNote.create({
    websiteId: payment.websiteId,
    creditNoteNumber,
    invoiceId: payment.invoiceId,
    customerId: payment.customerId,
    amount: payment.amount,
    reason: req.body.reason || "Customer refund request",
    refundId: refundResult.refundId || `manual_ref_${Date.now()}`
  });

  invoice.paidAmount = Math.max(0, invoice.paidAmount - payment.amount);
  invoice.status = "refunded";
  await invoice.save();

  // Log to Activity Timeline
  await logCrmActivity({
    websiteId: payment.websiteId,
    type: "refund_issued",
    title: `Refund Issued: ${creditNoteNumber}`,
    description: `Refunded $${payment.amount} for payment ${payment.paymentNumber}.`,
    customerId: payment.customerId,
    ownerId: req.user._id
  });

  res.json({ success: true, payment });
});
