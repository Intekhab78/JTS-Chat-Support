import { ChatSession } from "../models/ChatSession.js";
import { Ticket } from "../models/Ticket.js";
import { SlaPolicy } from "../models/SlaPolicy.js";
import { Website } from "../models/Website.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { createNotification } from "./notificationService.js";
import { sendEmail } from "./emailService.js";
import { slaBreachTemplate } from "../utils/emailTemplates.js";
import { processCrmAutomation, processTicketAutomation } from "./automationService.js";
import { runTicketEscalationEngine } from "./ticketEscalationService.js";
import { computeElapsedSlaHours } from "../utils/slaTimeUtils.js";
import { emitSessionUpdate } from "../sockets/index.js";

async function alertManager(manager, breachType, details, dashboardUrl) {
  await createNotification({
    recipient: manager._id,
    type: "sla_breach",
    title: `SLA breach: ${breachType}`,
    message: details[0],
    link: dashboardUrl
  });

  const { html, subject } = slaBreachTemplate({
    managerName: manager.name,
    breachType,
    details,
    dashboardUrl
  });

  await sendEmail({ to: manager.email, subject, html });
}

export async function processSlaBreaches() {
  const queueCutoff = new Date(Date.now() - env.slaQueueAlertMinutes * 60 * 1000);
  const ticketCutoff = new Date(Date.now() - env.slaTicketAlertHours * 60 * 60 * 1000);

  const queuedSessions = await ChatSession.find({
    status: "queued",
    createdAt: { $lte: queueCutoff },
    queueAlertSentAt: null
  }).populate("websiteId", "websiteName managerId");

  for (const session of queuedSessions) {
    if (!session.websiteId?.managerId) continue;
    const manager = await User.findById(session.websiteId.managerId).select("name email");
    if (!manager) continue;

    const dashboardUrl = `${env.clientUrl}/client?tab=chats&sessionId=${session.sessionId}`;
    await alertManager(
      manager,
      "Queued chat",
      [
        `Chat ${session.sessionId} for ${session.websiteId.websiteName} has been waiting more than ${env.slaQueueAlertMinutes} minutes.`,
        `Created at ${session.createdAt.toISOString()}.`
      ],
      dashboardUrl
    );

    session.queueAlertSentAt = new Date();
    await session.save();
  }



  const [openTickets, activePolicies] = await Promise.all([
    Ticket.find({
      status: { $nin: ["resolved", "closed", "archived"] },
      resolutionAlertSentAt: null
    }).populate("websiteId", "websiteName managerId"),
    SlaPolicy.find({ status: "active" }).lean()
  ]);

  const policyMap = new Map();
  for (const p of activePolicies) {
    const key = `${String(p.websiteId)}_${String(p.priority || "Medium").toLowerCase()}`;
    if (!policyMap.has(key)) policyMap.set(key, p);
  }

  const priorityNormalize = { urgent: "critical", high: "high", medium: "medium", low: "low" };
  const now = new Date();

  for (const ticket of openTickets) {
    if (!ticket.websiteId?.managerId) continue;

    const prioKey = priorityNormalize[String(ticket.priority || "medium").toLowerCase()] || "medium";
    const policy = policyMap.get(`${String(ticket.websiteId._id)}_${prioKey}`);
    const targetHrs = Number(policy?.resolutionTimeTargetHours) || env.slaTicketAlertHours;
    const escalationPct = Number(policy?.escalationThresholdPercent) || 100;
    const escalationHrs = targetHrs * (escalationPct / 100);
    const elapsedHrs = computeElapsedSlaHours(ticket.createdAt, now, Boolean(policy?.businessHoursOnly));

    if (elapsedHrs < escalationHrs) continue;

    const manager = await User.findById(ticket.websiteId.managerId).select("name email");
    if (!manager) continue;

    const dashboardUrl = `${env.clientUrl}/client?tab=tickets`;
    await alertManager(
      manager,
      "Unresolved ticket",
      [
        `Ticket ${ticket.ticketId} (${ticket.subject}) exceeded ${escalationHrs.toFixed(1)}h SLA escalation threshold (${elapsedHrs.toFixed(1)}h elapsed).`,
        `Current status: ${ticket.status}. Policy: ${policy?.name || "Default"}.`
      ],
      dashboardUrl
    );

    ticket.resolutionAlertSentAt = now;
    if (!ticket.slaBreachedAt) ticket.slaBreachedAt = now;
    await ticket.save();
  }

  await processCrmAutomation();
  await processTicketAutomation();
  await runTicketEscalationEngine().catch(err => console.error("[SLA Monitor] Escalation engine run failed:", err.message));
}

export function startSlaMonitor() {
  const intervalMs = 60 * 1000;
  processSlaBreaches().catch((error) => {
    console.error("Initial SLA monitor run failed:", error.message);
  });
  return setInterval(() => {
    processSlaBreaches().catch((error) => {
      console.error("SLA monitor run failed:", error.message);
    });
  }, intervalMs);
}
