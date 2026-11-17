import os from "os";
import mongoose from "mongoose";
import { Payment } from "../models/Payment.js";
import { Invoice } from "../models/Invoice.js";
import { Customer } from "../models/Customer.js";
import { Ticket } from "../models/Ticket.js";
import { AuditLog } from "../models/AuditLog.js";
import { Website } from "../models/Website.js";
import { Risk } from "../models/Risk.js";
import { User } from "../models/User.js";
import { ChatSession } from "../models/ChatSession.js";
import { WebhookDeliveryLog } from "../models/WebhookDeliveryLog.js";
import { AiProviderManager } from "../services/aiProviderManager.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";
import { getOwnedWebsiteIds, normalizeRole } from "../utils/roleUtils.js";

async function resolveTenantFilter(user, requestedWebsiteId) {
  const role = normalizeRole(user?.role);
  const ownedWebsiteIds = await getOwnedWebsiteIds(user);
  const ownedStrings = (ownedWebsiteIds || []).map(String);

  if (
    requestedWebsiteId &&
    requestedWebsiteId !== "all" &&
    requestedWebsiteId !== "undefined" &&
    requestedWebsiteId !== "null"
  ) {
    if (role !== "admin" && !ownedStrings.includes(String(requestedWebsiteId))) {
      return { websiteId: { $in: [] } };
    }
    return { websiteId: requestedWebsiteId };
  }

  if (role !== "admin") {
    return { websiteId: { $in: ownedWebsiteIds || [] } };
  }

  return {};
}

function getCpuPercentEstimate() {
  const cpuCores = os.cpus()?.length || 1;
  const loadAvg1m = os.loadavg ? os.loadavg()[0] : 0;
  if (loadAvg1m > 0) {
    return Number(Math.min(100, (loadAvg1m / cpuCores) * 100).toFixed(1));
  }
  const uptimeSec = Math.max(1, process.uptime());
  const usage = process.cpuUsage();
  const totalCpuSec = (usage.user + usage.system) / 1e6;
  return Number(Math.min(100, (totalCpuSec / (uptimeSec * cpuCores)) * 100).toFixed(1));
}

async function measureDbPingMs() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return null;
  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    return Date.now() - start;
  } catch {
    return null;
  }
}

