import { Reminder } from "../models/Reminder.js";
import { FollowUpTask } from "../models/FollowUpTask.js";
import { Invoice } from "../models/Invoice.js";
import { Quotation } from "../models/Quotation.js";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Customer } from "../models/Customer.js";
import { User } from "../models/User.js";
import { createNotification } from "./notificationService.js";
import { sendEmail } from "./emailService.js";
import { getSocketServer } from "../sockets/index.js";
import {
  invoiceOverdueTemplate,
  followUpTaskReminderTemplate,
  quotationExpiryTemplate,
  poDeliveryReminderTemplate,
  dealStaleTemplate
} from "../utils/emailTemplates.js";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:5173";

// ─── Helper ──────────────────────────────────────────────────────────────────
function daysBetween(dateA, dateB) {
  return Math.floor((dateB - dateA) / (1000 * 60 * 60 * 24));
}

function emitSocket(userId, payload) {
  try {
    const io = getSocketServer();
    if (io && userId) io.to(`us_${userId}`).emit("notification:new", payload);
  } catch (_) {}
}

// ─── 1. Manual CRM Reminders (Reminder model, every minute) ──────────────────
export const checkAndDispatchReminders = async () => {
  try {
    const now = new Date();
    const pending = await Reminder.find({
      remindAt: { $lte: now },
      isSent: { $ne: true }
    }).populate("ownerId").populate("customerId");

    for (const reminder of pending) {
      reminder.isSent = true;
      reminder.sentAt = new Date();
      await reminder.save();

      console.log(`[Reminder] Manual CRM → "${reminder.title}" → ${reminder.ownerId?.email}`);

      if (reminder.ownerId) {
        await createNotification({
          userId: reminder.ownerId._id,
          websiteId: reminder.websiteId,
          type: "alert",
          title: `Reminder: ${reminder.title}`,
          content: `You have an upcoming ${reminder.type} event.`
        }).catch(() => {});
      }

      if (reminder.ownerId?.email) {
        await sendEmail({
          to: reminder.ownerId.email,
          subject: `🔔 Reminder: ${reminder.title}`,
          html: `<p>This is a reminder for: <strong>${reminder.title}</strong><br>Scheduled: ${reminder.remindAt.toLocaleString()}</p>`
        }).catch(() => {});
      }

      emitSocket(reminder.ownerId?._id, {
        title: `Reminder: ${reminder.title}`,
        content: `Scheduled ${reminder.type} upcoming.`,
        createdAt: new Date()
      });
    }
  } catch (err) {
    console.error("[Reminder Error] Manual CRM reminders:", err.message);
  }
};

// ─── 2. Follow-Up Task Reminders (every minute) ───────────────────────────────
export const checkFollowUpTaskReminders = async () => {
  try {
    const now = new Date();
    const tasks = await FollowUpTask.find({
      reminderAt: { $lte: now },
      reminderSent: false,
      status: { $in: ["open", "in_progress"] }
    }).populate("ownerId").populate("customerId");

    for (const task of tasks) {
      task.reminderSent = true;
      await task.save();

      const owner = task.ownerId;
      const customer = task.customerId;
      const ownerName = owner?.name || "Team";
      const customerName = customer?.name || customer?.companyName || "—";

      console.log(`[Reminder] FollowUpTask → "${task.title}" → ${owner?.email}`);

      if (owner) {
        await createNotification({
          userId: owner._id,
          websiteId: task.websiteId,
          type: "alert",
          title: `Task Reminder: ${task.title}`,
          content: `Your task for ${customerName} is due soon.`
        }).catch(() => {});
      }

      if (owner?.email) {
        const { html, subject } = followUpTaskReminderTemplate({
          ownerName,
          taskTitle: task.title,
          customerName,
          dueDate: task.dueAt,
          priority: task.priority,
          notes: task.notes,
          dashboardUrl: `${DASHBOARD_URL}/crm`
        });
        await sendEmail({ to: owner.email, subject, html }).catch(() => {});
      }

      emitSocket(owner?._id, {
        title: `Task Reminder: ${task.title}`,
        content: `Due soon for ${customerName}.`,
        createdAt: new Date()
      });
    }
  } catch (err) {
    console.error("[Reminder Error] FollowUpTask reminders:", err.message);
  }
};

