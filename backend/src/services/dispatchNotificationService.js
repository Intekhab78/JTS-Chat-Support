import { Customer } from "../models/Customer.js";
import { WhatsAppProviderManager } from "./providers/whatsappProvider.js";
import { SMSProviderManager } from "./providers/smsProvider.js";
import { logCrmActivity } from "./activityLoggerService.js";

/**
 * Service to send instant SMS & WhatsApp notifications to customers upon Order/Invoice Dispatch.
 */

export async function sendInvoiceDispatchNotification(invoice) {
  try {
    let customer = invoice.customerId;
    if (customer && !customer.phone && typeof customer === "object" && customer._id) {
      // Already populated but might lack fields, query just in case
      customer = await Customer.findById(customer._id);
    } else if (typeof customer === "string" || (customer && customer.constructor && customer.constructor.name === "ObjectId")) {
      customer = await Customer.findById(customer);
    }

    if (!customer || !customer.phone) {
      console.log(`[Dispatch Notification] Skipping Invoice ${invoice.invoiceId} - customer phone number missing.`);
      return;
    }

    const phone = customer.phone.trim();
    const formattedAmount = `${invoice.currency || "INR"} ${invoice.total}`;
    
    // 1. WhatsApp Notification
    const waProvider = WhatsAppProviderManager.getProvider("meta");
    const waMsg = `Hello ${customer.name || "Valued Customer"}, your invoice ${invoice.invoiceId} for ${formattedAmount} has been generated and dispatched. You can view or settle it online. Thank you!`;
    await waProvider.sendMessage({ to: phone, message: waMsg }).catch(err => {
      console.error("[Dispatch Notification WhatsApp Error]", err);
    });

    // 2. SMS Notification
    const smsProvider = SMSProviderManager.getProvider("twilio");
    const smsMsg = `Dear ${customer.name || "Customer"}, Invoice ${invoice.invoiceId} of ${formattedAmount} is issued. Check details in your portal. JTS Chat Support`;
    await smsProvider.sendSMS({ to: phone, body: smsMsg }).catch(err => {
      console.error("[Dispatch Notification SMS Error]", err);
    });

    // Log activity
    await logCrmActivity({
      websiteId: invoice.websiteId,
      type: "communication",
      title: `Dispatch Alerts Dispatched (SMS/WA): ${invoice.invoiceId}`,
      description: `Dispatched SMS and WhatsApp transactional alerts to customer phone ${phone}.`,
      customerId: customer._id,
      ownerId: invoice.ownerId
    }).catch(() => {});

    console.log(`[Dispatch Notification] Sent alerts for Invoice ${invoice.invoiceId} to customer ${phone}`);
  } catch (err) {
    console.error("[Dispatch Notification Error] sendInvoiceDispatchNotification failed:", err);
  }
}

export async function sendSalesOrderDispatchNotification(order) {
  try {
    let customer = order.customerId;
    if (customer && !customer.phone && typeof customer === "object" && customer._id) {
      customer = await Customer.findById(customer._id);
    } else if (typeof customer === "string" || (customer && customer.constructor && customer.constructor.name === "ObjectId")) {
      customer = await Customer.findById(customer);
    }

    if (!customer || !customer.phone) {
      console.log(`[Dispatch Notification] Skipping Sales Order ${order.orderNumber} - customer phone number missing.`);
      return;
    }

    const phone = customer.phone.trim();

    // 1. WhatsApp Notification
    const waProvider = WhatsAppProviderManager.getProvider("meta");
    const waMsg = `Hello ${customer.name || "Customer"}, good news! Your order ${order.orderNumber} has been shipped/dispatched. Tracking details have been uploaded to your account page.`;
    await waProvider.sendMessage({ to: phone, message: waMsg }).catch(err => {
      console.error("[Dispatch Notification WhatsApp Error]", err);
    });

    // 2. SMS Notification
    const smsProvider = SMSProviderManager.getProvider("twilio");
    const smsMsg = `Dear ${customer.name || "Customer"}, Order ${order.orderNumber} has been dispatched. Track status inside your customer account. JTS Chat Support`;
    await smsProvider.sendSMS({ to: phone, body: smsMsg }).catch(err => {
      console.error("[Dispatch Notification SMS Error]", err);
    });

    // Log activity
    await logCrmActivity({
      websiteId: order.websiteId,
      type: "communication",
      title: `Order Dispatch Alerts (SMS/WA): ${order.orderNumber}`,
      description: `Dispatched order shipping updates via SMS and WhatsApp to ${phone}.`,
      customerId: customer._id,
      ownerId: order.ownerId
    }).catch(() => {});

    console.log(`[Dispatch Notification] Sent alerts for Sales Order ${order.orderNumber} to customer ${phone}`);
  } catch (err) {
    console.error("[Dispatch Notification Error] sendSalesOrderDispatchNotification failed:", err);
  }
}