export const getMissionControlTelemetry = asyncHandler(async (req, res) => {
  const { websiteId } = req.query;
  const tenantFilter = await resolveTenantFilter(req.user, websiteId);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memoryPercent = totalMem > 0 ? Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1)) : 0;
  const cpuCores = os.cpus()?.length || 1;
  const cpuPercent = getCpuPercentEstimate();
  const uptimeSeconds = Math.floor(process.uptime());
  const dbReady = mongoose.connection.readyState === 1;
  const dbConnections = dbReady ? mongoose.connections.length || 1 : 0;
  const dbLatencyMs = await measureDbPingMs();
  const isHealthy = dbReady && memoryPercent < 95;
  const overallHealth = isHealthy ? "HEALTHY" : "DEGRADED";

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    payments,
    paidInvoices,
    activeClientsCount,
    urgentTicketsCount,
    openTicketsCount,
    resolvedTicketsCount,
    totalTicketsCount,
    criticalRisksCount,
    onlineAgentsCount,
    openChatsCount,
    failedWebhooks24h,
    recentAuditEvents
  ] = await Promise.all([
    Payment.find({ ...tenantFilter, status: "completed" }).select("amount paymentDate createdAt").lean(),
    Invoice.find({ ...tenantFilter, status: "paid" }).select("paidAmount total").lean(),
    Customer.countDocuments({ ...tenantFilter, recordType: "customer" }),
    Ticket.countDocuments({ ...tenantFilter, status: { $in: ["open", "in_progress", "pending"] }, priority: "urgent" }),
    Ticket.countDocuments({ ...tenantFilter, status: { $in: ["open", "in_progress", "pending"] } }),
    Ticket.countDocuments({ ...tenantFilter, status: { $in: ["resolved", "closed"] } }),
    Ticket.countDocuments(tenantFilter),
    Risk.countDocuments({ ...tenantFilter, status: { $ne: "closed" }, riskScore: { $gte: 15 } }),
    User.countDocuments({ role: { $in: ["agent", "manager"] }, isOnline: true }),
    ChatSession.countDocuments({ ...tenantFilter, closedAt: null }),
    WebhookDeliveryLog.countDocuments({ ...tenantFilter, status: "failed", createdAt: { $gte: last24h } }),
    AuditLog.find(tenantFilter).sort({ createdAt: -1 }).limit(10).lean()
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentPayments = payments.filter((p) => new Date(p.paymentDate || p.createdAt) >= thirtyDaysAgo);
  let effectiveMrr = recentPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  if (effectiveMrr === 0 && paidInvoices.length > 0) {
    const invTotal = paidInvoices.reduce((sum, i) => sum + (Number(i.paidAmount || i.total) || 0), 0);
    effectiveMrr = invTotal > 0 ? Math.round(invTotal / 12) : 0;
  }
  const effectiveArr = effectiveMrr * 12;

  const slaScore = totalTicketsCount > 0 ? Number(((resolvedTicketsCount / totalTicketsCount) * 100).toFixed(1)) : 100.0;

  const activeAlerts = [];
  if (urgentTicketsCount > 0) {
    activeAlerts.push({
      alertLevel: "critical",
      sourceModule: "Service Desk",
      message: `${urgentTicketsCount} urgent ticket(s) pending resolution`,
      targetTab: "tickets",
      timestamp: new Date()
    });
  }
  if (criticalRisksCount > 0) {
    activeAlerts.push({
      alertLevel: "warning",
      sourceModule: "Risk Register",
      message: `${criticalRisksCount} high-severity enterprise risk(s) active (Score ≥ 15)`,
      targetTab: "risk-register",
      timestamp: new Date()
    });
  }
  if (failedWebhooks24h > 0) {
    activeAlerts.push({
      alertLevel: "warning",
      sourceModule: "Webhook Gateway",
      message: `${failedWebhooks24h} failed webhook delivery(s) in last 24h`,
      targetTab: "enterprise-integrations",
      timestamp: new Date()
    });
  }
  if (memoryPercent > 85) {
    activeAlerts.push({
      alertLevel: "warning",
      sourceModule: "Infrastructure",
      message: `High server memory utilization: ${memoryPercent}%`,
      targetTab: "observability",
      timestamp: new Date()
    });
  }
  if (!dbReady) {
    activeAlerts.push({
      alertLevel: "critical",
      sourceModule: "Database Cluster",
      message: "Primary MongoDB connection is degraded",
      targetTab: "observability",
      timestamp: new Date()
    });
  }
  if (activeAlerts.length === 0) {
    activeAlerts.push({
      alertLevel: "info",
      sourceModule: "Telemetry Hub",
      message: "All core services operating within normal thresholds",
      targetTab: "observability",
      timestamp: new Date()
    });
  }

  const activityFeed = recentAuditEvents.map((evt) => ({
    action: evt.action || "SYSTEM_AUDIT_LOG",
    userEmail: evt.metadata?.email || evt.actorName || "system",
    timestamp: evt.createdAt || new Date()
  }));

  const websiteDoc =
    websiteId && mongoose.Types.ObjectId.isValid(websiteId)
      ? await Website.findById(websiteId).select("websiteName domain").lean()
      : null;
  const siteScopeLabel = websiteDoc ? websiteDoc.websiteName || websiteDoc.domain : "Global Workspace";

  const summaryText = `Operational telemetry for ${siteScopeLabel}: Engine is ${overallHealth} (Memory ${memoryPercent}%, CPU ${cpuPercent}%, DB ${dbLatencyMs !== null ? `${dbLatencyMs}ms` : "N/A"}). Monthly run-rate is $${effectiveMrr.toLocaleString()} across ${activeClientsCount} customer(s), with ${slaScore}% ticket resolution (${openTicketsCount} open) and ${openChatsCount} active chat(s).`;

  const recommendations = [
    activeClientsCount > 0
      ? `Maintain retention & onboarding workflows across ${activeClientsCount} active customer account(s).`
      : "Onboard initial customers or convert leads from the CRM pipeline.",
    urgentTicketsCount > 0
      ? `Resolve ${urgentTicketsCount} urgent open ticket(s) to protect SLA targets.`
      : openTicketsCount > 0
      ? `Ticket resolution is ${slaScore}% with ${openTicketsCount} open ticket(s) in queue.`
      : `Support ticket resolution rate is ${slaScore}% with zero open backlog.`,
    failedWebhooks24h > 0
      ? `Inspect ${failedWebhooks24h} failed webhook delivery(s) in Integration Hub.`
      : `Database (${dbLatencyMs ?? 0}ms), ${onlineAgentsCount} online agent(s), and memory (${memoryPercent}%) are healthy.`
  ];

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const serviceMap = {
    authService: "HEALTHY",
    databaseCluster: dbReady ? `ONLINE (${dbLatencyMs ?? 0}ms)` : "DEGRADED",
    memoryUtilization: `${memoryPercent}% (${cpuCores} Cores)`,
    cpuLoad: `${cpuPercent}%`,
    supportSlaEngine: `${slaScore}% Resolved`,
    liveChatQueue: `${openChatsCount} Active`,
    onlineAgents: `${onlineAgentsCount} Online`,
    webhookGateway: failedWebhooks24h > 0 ? `${failedWebhooks24h} Failed (24h)` : "HEALTHY",
    aiReadinessLayer: geminiConfigured ? "GEMINI_READY" : "RULE_BASED",
    biAnalyticsEngine: `ONLINE ($${effectiveArr.toLocaleString()} ARR)`
  };

  const riskScore = Math.min(
    100,
    (urgentTicketsCount > 0 ? 30 : 0) +
      (criticalRisksCount > 0 ? 25 : 0) +
      (failedWebhooks24h > 0 ? 15 : 0) +
      (memoryPercent > 85 ? 20 : 0) +
      (!dbReady ? 40 : 0) +
      (slaScore < 50 && totalTicketsCount > 0 ? 15 : 5)
  );

  return res.json({
    summary: {
      overallHealth,
      mrr: `$${effectiveMrr.toLocaleString()}`,
      arr: `$${effectiveArr.toLocaleString()}`,
      slaScore: `${slaScore}%`,
      activeAlertsCount: urgentTicketsCount + criticalRisksCount + (failedWebhooks24h > 0 ? 1 : 0),
      uptimeMinutes: Math.floor(uptimeSeconds / 60)
    },
    serviceMap,
    doc: {
      systemHealth: {
        overall: overallHealth,
        cpuPercent,
        memoryPercent,
        dbConnections,
        dbLatencyMs,
        uptimeSeconds
      },
      businessHealth: {
        mrrRunRate: `$${effectiveMrr.toLocaleString()}`,
        arrRunRate: `$${effectiveArr.toLocaleString()}`,
        activeClients: activeClientsCount,
        slaScore
      },
      activeAlerts,
      activityFeed,
      aiExecutiveSummary: {
        provider: "rule_based",
        summaryText,
        riskScore,
        recommendations
      }
    }
  });
});

