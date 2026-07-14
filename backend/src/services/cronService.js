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

  console.log("[Cron] ✅ All reminder cron jobs registered:");
  console.log("  • Every minute  → Manual CRM Reminders");
  console.log("  • Every minute  → Follow-Up Task Reminders");
  console.log("  • Daily @ 8 AM  → Invoice Overdue Reminders");
  console.log("  • Daily @ 8 AM  → Quotation Expiry Reminders");
  console.log("  • Daily @ 8 AM  → PO Delivery Reminders");
  console.log("  • Mon-Fri @ 9AM → Stale Deal Alerts");
};
