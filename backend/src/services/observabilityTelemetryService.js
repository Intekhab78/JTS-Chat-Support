import os from "os";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { ObservabilityAlert } from "../models/ObservabilityAlert.js";
import { AuditLog } from "../models/AuditLog.js";
import { User } from "../models/User.js";
import { getSocketServer } from "../sockets/index.js";
import { createNotification } from "./notificationService.js";
import { sendEmail } from "./emailService.js";
import { logAuditEvent } from "./auditService.js";

const MAX_HISTORY_POINTS = 60;
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;
const MONITOR_INTERVAL_MS = 60 * 1000;

const telemetryHistory = [];
let prevCpuSnapshot = captureCpuTotals();
let monitorTimer = null;

function captureCpuTotals() {
  const cpus = os.cpus() || [];
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type of Object.keys(cpu.times || {})) {
      total += cpu.times[type];
    }
    idle += cpu.times?.idle || 0;
  }
  return { idle, total, cores: cpus.length };
}

/**
 * Computes real-time CPU utilization using delta ticks between samples
 * (works accurately on Windows where os.loadavg() returns [0, 0, 0]).
 */
export function sampleCpuDeltaPercent() {
  const current = captureCpuTotals();
  const totalDelta = current.total - prevCpuSnapshot.total;
  const idleDelta = current.idle - prevCpuSnapshot.idle;

  if (totalDelta > 0) {
    prevCpuSnapshot = current;
    const busyPercent = Math.round(100 - (100 * idleDelta) / totalDelta);
    return Math.max(1, Math.min(100, busyPercent));
  }

  // Fallback if sampled within the same millisecond
  if (current.total > 0) {
    return Math.max(1, Math.min(100, Math.round(100 - (100 * current.idle) / current.total)));
  }
  return 0;
}

function getRuleCurrentValue(metricType, metrics) {
  switch (metricType) {
    case "cpu": return metrics.cpuPercent;
    case "memory": return metrics.memoryPercent;
    case "database": return metrics.activeConnections;
    case "slow_api": return metrics.dbLatencyMs;
    case "high_errors": return metrics.errorAuditEvents;
    case "failed_logins": return metrics.failedLogins;
    default: return 0;
  }
}

