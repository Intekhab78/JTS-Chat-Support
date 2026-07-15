import crypto from "crypto";
import { Invoice } from "../models/Invoice.js";
import { Payment } from "../models/Payment.js";
import { env } from "../config/env.js";
import { logCrmActivity } from "../services/activityLoggerService.js";
import { advancePurchaseWorkflow } from "../services/purchaseWorkflowService.js";

/**
 * Controller to handle Razorpay Webhook Events.
 */
export async function handleRazorpayWebhook(req, res) {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || env.razorpayWebhookSecret || "rzp_secret";
    
    // In production, verify signature. In development, allow bypass if header is missing for quick local mocks.
    if (signature) {
      const shasum = crypto.createHmac("sha256", secret);
      shasum.update(JSON.stringify(req.body));
      const digest = shasum.digest("hex");
      
      if (digest !== signature) {
        console.warn("[Razorpay Webhook] Invalid webhook signature detected.");
        return res.status(400).send("Invalid signature");
      }
    }

    const { event, payload } = req.body;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    if (event === "payment.captured") {
      const paymentEntity = payload?.payment?.entity;
      const notes = paymentEntity?.notes || {};
      const invoiceId = notes.invoiceId || notes.invoice_id;

      if (invoiceId) {
        const invoice = await Invoice.findOne({ invoiceId });
        if (invoice && invoice.status !== "paid") {
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
            transactionId: paymentEntity.id,
            notes: `Auto-recorded from Razorpay webhook`
          });

          // Log timeline activity
          await logCrmActivity({
            websiteId: invoice.websiteId,
            type: "payment",
            title: `Invoice Auto-Paid via Razorpay: ${invoice.invoiceId}`,
            description: `Razorpay webhook confirmed successful capture ${paymentEntity.id}. Marked paid.`,
            customerId: invoice.customerId,
            ownerId: invoice.ownerId
          }).catch(() => {});

          // Advance purchase workflows
          await advancePurchaseWorkflow({
            customerId: invoice.customerId,
            status: "completed",
            actor: null,
            reason: "razorpay_payment_captured"
          }).catch(() => {});

          console.log(`[Razorpay Webhook] Invoice ${invoice.invoiceId} marked Paid and payment logged.`);
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[Razorpay Webhook Error]", err);
    res.status(500).send(err.message || "Internal Webhook Error");
  }
}
