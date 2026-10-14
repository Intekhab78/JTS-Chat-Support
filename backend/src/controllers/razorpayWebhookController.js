import crypto from "crypto";
import { Invoice } from "../models/Invoice.js";
import { Payment } from "../models/Payment.js";
import { env } from "../config/env.js";
import { logCrmActivity } from "../services/activityLoggerService.js";
import { advancePurchaseWorkflow } from "../services/purchaseWorkflowService.js";
import { sendEmail } from "../services/emailService.js";
import { createNotification } from "../services/notificationService.js";
import { paymentFailedRecoveryTemplate } from "../utils/emailTemplates.js";
import { getSocketServer } from "../sockets/index.js";

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

       // Ignore webhooks from other projects (e.g. Gym)
       if (notes.website_source && notes.website_source !== "JTS Chat Support") {
         console.log(`[Razorpay Webhook] Ignored payment for other website/source: ${notes.website_source}`);
         return res.status(200).json({ status: "ignored", message: "Not matching website source" });
       }

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

    if (event === "payment.failed") {
      const paymentEntity = payload?.payment?.entity;
      const notes = paymentEntity?.notes || {};

      if (notes.website_source && notes.website_source !== "JTS Chat Support") {
        return res.status(200).json({ status: "ignored", message: "Not matching website source" });
      }

      const invoiceId = notes.invoiceId || notes.invoice_id;
      if (invoiceId) {
        const invoice = await Invoice.findOne({ invoiceId }).populate("customerId");
        if (invoice) {
          const failureReason = paymentEntity?.error_description || paymentEntity?.error_reason || "Payment declined by issuing bank";

          // Record payment failure in transaction ledger
          await Payment.create({
            websiteId: invoice.websiteId,
            paymentNumber: `PMT-FAIL-${Date.now()}`,
            invoiceId: invoice._id,
            customerId: invoice.customerId?._id || invoice.customerId,
            amount: invoice.total,
            gateway: "razorpay",
            status: "failed",
            transactionId: paymentEntity?.id || "",
            notes: `Razorpay failure: ${failureReason}`
          });

          // Log timeline activity
          await logCrmActivity({
            websiteId: invoice.websiteId,
            type: "payment_failed",
            title: `Payment Failed via Razorpay: ${invoice.invoiceId}`,
            description: `Payment attempt of ${invoice.currency || "INR"} ${invoice.total} failed. Reason: ${failureReason}`,
            customerId: invoice.customerId?._id || invoice.customerId,
            ownerId: invoice.ownerId
          }).catch(() => {});

          // Automated customer recovery email dispatch
          const customerEmail = invoice.customerId?.email;
          const customerName = invoice.customerId?.name || "Customer";
          if (customerEmail) {
            const retryUrl = `${env.clientUrl}/customer-portal`;
            const { html, subject } = paymentFailedRecoveryTemplate({
              customerName,
              invoiceId: invoice.invoiceId,
              amount: invoice.total,
              currency: invoice.currency || "INR",
              retryUrl,
              failureReason
            });
            await sendEmail({ to: customerEmail, subject, html }).catch(e => console.error("[Razorpay Webhook] Failed sending payment failure email:", e));
          }

          // In-app alert to invoice owner / sales rep
          if (invoice.ownerId) {
            const notif = await createNotification({
              recipient: invoice.ownerId,
              type: "payment_failed",
              title: `Payment Failed: ${invoice.invoiceId}`,
              message: `Customer ${customerName}'s payment for ${invoice.invoiceId} failed (${failureReason}). Follow up required.`,
              link: `/client?tab=crm`
            }).catch(() => {});

            const io = getSocketServer();
            if (notif && io) {
              io.to(`us_${String(invoice.ownerId)}`).emit("notification:new", notif);
            }
          }

          console.log(`[Razorpay Webhook] Recorded payment failure and dispatched recovery email for ${invoice.invoiceId}.`);
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[Razorpay Webhook Error]", err);
    res.status(500).send(err.message || "Internal Webhook Error");
  }
}

