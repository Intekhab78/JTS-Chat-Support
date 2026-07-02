import { Ticket } from "../models/Ticket.js";
import { User } from "../models/User.js";
import { logCrmActivity } from "./activityLoggerService.js";

/**
 * Audit engine runs to escalate breached or aging support tickets automatically.
 */
export async function runTicketEscalationEngine() {
  console.log("[Escalation Engine] Auditing tickets SLA status...");
  try {
    const now = new Date();

    // Find unresolved tickets where SLA resolution is due and escalation is within bounds
    const breachedTickets = await Ticket.find({
      status: { $in: ["open", "in_progress", "pending"] },
      resolutionDueAt: { $lte: now },
      escalationLevel: { $lt: 3 }
    });

    console.log(`[Escalation Engine] Found ${breachedTickets.length} tickets breaching SLA resolution target.`);

    for (const ticket of breachedTickets) {
      ticket.escalationLevel = (ticket.escalationLevel || 0) + 1;
      ticket.lastEscalatedAt = now;

      // Find an agent with management role to reassign (Team Lead -> Manager -> Admin)
      let targetRole = "manager";
      if (ticket.escalationLevel === 1) targetRole = "manager"; // Lead level mock
      else if (ticket.escalationLevel === 2) targetRole = "manager";
      else targetRole = "admin";

      const manager = await User.findOne({ role: targetRole, websiteIds: ticket.websiteId });
      if (manager) {
        ticket.assignedAgent = manager._id;
        ticket.assignmentReason = `Auto SLA Escalation Level ${ticket.escalationLevel}`;
      }

      await ticket.save();

      // Log timeline activity
      await logCrmActivity({
        websiteId: ticket.websiteId,
        type: "status_changed",
        title: `Ticket SLA Escalled: Lvl ${ticket.escalationLevel}`,
        description: `Ticket ${ticket.ticketId} escalated automatically due to resolution SLA breach. Assigned to role: ${targetRole}.`,
        customerId: ticket.customerId,
        ownerId: ticket.assignedAgent
      });
    }
    console.log("[Escalation Engine] Audit task complete.");
  } catch (err) {
    console.error("[Escalation Engine] Error running SLA escalations:", err);
  }
}
