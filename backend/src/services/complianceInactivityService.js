import { Customer } from "../models/Customer.js";
import { User } from "../models/User.js";
import { createAndEmitCrmNotification } from "../utils/crmUtils.js";
import { logCrmActivity } from "./activityLoggerService.js";
import { logAuditEvent } from "./auditService.js";

/**
 * Multi-tier Escalation Engine for Unattended Compliance Clients
 * Checks for inactive customers where workStatus !== "Completed"
 * Multi-tier rules:
 * - Level 1 (Consultant): Inactivity >= 7 days
 * - Level 2 (Admin): Inactivity >= 10 days
 * - Level 3 (Management): Inactivity >= 14 days
 */
export async function checkUnattendedClientsAndEscalate(options = {}) {
  const { websiteId = null } = options;
  console.log("[Compliance Engine] Running multi-tier unattended client escalation check...");

  try {
    const now = new Date();
    const query = {
      archivedAt: null,
      workStatus: { $ne: "Completed" }
    };

    if (websiteId) {
      query.websiteId = websiteId;
    }

    const customers = await Customer.find(query)
      .populate("ownerId", "name email role")
      .populate("websiteId", "websiteName");

    let level1Triggered = 0;
    let level2Triggered = 0;
    let level3Triggered = 0;

    for (const customer of customers) {
      const lastActivity = customer.lastFollowUpActivityAt || customer.updatedAt || customer.createdAt;
      const diffMs = now.getTime() - new Date(lastActivity).getTime();
      const inactiveDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // LEVEL 3 ESCALATION: 14+ Days Inactive -> Management Notification
      if (inactiveDays >= 14 && (customer.lastEscalationLevel || 0) < 3) {
        const managers = await User.find({
          role: { $in: ["manager", "management", "admin"] },
          $or: [{ websiteIds: customer.websiteId }, { role: "admin" }]
        });

        const notifiedUserIds = managers.map(m => m._id);

        for (const manager of managers) {
          await createAndEmitCrmNotification({
            recipient: manager._id,
            type: "unattended_client_alert",
            title: `CRITICAL ESCALATION (Level 3): Unattended Client ${customer.companyName || customer.name}`,
            message: `Client ${customer.name} (${customer.serviceType}) has been unattended for ${inactiveDays} days. Assigned consultant: ${customer.ownerId?.name || "Unassigned"}.`,
            link: `/crm?highlight=${customer._id}`
          });
        }

        customer.lastEscalationLevel = 3;
        customer.lastEscalatedAt = now;
        customer.inactivityReminderHistory.push({
          level: 3,
          notifiedRole: "management",
          notifiedUserIds,
          message: `Level 3 escalation dispatched to ${managers.length} managers/admins after ${inactiveDays} days of inactivity.`,
          sentAt: now
        });

        await customer.save();

        await logCrmActivity({
          websiteId: customer.websiteId._id || customer.websiteId,
          type: "activity_alert",
          title: "Level 3 Escalation Dispatched",
          description: `Management alerted for unattended client ${customer.name} (${inactiveDays} days inactive).`,
          customerId: customer._id
        });

        await logAuditEvent({
          userId: customer.ownerId?._id || null,
          action: "COMPLIANCE_ESCALATION_LEVEL_3",
          resource: "Customer",
          resourceId: customer._id.toString(),
          details: { inactiveDays, notifiedRole: "management", managerCount: managers.length }
        });

        level3Triggered++;
      }
      // LEVEL 2 ESCALATION: 10+ Days Inactive -> Admin Notification
      else if (inactiveDays >= 10 && (customer.lastEscalationLevel || 0) < 2) {
        const admins = await User.find({ role: "admin" });
        const notifiedUserIds = admins.map(a => a._id);

        for (const admin of admins) {
          await createAndEmitCrmNotification({
            recipient: admin._id,
            type: "unattended_client_alert",
            title: `ADMIN ESCALATION (Level 2): Unattended Client ${customer.companyName || customer.name}`,
            message: `Client ${customer.name} (${customer.serviceType}) has had no activity for ${inactiveDays} days.`,
            link: `/crm?highlight=${customer._id}`
          });
        }

        customer.lastEscalationLevel = 2;
        customer.lastEscalatedAt = now;
        customer.inactivityReminderHistory.push({
          level: 2,
          notifiedRole: "admin",
          notifiedUserIds,
          message: `Level 2 escalation dispatched to ${admins.length} admins after ${inactiveDays} days of inactivity.`,
          sentAt: now
        });

        await customer.save();

        await logCrmActivity({
          websiteId: customer.websiteId._id || customer.websiteId,
          type: "activity_alert",
          title: "Level 2 Escalation Dispatched",
          description: `Admin team alerted for unattended client ${customer.name} (${inactiveDays} days inactive).`,
          customerId: customer._id
        });

        level2Triggered++;
      }
      // LEVEL 1 ESCALATION: 7+ Days Inactive -> Assigned Consultant Notification
      else if (inactiveDays >= 7 && (customer.lastEscalationLevel || 0) < 1) {
        if (customer.ownerId?._id) {
          await createAndEmitCrmNotification({
            recipient: customer.ownerId._id,
            type: "unattended_client_alert",
            title: `FOLLOW-UP REMINDER (Level 1): ${customer.companyName || customer.name}`,
            message: `You have had no recorded follow-up activity for client ${customer.name} in ${inactiveDays} days. Please add notes or update status.`,
            link: `/crm?highlight=${customer._id}`
          });

          customer.lastEscalationLevel = 1;
          customer.lastEscalatedAt = now;
          customer.inactivityReminderHistory.push({
            level: 1,
            notifiedRole: "tax_consultant",
            notifiedUserIds: [customer.ownerId._id],
            message: `Level 1 reminder dispatched to consultant ${customer.ownerId.name} after ${inactiveDays} days of inactivity.`,
            sentAt: now
          });

          await customer.save();

          await logCrmActivity({
            websiteId: customer.websiteId._id || customer.websiteId,
            type: "activity_alert",
            title: "Level 1 Follow-up Reminder Dispatched",
            description: `Consultant ${customer.ownerId.name} reminded for client ${customer.name}.`,
            customerId: customer._id
          });

          level1Triggered++;
        }
      }
    }

    console.log(`[Compliance Engine] Inactivity check completed. Level 1: ${level1Triggered}, Level 2: ${level2Triggered}, Level 3: ${level3Triggered}`);
    return {
      success: true,
      summary: { level1Triggered, level2Triggered, level3Triggered }
    };
  } catch (err) {
    console.error("[Compliance Engine] Error running inactivity check:", err);
    return { success: false, error: err.message };
  }
}
