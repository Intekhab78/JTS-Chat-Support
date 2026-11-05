import { Subscription } from "../models/Subscription.js";
import { Invoice } from "../models/Invoice.js";
import { Plan } from "../models/Plan.js";
import { Website } from "../models/Website.js";
import { User } from "../models/User.js";
import { logCrmActivity } from "./activityLoggerService.js";

/**
 * Daily billing task to auto-generate invoices and renew subscriptions.
 */
export async function runSubscriptionBillingCron() {
  console.log("[Subscription Cron] Starting daily auto-billing job...");
  try {
    const today = new Date();
    
    // Find active subscriptions whose endDate is today or in the past
    const expiredSubscriptions = await Subscription.find({
      status: { $in: ["active", "free_trial", "renewed"] },
      endDate: { $lte: today }
    }).populate("planId");

    console.log(`[Subscription Cron] Found ${expiredSubscriptions.length} subscriptions requiring billing execution.`);

    for (const sub of expiredSubscriptions) {
      if (sub.autoRenewal) {
        // Calculate next renewal range
        const nextStart = new Date(sub.endDate);
        const nextEnd = new Date(sub.endDate);
        
        if (sub.billingCycle === "monthly") {
          nextEnd.setMonth(nextEnd.getMonth() + 1);
        } else if (sub.billingCycle === "quarterly") {
          nextEnd.setMonth(nextEnd.getMonth() + 3);
        } else if (sub.billingCycle === "half_yearly") {
          nextEnd.setMonth(nextEnd.getMonth() + 6);
        } else if (sub.billingCycle === "yearly") {
          nextEnd.setFullYear(nextEnd.getFullYear() + 1);
        } else {
          nextEnd.setMonth(nextEnd.getMonth() + 1);
        }

        const price = sub.planId ? sub.planId.price : 0;
        const invoiceId = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        const websiteDoc = sub.websiteId ? await Website.findById(sub.websiteId).select("managerId").lean() : null;
        let resolvedOwnerId = websiteDoc?.managerId || null;
        if (!resolvedOwnerId) {
          const adminUser = await User.findOne({ role: "admin" }).select("_id").lean();
          resolvedOwnerId = adminUser?._id || null;
        }

        // Create Invoice
        if (resolvedOwnerId) {
          await Invoice.create({
            invoiceId,
            invoiceNumber: invoiceId,
            customerId: sub.customerId,
            websiteId: sub.websiteId,
            ownerId: resolvedOwnerId,
            items: [{
              description: `${sub.planId ? sub.planId.name : "SaaS"} Subscription - Renewal`,
              quantity: 1,
              price: price,
              total: price
            }],
            subtotal: price,
            tax: 0,
            total: price,
            status: "pending"
          });
        }

        // Renew subscription
        sub.startDate = nextStart;
        sub.endDate = nextEnd;
        sub.renewalDate = nextEnd;
        sub.status = "renewed";
        await sub.save();

        // Log timeline activity
        await logCrmActivity({
          websiteId: sub.websiteId,
          type: "subscription_renewed",
          title: `Subscription Renewed: ${sub.planId ? sub.planId.name : "SaaS"} Plan`,
          description: `Auto-invoice ${invoiceId} generated for renewal price $${price}.`,
          customerId: sub.customerId
        });
      } else {
        // Subscription expires
        sub.status = "expired";
        await sub.save();

        await logCrmActivity({
          websiteId: sub.websiteId,
          type: "subscription_renewed",
          title: `Subscription Expired: ${sub.planId ? sub.planId.name : "SaaS Plan"}`,
          description: "Subscription expired due to disabled auto-renewal.",
          customerId: sub.customerId
        });
      }
    }
    console.log("[Subscription Cron] Auto-billing job complete.");
  } catch (err) {
    console.error("[Subscription Cron] Error running recurring billing:", err);
  }
}