export async function collectTelemetrySnapshot({ recordHistory = true } = {}) {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? "healthy" : "degraded";

  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryPercent = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;

  const cpus = os.cpus() || [];
  const cpuLoadAvg = os.loadavg();
  const cpuPercent = sampleCpuDeltaPercent();

  const rssMb = Math.round(memoryUsage.rss / 1024 / 1024);
  const heapUsedMb = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(memoryUsage.heapTotal / 1024 / 1024);

  let collectionsCount = 0;
  let dbLatencyMs = 0;
  let activeConnections = mongoose.connections?.length || 1;
  try {
    if (dbState === 1) {
      const pingStart = performance.now();
      await mongoose.connection.db.admin().ping();
      dbLatencyMs = Math.max(1, Math.round(performance.now() - pingStart));

      const collections = await mongoose.connection.db.collections();
      collectionsCount = collections.length;

      try {
        const serverStatus = await mongoose.connection.db.admin().serverStatus();
        if (serverStatus?.connections?.current !== undefined) {
          activeConnections = serverStatus.connections.current;
        }
      } catch {
        // serverStatus may require elevated cluster privileges
      }
    }
  } catch (err) {
    console.error("Observability DB metrics error:", err.message);
  }

  // Real event-loop latency
  const loopStart = performance.now();
  await new Promise((resolve) => setImmediate(resolve));
  const eventLoopLatencyMs = Math.max(1, Math.round(performance.now() - loopStart));

  // Real Socket.IO health & live client count
  const io = getSocketServer();
  const socketHealthy = Boolean(io);
  const connectedClients = io ? (io.engine?.clientsCount ?? io.sockets?.sockets?.size ?? 0) : 0;
  const activeRooms = io ? (io.sockets?.adapter?.rooms?.size ?? 0) : 0;

  // Storage vault check
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const storageAvailable = fs.existsSync(uploadsDir);

  const oneMinAgo = new Date(Date.now() - 60 * 1000);
  const [failedLogins, totalAuditEvents, recentAuditEvents, errorAuditEvents, alertRules] = await Promise.all([
    AuditLog.countDocuments({ action: { $regex: /LOGIN_FAILED|UNAUTHORIZED/i } }),
    AuditLog.countDocuments({}),
    AuditLog.countDocuments({ createdAt: { $gte: oneMinAgo } }),
    AuditLog.countDocuments({ createdAt: { $gte: oneMinAgo }, level: { $in: ["error", "critical"] } }),
    ObservabilityAlert.find({})
  ]);

  const metricsBag = {
    cpuPercent,
    memoryPercent,
    activeConnections,
    dbLatencyMs,
    errorAuditEvents,
    failedLogins
  };

  let activeAlertsCount = 0;
  const evaluatedRules = alertRules.map((rule) => {
    const currentVal = getRuleCurrentValue(rule.metricType, metricsBag);
    const triggered = currentVal >= Number(rule.thresholdValue || 0);
    if (triggered) activeAlertsCount += 1;
    return { _id: rule._id, triggered, currentVal };
  });

  if (recordHistory) {
    const now = new Date();
    telemetryHistory.push({
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      timestamp: now.toISOString(),
      cpuPercent,
      memoryPercent,
      dbLatencyMs,
      eventLoopLatencyMs,
      connectedClients
    });
    if (telemetryHistory.length > MAX_HISTORY_POINTS) {
      telemetryHistory.shift();
    }
  }

  const healthyServicesCount = (dbState === 1 ? 1 : 0) + 1 + (socketHealthy ? 1 : 0) + (storageAvailable ? 1 : 0);
  const healthScorePercent = Number(((healthyServicesCount / 4) * 100).toFixed(2));

  return {
    snapshot: {
      status: dbState === 1 && socketHealthy ? "healthy" : "degraded",
      uptimeSeconds: Math.floor(uptime),
      uptimeFormatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpuCores: cpus.length,
        cpuPercent,
        memoryPercent,
        loadAvg: cpuLoadAvg.map((n) => n.toFixed(2)),
        memory: {
          totalMemMb: Math.round(totalMem / 1024 / 1024),
          freeMemMb: Math.round(freeMem / 1024 / 1024),
          usedMemMb: Math.round(usedMem / 1024 / 1024),
          rssMb,
          heapUsedMb,
          heapTotalMb
        }
      },
      database: {
        status: dbStatus,
        host: mongoose.connection.host || "localhost",
        collections: collectionsCount,
        activeConnections,
        latencyMs: dbLatencyMs
      },
      socket: {
        status: socketHealthy ? "healthy" : "degraded",
        connectedClients,
        activeRooms
      },
      servicesHealth: [
        {
          name: "Node.js Express Backend",
          status: "healthy",
          latencyMs: eventLoopLatencyMs,
          detail: `${cpus.length} cores · ${heapUsedMb} MB heap`
        },
        {
          name: "MongoDB Database Cluster",
          status: dbStatus,
          latencyMs: dbLatencyMs,
          detail: `${collectionsCount} collections · ${activeConnections} conn`
        },
        {
          name: "Socket.IO Realtime Engine",
          status: socketHealthy ? "healthy" : "degraded",
          latencyMs: eventLoopLatencyMs,
          detail: socketHealthy ? `${connectedClients} live clients · ${activeRooms} rooms` : "Socket server offline"
        },
        {
          name: "Document Storage Vault",
          status: storageAvailable ? "healthy" : "degraded",
          latencyMs: 1,
          detail: storageAvailable ? "Local vault mounted" : "Uploads folder missing"
        }
      ],
      evaluatedRules,
      history: [...telemetryHistory],
      telemetry: {
        eventsPerMinute: recentAuditEvents,
        errorsPerMinute: errorAuditEvents,
        avgResponseTimeMs: dbLatencyMs,
        failedLogins,
        totalAuditEvents,
        activeAlertsCount,
        healthScorePercent
      }
    },
    alertRules,
    metricsBag
  };
}