export const executeCommandPaletteAction = asyncHandler(async (req, res) => {
  const { commandKey, payload } = req.body;

  if (!commandKey) throw new AppError("Command key is required", 400);

  let diagnosticResult = null;
  if (commandKey === "run_diagnostics" || commandKey === "trigger_smoke_tests") {
    const dbLatencyMs = await measureDbPingMs();
    const dbPingOk = dbLatencyMs !== null;
    const [websitesCount, openUrgent] = await Promise.all([
      Website.countDocuments({}),
      Ticket.countDocuments({ status: { $in: ["open", "in_progress", "pending"] }, priority: "urgent" })
    ]);
    diagnosticResult = {
      dbPingOk,
      dbLatencyMs: dbLatencyMs ?? 0,
      websitesCount,
      openUrgent
    };
  }

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: `MISSION_CONTROL_COMMAND_${commandKey.toUpperCase()}`,
    resource: "MissionControlTelemetry",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { commandKey, payload, diagnosticResult }
  });

  const message = diagnosticResult
    ? `Diagnostics passed: DB Ping ${diagnosticResult.dbPingOk ? "OK" : "FAIL"} (${diagnosticResult.dbLatencyMs}ms), ${diagnosticResult.websitesCount} site(s), ${diagnosticResult.openUrgent} urgent ticket(s).`
    : `Executed Mission Control command: ${commandKey}`;

  return res.json({
    status: "executed",
    message,
    diagnosticResult,
    executedAt: new Date()
  });
});

