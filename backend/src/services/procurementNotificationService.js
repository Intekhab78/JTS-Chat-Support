import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { Website } from "../models/Website.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { createNotification } from "./notificationService.js";
import { getSocketServer } from "../sockets/index.js";
import { sendEmail, getEmailTemplate } from "./emailService.js";
import { generatePurchaseOrderPDF } from "./pdfService.js";
import { Supplier } from "../models/Supplier.js";
import { env } from "../config/env.js";

/**
 * Creates a notification and emits a socket event
 */
async function notifyUser(recipientId, data, emailOptions = null) {
  const notification = await createNotification({
    recipient: recipientId,
    ...data
  });
  
  if (notification) {
    const io = getSocketServer();
    if (io) {
      io.to(`us_${recipientId}`).emit("notification:new", notification);
    }
  }

  // Handle email notification if requested
  if (emailOptions) {
    const recipientUser = await User.findById(recipientId);
    if (recipientUser && recipientUser.email) {
      await sendEmail({
        to: recipientUser.email,
        subject: emailOptions.subject || data.title,
        html: getEmailTemplate(
          emailOptions.title || data.title,
          emailOptions.message || data.message,
          emailOptions.buttonText || "View in Dashboard",
          emailOptions.buttonUrl || `${env.clientUrl}${data.link}` // Default frontend URL
        ),
        attachments: emailOptions.attachments || []
      });
    }
  }

  return notification;
}

/**
 * Check if a notification of the same type for the same entity was already sent recently
 */
async function wasRecentlyNotified(recipientId, entityId, type, cooldownHours = 24) {
  const cutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
  const existing = await Notification.exists({
    recipient: recipientId,
    type,
    entityId: String(entityId),
    createdAt: { $gte: cutoff }
  });
  return Boolean(existing);
}

/**
 * Notify managers and admins about a low stock item
 */
export async function checkAndNotifyLowStock(itemId) {
  try {
    const item = await InventoryItem.findById(itemId).populate("websiteId");
    if (!item || !item.websiteId) return;

    if (item.quantity <= item.reorderLevel) {
      const website = item.websiteId;
      const message = `Item "${item.name}" (SKU: ${item.sku}) has reached its reorder level (${item.reorderLevel}). Current quantity: ${item.quantity}.`;
      
      // Notify the manager (max once per 24h per item)
      if (website.managerId) {
        const alreadySent = await wasRecentlyNotified(website.managerId, item._id, "inventory_low_stock", 24);
        if (!alreadySent) {
          await notifyUser(website.managerId, {
            type: "inventory_low_stock",
            title: "Low Stock Alert",
            message,
            link: `/purchase?tab=procurement`,
            entityType: "inventory_item",
            entityId: String(item._id)
          });
        }
      }

      // Notify global admins (max once per 24h per item)
      const admins = await User.find({ role: "admin" }).select("_id");
      for (const admin of admins) {
        const alreadySent = await wasRecentlyNotified(admin._id, item._id, "inventory_low_stock", 24);
        if (!alreadySent) {
          await notifyUser(admin._id, {
            type: "inventory_low_stock",
            title: "Global Low Stock Alert",
            message: `[${website.websiteName}] ${message}`,
            link: `/admin?tab=crm`,
            entityType: "inventory_item",
            entityId: String(item._id)
          });
        }
      }
    }
  } catch (error) {
    console.error("Low stock notification failed:", error);
  }
}

/**
 * Notify when a PO status is updated
 */
export async function notifyOrderStatusUpdate(order, updatedByRole) {
  try {
    // If supplier shipped/delivered, notify manager/admin
    if (updatedByRole === "supplier") {
      const website = await Website.findById(order.websiteId);
      if (website && website.managerId) {
        await notifyUser(website.managerId, {
          type: order.status === "shipped" ? "procurement_order_shipped" : "procurement_order_delivered",
          title: `PO ${order.status === "shipped" ? "Shipped" : "Delivered"}`,
          message: `Purchase Order #${order.poNumber} has been marked as ${order.status} by the supplier.`,
          link: `/purchase?tab=procurement`,
          entityType: "purchase_order",
          entityId: order._id
        });
      }
    } 
    // If manager created/sent, notify supplier if applicable
    else if (["admin", "client", "manager"].includes(updatedByRole)) {
       const supplierUser = await User.findOne({ supplierId: order.supplierId });
       if (supplierUser && order.status === "sent") {
         let attachments = [];
         
         try {
           // Generate PDF attachment
           const supplier = await Supplier.findById(order.supplierId);
           const website = await Website.findById(order.websiteId);
           const pdfBuffer = await generatePurchaseOrderPDF(order, supplier, website);
           attachments.push({
             filename: `PO_${order.poNumber}.pdf`,
             content: pdfBuffer
           });
         } catch (pdfErr) {
           console.error("Failed to generate PDF for email attachment:", pdfErr);
         }

         await notifyUser(supplierUser._id, {
           type: "status_update",
           title: "New Purchase Order Received",
           message: `You have received a new Purchase Order #${order.poNumber} from ${order.websiteId?.websiteName || 'us'}.`,
           link: `/supplier?tab=orders`,
           entityType: "purchase_order",
           entityId: order._id
         }, {
           subject: `New Purchase Order: #${order.poNumber}`,
           message: `A new purchase order has been issued to your company. Please find the attached PDF for details.`,
           buttonText: "Accept Order",
           buttonUrl: `${env.clientUrl}/supplier?tab=orders`,
           attachments
         });
       }
    }
  } catch (error) {
    console.error("Order status notification failed:", error);
  }
}

/**
 * Notify when a supplier uploads an invoice
 */
export async function notifyInvoiceUploaded(order) {
  try {
    const website = await Website.findById(order.websiteId);
    if (website && website.managerId) {
      const message = `Supplier has uploaded an invoice for Purchase Order #${order.poNumber}.`;
      await notifyUser(website.managerId, {
        type: "procurement_invoice_uploaded",
        title: "Supplier Invoice Uploaded",
        message,
        link: `/purchase?tab=procurement`,
        entityType: "purchase_order",
        entityId: order._id
      }, {
        subject: `Invoice Uploaded: PO #${order.poNumber}`,
        message: `${message}<br><br>Please review the invoice and proceed with payment.`
      });
    }
  } catch (error) {
    console.error("Invoice notification failed:", error);
  }
}