// ─── 3. Invoice Overdue Reminders (daily) ────────────────────────────────────
export const checkInvoiceOverdueReminders = async () => {
  try {
    const now = new Date();
    // Find invoices past dueDate, not paid, reminder not yet sent
    const overdueInvoices = await Invoice.find({
      dueDate: { $lt: now },
      status: { $nin: ["paid", "cancelled", "void", "refunded"] },
      reminderSent: false
    }).populate("ownerId").populate("customerId");

    for (const invoice of overdueInvoices) {
      invoice.reminderSent = true;
      // Also mark status as overdue
      if (invoice.status !== "overdue") invoice.status = "overdue";
      await invoice.save();

      const owner = invoice.ownerId;
      const customer = invoice.customerId;
      const ownerName = owner?.name || "Team";
      const customerName = customer?.name || customer?.companyName || "Customer";
      const daysOverdue = daysBetween(invoice.dueDate, now);

      console.log(`[Reminder] Invoice Overdue → ${invoice.invoiceId} → ${owner?.email} (${daysOverdue} days)`);

      if (owner) {
        await createNotification({
          userId: owner._id,
          websiteId: invoice.websiteId,
          type: "alert",
          title: `Invoice Overdue: ${invoice.invoiceId}`,
          content: `${customerName} has not paid Invoice ${invoice.invoiceId}. ${daysOverdue} day(s) overdue.`
        }).catch(() => {});
      }

      if (owner?.email) {
        const { html, subject } = invoiceOverdueTemplate({
          ownerName,
          customerName,
          invoiceId: invoice.invoiceId,
          total: invoice.total,
          currency: invoice.currency || "INR",
          dueDate: invoice.dueDate,
          daysOverdue,
          dashboardUrl: `${DASHBOARD_URL}/invoices`
        });
        await sendEmail({ to: owner.email, subject, html }).catch(() => {});
      }

      emitSocket(owner?._id, {
        title: `Invoice Overdue: ${invoice.invoiceId}`,
        content: `${daysOverdue} day(s) overdue from ${customerName}.`,
        createdAt: new Date()
      });
    }
  } catch (err) {
    console.error("[Reminder Error] Invoice overdue reminders:", err.message);
  }
};

// ─── 4. Quotation Expiry Reminders (daily — fires 2 days before expiry) ──────
export const checkQuotationExpiryReminders = async () => {
  try {
    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Quotations expiring within the next 2 days, not yet converted/expired/accepted
    const expiringQuotes = await Quotation.find({
      validUntil: { $gte: now, $lte: twoDaysLater },
      status: { $in: ["sent", "viewed"] }
    }).populate("ownerId").populate("customerId");

    for (const quote of expiringQuotes) {
      const owner = quote.ownerId;
      const customer = quote.customerId;
      const ownerName = owner?.name || "Team";
      const customerName = customer?.name || customer?.companyName || "Customer";
      const daysLeft = daysBetween(now, quote.validUntil);

      console.log(`[Reminder] Quotation Expiry → ${quote.quotationId} → ${owner?.email} (${daysLeft} days)`);

      if (owner) {
        await createNotification({
          userId: owner._id,
          websiteId: quote.websiteId,
          type: "alert",
          title: `Quotation Expiring: ${quote.quotationId}`,
          content: `Quotation for ${customerName} expires in ${daysLeft} day(s).`
        }).catch(() => {});
      }

      if (owner?.email) {
        const { html, subject } = quotationExpiryTemplate({
          ownerName,
          customerName,
          quotationId: quote.quotationId,
          total: quote.total,
          currency: quote.currency || "INR",
          validUntil: quote.validUntil,
          daysLeft,
          dashboardUrl: `${DASHBOARD_URL}/crm`
        });
        await sendEmail({ to: owner.email, subject, html }).catch(() => {});
      }

      emitSocket(owner?._id, {
        title: `Quotation Expiring: ${quote.quotationId}`,
        content: `Expires in ${daysLeft} day(s) for ${customerName}.`,
        createdAt: new Date()
      });
    }
  } catch (err) {
    console.error("[Reminder Error] Quotation expiry reminders:", err.message);
  }
};