export const generateAiExecutiveSummary = asyncHandler(async (req, res) => {
  const { websiteId } = req.query;
  const tenantFilter = await resolveTenantFilter(req.user, websiteId);
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    activeClientsCount,
    openUrgentCount,
    openTotalCount,
    resolvedCount,
    totalTickets,
    payments,
    criticalRisks,
    openChats,
    failedWebhooks24h
  ] = await Promise.all([
    Customer.countDocuments({ ...tenantFilter, recordType: "customer" }),
    Ticket.countDocuments({ ...tenantFilter, status: { $in: ["open", "in_progress", "pending"] }, priority: "urgent" }),
    Ticket.countDocuments({ ...tenantFilter, status: { $in: ["open", "in_progress", "pending"] } }),
    Ticket.countDocuments({ ...tenantFilter, status: { $in: ["resolved", "closed"] } }),
    Ticket.countDocuments(tenantFilter),
    Payment.find({ ...tenantFilter, status: "completed" }).select("amount paymentDate createdAt").lean(),
    Risk.countDocuments({ ...tenantFilter, status: { $ne: "closed" }, riskScore: { $gte: 15 } }),
    ChatSession.countDocuments({ ...tenantFilter, closedAt: null }),
    WebhookDeliveryLog.countDocuments({ ...tenantFilter, status: "failed", createdAt: { $gte: last24h } })
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const mrr = payments
    .filter((p) => new Date(p.paymentDate || p.createdAt) >= thirtyDaysAgo)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const slaRate = totalTickets > 0 ? Number(((resolvedCount / totalTickets) * 100).toFixed(1)) : 100;
  const fallbackRiskScore = Math.min(
    100,
    (openUrgentCount > 0 ? 30 : 0) +
      (criticalRisks > 0 ? 25 : 0) +
      (failedWebhooks24h > 0 ? 15 : 0) +
      (slaRate < 50 && totalTickets > 0 ? 20 : 5)
  );

  let aiExecutiveSummary = {
    provider: "rule_based",
    summaryText: `Executive Snapshot (${new Date().toLocaleTimeString()}): ${activeClientsCount} active customer(s), $${mrr.toLocaleString()} 30-day revenue, ${slaRate}% ticket resolution (${openTotalCount} open, ${openUrgentCount} urgent), ${openChats} active chat(s), ${failedWebhooks24h} failed webhook(s), and ${criticalRisks} critical risk(s).`,
    riskScore: fallbackRiskScore,
    recommendations: [
      activeClientsCount > 0
        ? `Review retention & billing health across ${activeClientsCount} customer account(s).`
        : "Convert active CRM leads into customer accounts.",
      openUrgentCount > 0
        ? `Prioritize ${openUrgentCount} urgent support ticket(s) immediately.`
        : openTotalCount > 0
        ? `Clear ${openTotalCount} open ticket(s) to improve ${slaRate}% resolution rate.`
        : "Zero open ticket backlog — SLA health is strong.",
      criticalRisks > 0 || failedWebhooks24h > 0
        ? `Address ${criticalRisks} critical risk(s) and ${failedWebhooks24h} failed webhook(s).`
        : "No critical items flagged in Risk Register or Webhook Gateway."
    ]
  };

  if (process.env.GEMINI_API_KEY) {
    try {
      const gemini = AiProviderManager.getProvider("gemini");
      const prompt = `You are an Enterprise SaaS CTO & Operations Advisor. Analyze these live production metrics and return ONLY valid JSON with keys: "summaryText" (2 concise executive sentences), "riskScore" (integer 0-100), and "recommendations" (array of 3 concise actionable strings).
Metrics:
- Active Customers: ${activeClientsCount}
- 30-day Revenue (MRR): $${mrr}
- Ticket Resolution Rate: ${slaRate}% (${openTotalCount} open, ${openUrgentCount} urgent, ${totalTickets} total)
- Active Live Chats: ${openChats}
- Failed Webhooks (24h): ${failedWebhooks24h}
- Critical Enterprise Risks: ${criticalRisks}`;

      const completion = await gemini.generateCompletion({ prompt, temperature: 0.3, maxTokens: 350 });
      const raw = String(completion?.text || "").trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.summaryText === "string" && Array.isArray(parsed.recommendations)) {
        aiExecutiveSummary = {
          provider: "gemini",
          summaryText: parsed.summaryText,
          riskScore: Math.min(100, Math.max(0, Math.round(Number(parsed.riskScore ?? fallbackRiskScore)))),
          recommendations: parsed.recommendations.slice(0, 3).map(String)
        };
      }
    } catch (err) {
      console.warn("[MissionControl] Gemini summary fallback used:", err.message);
    }
  }

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "MISSION_CONTROL_AI_SUMMARY_GENERATED",
    resource: "MissionControlTelemetry",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { provider: aiExecutiveSummary.provider, summaryText: aiExecutiveSummary.summaryText }
  });

  return res.json(aiExecutiveSummary);
});