async function dispatchAlertNotification(rule, currentVal) {
  const title = `[${String(rule.severity || "warning").toUpperCase()}] Alert: ${rule.ruleName}`;
  const message = `Metric "${rule.metricType}" reached ${currentVal} (threshold: ${rule.thresholdValue}).`;

  // Always create In-App notification (and emit live socket alert if online)
  let targetUser = null;
  if (rule.createdBy) {
    targetUser = await User.findById(rule.createdBy).select("_id email name");
  }
  if (!targetUser) {
    targetUser = await User.findOne({ role: "admin" }).select("_id email name");
  }

  if (targetUser) {
    const notif = await createNotification({
      recipient: targetUser._id,
      title,
      message,
      type: "system_alert",
      link: "/admin?tab=observability",
      entityType: "ObservabilityAlert",
      entityId: rule._id,
      metadata: { metricType: rule.metricType, currentVal, thresholdValue: rule.thresholdValue, severity: rule.severity }
    });

    const io = getSocketServer();
    if (io && notif) {
      io.to(String(targetUser._id)).emit("notification:new", notif);
    }
  }

  // Optional Email dispatch
  if (rule.notificationChannel === "email" && targetUser?.email) {
    await sendEmail({
      to: targetUser.email,
      subject: title,
      html: `<p><strong>${title}</strong></p><p>${message}</p><p>Time: ${new Date().toISOString()}</p>`
    }).catch((err) => console.error("[Observability Email Alert Error]", err.message));
  }

  // Optional Webhook / Slack dispatch
  const targetWebhook = rule.webhookUrl || process.env.OBSERVABILITY_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || "";
  if (rule.notificationChannel === "webhook" && targetWebhook) {
    await fetch(targetWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `${title} — ${message}`,
        ruleName: rule.ruleName,
        metricType: rule.metricType,
        currentVal,
        thresholdValue: rule.thresholdValue,
        severity: rule.severity,
        triggeredAt: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(8000)
    }).catch((err) => console.error("[Observability Webhook Alert Error]", err.message));
  }

  await logAuditEvent({
    userId: targetUser?._id || null,
    websiteId: rule.websiteId || null,
    action: "OBSERVABILITY_ALERT_TRIGGERED",
    resource: "ObservabilityAlert",
    resourceId: rule._id,
    level: rule.severity === "critical" ? "critical" : "warning",
    changes: { ruleName: rule.ruleName, metricType: rule.metricType, currentVal, thresholdValue: rule.thresholdValue }
  }).catch(() => {});
}

export async function runObservabilityCheck() {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const { alertRules, metricsBag } = await collectTelemetrySnapshot({ recordHistory: true });
    const now = Date.now();

    for (const rule of alertRules) {
      const currentVal = getRuleCurrentValue(rule.metricType, metricsBag);
      const breached = currentVal >= Number(rule.thresholdValue || 0);

      if (breached) {
        const lastAt = rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).getTime() : 0;
        const cooldownElapsed = now - lastAt >= ALERT_COOLDOWN_MS;
        if (!rule.isTriggered || cooldownElapsed) {
          rule.isTriggered = true;
          rule.lastTriggeredAt = new Date();
          rule.triggerCount = (rule.triggerCount || 0) + 1;
          await rule.save();
          await dispatchAlertNotification(rule, currentVal);
        }
      } else if (rule.isTriggered) {
        rule.isTriggered = false;
        await rule.save();
      }
    }
  } catch (err) {
    console.error("[Observability Monitor Error]", err.message);
  }
}

export function startObservabilityMonitor() {
  if (monitorTimer) return;
  // Seed initial sample quickly after startup, then run every 60s
  setTimeout(() => {
    void runObservabilityCheck();
  }, 5000);
  monitorTimer = setInterval(() => {
    void runObservabilityCheck();
  }, MONITOR_INTERVAL_MS);
}