// ─── 5. Purchase Order Delivery Reminders (daily — fires 1 day before) ───────
export const checkPODeliveryReminders = async () => {
  try {
    const now = new Date();
    const tomorrowStart = new Date(now);
    tomorrowStart.setHours(0, 0, 0, 0);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const pendingPOs = await PurchaseOrder.find({
      expectedDeliveryDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
      status: { $nin: ["delivered", "cancelled"] }
    }).populate("createdBy").populate("supplierId");

    for (const po of pendingPOs) {
      const owner = po.createdBy;
      const supplier = po.supplierId;
      const ownerName = owner?.name || "Team";
      const supplierName = supplier?.companyName || supplier?.contactPerson || "Supplier";
      const daysLeft = daysBetween(now, po.expectedDeliveryDate);

      console.log(`[Reminder] PO Delivery → ${po.poNumber} → ${owner?.email} (due in ${daysLeft} day)`);

      if (owner) {
        await createNotification({
          userId: owner._id,
          websiteId: po.websiteId,
          type: "alert",
          title: `PO Delivery Tomorrow: ${po.poNumber}`,
          content: `Purchase Order ${po.poNumber} from ${supplierName} is expected tomorrow.`
        }).catch(() => {});
      }

      if (owner?.email) {
        const { html, subject } = poDeliveryReminderTemplate({
          ownerName,
          poNumber: po.poNumber,
          supplierName,
          expectedDeliveryDate: po.expectedDeliveryDate,
          total: po.total,
          currency: po.currency || "INR",
          daysLeft,
          dashboardUrl: `${DASHBOARD_URL}/purchase`
        });
        await sendEmail({ to: owner.email, subject, html }).catch(() => {});
      }

      emitSocket(owner?._id, {
        title: `PO Delivery Tomorrow: ${po.poNumber}`,
        content: `From ${supplierName} — prepare to receive.`,
        createdAt: new Date()
      });
    }
  } catch (err) {
    console.error("[Reminder Error] PO delivery reminders:", err.message);
  }
};

// ─── 6. Stale Deal Reminders (daily — fires if deal idle for 7+ days) ────────
export const checkStaleDealReminders = async () => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find active CRM customers not updated in 7+ days (active pipeline deals)
    const staleCustomers = await Customer.find({
      updatedAt: { $lte: sevenDaysAgo },
      pipelineStage: { $nin: ["won", "lost"] },
      archivedAt: null
    }).populate("ownerId");

    for (const customer of staleCustomers) {
      const owner = customer.ownerId;
      if (!owner?.email) continue;

      const ownerName = owner.name || "Team";
      const customerName = customer.name || "Customer";
      const companyName = customer.companyName || "";
      const lastActivityDaysAgo = daysBetween(customer.updatedAt, now);
      const stageName = customer.pipelineStage || "Active";

      console.log(`[Reminder] Stale Deal → ${companyName || customerName} → ${owner.email} (${lastActivityDaysAgo} days)`);

      await createNotification({
        userId: owner._id,
        websiteId: customer.websiteId,
        type: "alert",
        title: `Stale Deal: ${companyName || customerName}`,
        content: `No activity for ${lastActivityDaysAgo} days. Follow up now!`
      }).catch(() => {});

      const { html, subject } = dealStaleTemplate({
        ownerName,
        customerName,
        companyName,
        stageName,
        lastActivityDaysAgo,
        leadValue: customer.leadValue,
        currency: customer.currency || "INR",
        dashboardUrl: `${DASHBOARD_URL}/crm`
      });
      await sendEmail({ to: owner.email, subject, html }).catch(() => {});

      emitSocket(owner._id, {
        title: `Stale Deal: ${companyName || customerName}`,
        content: `Idle for ${lastActivityDaysAgo} days — action needed.`,
        createdAt: new Date()
      });
    }
  } catch (err) {
    console.error("[Reminder Error] Stale deal reminders:", err.message);
  }
};
