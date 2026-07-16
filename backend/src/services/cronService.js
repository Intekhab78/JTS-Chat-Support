import cron from "node-cron";
import {
  checkAndDispatchReminders,
  checkFollowUpTaskReminders,
  checkInvoiceOverdueReminders,
  checkQuotationExpiryReminders,
  checkPODeliveryReminders,
  checkStaleDealReminders,
  checkSubscriptionRenewalReminders
} from "./reminderSchedulerService.js";
import { User } from "../models/User.js";
import { sendEmail, getEmailTemplate } from "./emailService.js";

export const startCronJobs = () => {

  // ──────────────────────────────────────────────────────────────────────────
  // EVERY MINUTE: Time-sensitive reminder checks
  // ──────────────────────────────────────────────────────────────────────────

  // 1. Manual CRM Reminders (set by user with specific remindAt time)
  cron.schedule("*/1 * * * *", () => {
    checkAndDispatchReminders();
  });

  // 2. Follow-Up Task Reminders (reminderAt field on FollowUpTask)
  cron.schedule("*/1 * * * *", () => {
    checkFollowUpTaskReminders();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // DAILY at 8:00 AM: Date-based business reminders
  // ──────────────────────────────────────────────────────────────────────────

  // 3. Invoice Overdue Reminders — finds invoices past dueDate & not paid
  cron.schedule("0 8 * * *", () => {
    console.log("[Cron] Running Invoice Overdue Reminder check...");
    checkInvoiceOverdueReminders();
  });

  // 4. Quotation Expiry Reminders — fires 2 days before validUntil
  cron.schedule("0 8 * * *", () => {
    console.log("[Cron] Running Quotation Expiry Reminder check...");
    checkQuotationExpiryReminders();
  });

  // 5. Purchase Order Delivery Reminders — fires 1 day before expectedDeliveryDate
  cron.schedule("0 8 * * *", () => {
    console.log("[Cron] Running PO Delivery Reminder check...");
    checkPODeliveryReminders();
  });

  // 6. Stale Deal Reminders — fires for deals with 7+ days no activity (Mon-Fri only)
  cron.schedule("0 9 * * 1-5", () => {
    console.log("[Cron] Running Stale Deal Reminder check...");
    checkStaleDealReminders();
  });

  // 7. Subscription Renewal Reminders — fires daily at 8:00 AM (3 days before endDate)
  cron.schedule("0 8 * * *", () => {
    console.log("[Cron] Running Subscription Renewal/Expiry Reminder check...");
    checkSubscriptionRenewalReminders();
  });

  // 8. JTS Workspace Expiry Reminders — fires daily at 8:00 AM (7 days before expiresAt)
  cron.schedule("0 8 * * *", () => {
    console.log("[Cron] Running JTS Workspace Expiry Reminder check...");
    checkWorkspaceSubscriptionExpirations();
  });

  console.log("[Cron] ✅ All reminder cron jobs registered:");
  console.log("  • Every minute  → Manual CRM Reminders");
  console.log("  • Every minute  → Follow-Up Task Reminders");
  console.log("  • Daily @ 8 AM  → Invoice Overdue Reminders");
  console.log("  • Daily @ 8 AM  → Quotation Expiry Reminders");
  console.log("  • Daily @ 8 AM  → PO Delivery Reminders");
  console.log("  • Mon-Fri @ 9AM → Stale Deal Alerts");
  console.log("  • Daily @ 8 AM  → JTS Workspace Expiry Alerts");
};

export async function checkWorkspaceSubscriptionExpirations() {
  console.log("[Cron] Checking JTS Workspace Subscriptions expiring in 7 days...");
  try {
    const today = new Date();
    
    // 7 days from now
    const targetDateStart = new Date();
    targetDateStart.setDate(today.getDate() + 7);
    targetDateStart.setHours(0, 0, 0, 0);

    const targetDateEnd = new Date();
    targetDateEnd.setDate(today.getDate() + 7);
    targetDateEnd.setHours(23, 59, 59, 999);

    // Find users with subscription.expiresAt expiring exactly 7 days from now
    const users = await User.find({
      "subscription.expiresAt": {
        $gte: targetDateStart,
        $lte: targetDateEnd
      },
      role: { $in: ["client", "manager"] }
    });

    console.log(`[Cron] Found ${users.length} workspaces expiring in exactly 7 days.`);

    for (const u of users) {
      const emailHtml = getEmailTemplate(
        "Subscription Expiring Soon",
        `Hi ${u.name},<br/><br/>Your JTS Chat Support subscription for plan <strong>${u.subscription.plan.toUpperCase()}</strong> is expiring in exactly 7 days on <strong>${new Date(u.subscription.expiresAt).toLocaleDateString()}</strong>.<br/><br/>Please renew your subscription to maintain uninterrupted access to all of JTS platform features.`,
        "Renew Subscription Now",
        `${process.env.CLIENT_URL || "http://localhost:5173"}/client?tab=billing`
      );

      await sendEmail({
        to: u.email,
        subject: "Action Required: Your JTS Subscription Expires in 7 Days",
        html: emailHtml
      });
      
      console.log(`[Cron] Sent 7-day subscription expiration reminder to ${u.email}`);
    }
  } catch (err) {
    console.error("[Cron] Error during checkWorkspaceSubscriptionExpirations:", err);
  }
}
