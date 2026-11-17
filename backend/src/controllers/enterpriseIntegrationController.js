import crypto from "crypto";
import { EnterpriseIntegration } from "../models/EnterpriseIntegration.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";
import { normalizeRole } from "../utils/roleUtils.js";
import { dispatchWebhookHttp, pushDeliveryLog } from "../services/integrationWebhookService.js";

const DEFAULT_EVENTS = [
  "ticket.created",
  "ticket.resolved",
  "lead.created",
  "deal.won",
  "invoice.paid",
  "chat.started",
  "customer.created"
];

function generateSecret() {
  return `whsec_${crypto.randomBytes(20).toString("hex")}`;
}

function maskSecret(secret = "") {
  if (!secret) return "";
  return secret.length > 8 ? `${secret.slice(0, 6)}••••${secret.slice(-4)}` : "••••••••";
}

function resolveTenantOwnerId(user) {
  const role = normalizeRole(user?.role);
  if (role === "client") return user._id;
  return user?.managerId || user?._id;
}

function isAuthorizedForConnector(user, connector) {
  const userRole = normalizeRole(user?.role);
  const tenantOwnerId = resolveTenantOwnerId(user);
  if (userRole === "admin") return true;
  return !connector.createdBy || String(connector.createdBy) === String(tenantOwnerId);
}

export const getIntegrationOverview = asyncHandler(async (req, res) => {
  const tenantOwnerId = resolveTenantOwnerId(req.user);
  const filter = { createdBy: tenantOwnerId };

  // Remove legacy fake connectors, keeping real Webhooks and JTS Meet
  await EnterpriseIntegration.deleteMany({ ...filter, connectorKey: { $nin: ["webhooks", "jts_meet"] } });

  const hasWebhook = await EnterpriseIntegration.exists({ ...filter, connectorKey: "webhooks" });
  if (!hasWebhook) {
    const initialSecret = generateSecret();
    await EnterpriseIntegration.create({
      connectorKey: "webhooks",
      connectorName: "Primary Outbound & Inbound Webhook",
      category: "automation",
      authType: "webhook_secret",
      status: "disconnected",
      settings: {
        apiKeyMasked: maskSecret(initialSecret),
        signingSecret: initialSecret,
        webhookUrl: "",
        description: "Primary real-time event webhook endpoint for CRM, Tickets, and Billing events.",
        events: ["ticket.created", "lead.created", "invoice.paid"]
      },
      createdBy: tenantOwnerId,
      lastSyncAt: null,
      syncQueue: []
    });
  }

  const hasJtsMeet = await EnterpriseIntegration.exists({ ...filter, connectorKey: "jts_meet" });
  if (!hasJtsMeet) {
    const jtsSecret = generateSecret();
    await EnterpriseIntegration.create({
      connectorKey: "jts_meet",
      connectorName: "JTS Meet Video Conferencing",
      category: "communication",
      authType: "api_key",
      status: "disconnected",
      settings: {
        apiKeyMasked: maskSecret(jtsSecret),
        signingSecret: jtsSecret,
        webhookUrl: "",
        description: "JTS Meet video conferencing webhook & room event integration.",
        events: ["meeting.started", "meeting.ended", "participant.joined"]
      },
      createdBy: tenantOwnerId,
      lastSyncAt: null,
      syncQueue: []
    });
  }

  const connectors = await EnterpriseIntegration.find(filter).sort({ createdAt: 1 });

  const connectedCount = connectors.filter((c) => c.status === "connected").length;
  const configuredCount = connectors.filter((c) => Boolean(c.settings?.webhookUrl)).length;
  const errorCount = connectors.filter((c) => c.status === "error").length;

  let totalPendingSync = 0;
  let totalSynced = 0;
  let totalFailed = 0;
  const deliveryLogs = [];

  connectors.forEach((c) => {
    (c.syncQueue || []).forEach((q) => {
      if (q.status === "pending" || q.status === "failed") totalPendingSync++;
      if (q.status === "synced") totalSynced++;
      if (q.status === "failed") totalFailed++;
      deliveryLogs.push({
        _id: q._id,
        connectorId: c._id,
        connectorName: c.connectorName,
        direction: q.direction || "outbound",
        eventType: q.eventType || "WEBHOOK_EVENT",
        httpStatus: q.httpStatus ?? null,
        latencyMs: q.latencyMs ?? null,
        responseSnippet: q.responseSnippet || "",
        status: q.status,
        attempts: q.attempts || 1,
        lastError: q.lastError || "",
        payload: q.payload || {},
        queuedAt: q.queuedAt
      });
    });
  });

  deliveryLogs.sort((a, b) => new Date(b.queuedAt) - new Date(a.queuedAt));

  const totalDeliveries = totalSynced + totalFailed;
  const webhookHealthScore =
    totalDeliveries > 0
      ? `${((totalSynced / totalDeliveries) * 100).toFixed(1)}%`
      : connectedCount > 0
      ? "100%"
      : "—";

  const platformWebhooks = [
    {
      key: "stripe",
      name: "Stripe Payment Webhooks",
      description: "Handles checkout completion, subscription renewals, and invoice payments.",
      endpointPath: "/api/stripe-webhooks",
      configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      partial: Boolean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_WEBHOOK_SECRET),
      envChecks: [
        { key: "STRIPE_SECRET_KEY", set: Boolean(process.env.STRIPE_SECRET_KEY) },
        { key: "STRIPE_WEBHOOK_SECRET", set: Boolean(process.env.STRIPE_WEBHOOK_SECRET) }
      ],
      events: ["checkout.session.completed", "invoice.paid", "customer.subscription.updated"]
    },
    {
      key: "razorpay",
      name: "Razorpay Payment Webhooks",
      description: "Verifies X-Razorpay-Signature and auto-marks CRM invoices paid or failed.",
      endpointPath: "/api/razorpay-webhooks",
      configured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RAZORPAY_KEY_ID),
      partial: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_ID),
      envChecks: [
        { key: "RAZORPAY_KEY_ID", set: Boolean(process.env.RAZORPAY_KEY_ID) },
        { key: "RAZORPAY_WEBHOOK_SECRET", set: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET) }
      ],
      events: ["payment.captured", "payment.failed"]
    },
    {
      key: "whatsapp",
      name: "WhatsApp Business Cloud API",
      description: "Receives Meta Cloud API incoming WhatsApp messages and creates/updates CRM leads.",
      endpointPath: "/api/whatsapp-webhooks",
      configured: Boolean(
        (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN) &&
        process.env.WHATSAPP_TOKEN &&
        process.env.WHATSAPP_PHONE_NUMBER_ID
      ),
      partial: Boolean(
        process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
        process.env.WHATSAPP_VERIFY_TOKEN ||
        process.env.WHATSAPP_TOKEN ||
        process.env.WHATSAPP_PHONE_NUMBER_ID
      ),
      envChecks: [
        { key: "WHATSAPP_TOKEN", set: Boolean(process.env.WHATSAPP_TOKEN) },
        { key: "WHATSAPP_PHONE_NUMBER_ID", set: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID) },
        {
          key: "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
          set: Boolean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN),
          fallbackNote: "Default fallback active"
        }
      ],
      events: ["messages.inbound", "webhook.verify"]
    }
  ];

  return res.json({
    summary: {
      totalSupportedConnectors: connectors.length,
      activeConnectorsCount: connectedCount,
      connectedCount,
      configuredCount,
      errorCount,
      totalSynced,
      totalFailed,
      totalPendingSync,
      webhookHealthScore
    },
    availableEvents: DEFAULT_EVENTS,
    deliveryLogs: deliveryLogs.slice(0, 60),
    platformWebhooks,
    connectors
  });
});

export const createWebhookEndpoint = asyncHandler(async (req, res) => {
  const tenantOwnerId = resolveTenantOwnerId(req.user);
  const { connectorName, description, webhookUrl, apiKey, events } = req.body;

  if (!connectorName || !String(connectorName).trim()) {
    throw new AppError("Webhook endpoint name is required", 400);
  }
  if (webhookUrl && !/^https?:\/\//i.test(webhookUrl)) {
    throw new AppError("Webhook URL must start with http:// or https://", 400);
  }

  const secret = (apiKey && String(apiKey).trim()) || generateSecret();
  const validEvents = Array.isArray(events) && events.length > 0 ? events : ["ticket.created", "lead.created"];

  const created = await EnterpriseIntegration.create({
    connectorKey: "webhooks",
    connectorName: String(connectorName).trim(),
    category: "automation",
    authType: "webhook_secret",
    status: webhookUrl ? "connected" : "disconnected",
    settings: {
      apiKeyMasked: maskSecret(secret),
      signingSecret: secret,
      webhookUrl: webhookUrl ? String(webhookUrl).trim() : "",
      description: description ? String(description).trim() : "",
      events: validEvents
    },
    lastSyncAt: webhookUrl ? new Date() : null,
    createdBy: tenantOwnerId,
    syncQueue: []
  });

  if (webhookUrl) {
    const ping = await dispatchWebhookHttp({
      connector: created,
      eventType: "webhook.verified",
      payload: { message: `Endpoint "${created.connectorName}" connected` }
    });
    pushDeliveryLog(created, {
      direction: "outbound",
      eventType: "webhook.verified",
      payload: { url: webhookUrl },
      httpStatus: ping.httpStatus,
      latencyMs: ping.latencyMs,
      responseSnippet: ping.responseSnippet,
      status: ping.ok ? "synced" : "failed",
      attempts: 1,
      lastError: ping.error
    });
    await created.save();
  }

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "WEBHOOK_ENDPOINT_CREATED",
    resource: "EnterpriseIntegration",
    resourceId: created._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { connectorName: created.connectorName, webhookUrl: created.settings.webhookUrl }
  });

  return res.status(201).json(created);
});

export const deleteWebhookEndpoint = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const connector = await EnterpriseIntegration.findById(id);
  if (!connector) throw new AppError("Webhook endpoint not found", 404);
  if (!isAuthorizedForConnector(req.user, connector)) {
    throw new AppError("Access denied: Unauthorized webhook endpoint", 403);
  }

  await EnterpriseIntegration.findByIdAndDelete(id);

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "WEBHOOK_ENDPOINT_DELETED",
    resource: "EnterpriseIntegration",
    resourceId: id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { connectorName: connector.connectorName }
  });

  return res.json({ deleted: true, id });
});

export const toggleConnectorStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, apiKey, webhookUrl, connectorName, description, events, regenerateSecret } = req.body;
  const tenantOwnerId = resolveTenantOwnerId(req.user);

  const connector = await EnterpriseIntegration.findById(id);
  if (!connector) throw new AppError("Webhook endpoint not found", 404);
  if (!isAuthorizedForConnector(req.user, connector)) {
    throw new AppError("Access denied: Unauthorized webhook endpoint", 403);
  }

  if (!connector.createdBy) connector.createdBy = tenantOwnerId;
  if (connectorName && String(connectorName).trim()) connector.connectorName = String(connectorName).trim();
  if (description !== undefined) connector.settings.description = String(description || "").trim();
  if (Array.isArray(events)) connector.settings.events = events;

  if (regenerateSecret) {
    const nextSecret = generateSecret();
    connector.settings.signingSecret = nextSecret;
    connector.settings.apiKeyMasked = maskSecret(nextSecret);
  } else if (apiKey && String(apiKey).trim()) {
    const cleanKey = String(apiKey).trim();
    connector.settings.signingSecret = cleanKey;
    connector.settings.apiKeyMasked = maskSecret(cleanKey);
  } else if (!connector.settings.signingSecret) {
    const nextSecret = generateSecret();
    connector.settings.signingSecret = nextSecret;
    connector.settings.apiKeyMasked = maskSecret(nextSecret);
  }

  if (webhookUrl !== undefined) {
    const trimmed = String(webhookUrl || "").trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      throw new AppError("Webhook URL must start with http:// or https://", 400);
    }
    connector.settings.webhookUrl = trimmed;
  }

  if (status) connector.status = status;
  if (status === "connected") connector.lastSyncAt = new Date();
  if (status === "disconnected") {
    connector.lastSyncAt = null;
  }

  await connector.save();

  const targetWebhook = connector.settings?.webhookUrl;
  if (status === "connected" && targetWebhook && /^https?:\/\//i.test(targetWebhook)) {
    const ping = await dispatchWebhookHttp({
      connector,
      eventType: "webhook.verified",
      payload: {
        status: connector.status,
        events: connector.settings.events,
        message: `Connection verified for ${connector.connectorName}`
      }
    });
    pushDeliveryLog(connector, {
      direction: "outbound",
      eventType: "webhook.verified",
      payload: { url: targetWebhook },
      httpStatus: ping.httpStatus,
      latencyMs: ping.latencyMs,
      responseSnippet: ping.responseSnippet,
      status: ping.ok ? "synced" : "failed",
      attempts: 1,
      lastError: ping.error
    });
    await connector.save();
  }

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: `INTEGRATION_CONNECTOR_${(status || "UPDATED").toUpperCase()}`,
    resource: "EnterpriseIntegration",
    resourceId: connector._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { connectorName: connector.connectorName, status: connector.status }
  });

  return res.json(connector);
});

export const testWebhookEndpoint = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { eventType = "webhook.test", samplePayload } = req.body || {};

  const connector = await EnterpriseIntegration.findById(id);
  if (!connector) throw new AppError("Webhook endpoint not found", 404);
  if (!isAuthorizedForConnector(req.user, connector)) {
    throw new AppError("Access denied: Unauthorized webhook endpoint", 403);
  }

  if (!connector.settings?.webhookUrl) {
    throw new AppError("Configure a Target Webhook URL before sending a test ping", 400);
  }

  const ping = await dispatchWebhookHttp({
    connector,
    eventType,
    payload: samplePayload || {
      sample: true,
      triggeredBy: req.user?.email || "admin",
      event: eventType,
      timestamp: new Date().toISOString()
    }
  });

  const logEntry = {
    direction: "outbound",
    eventType,
    payload: samplePayload || { url: connector.settings.webhookUrl, sample: true },
    httpStatus: ping.httpStatus,
    latencyMs: ping.latencyMs,
    responseSnippet: ping.responseSnippet,
    status: ping.ok ? "synced" : "failed",
    attempts: 1,
    lastError: ping.error
  };

  pushDeliveryLog(connector, logEntry);
  connector.lastSyncAt = new Date();
  await connector.save();

  return res.json({
    ok: ping.ok,
    httpStatus: ping.httpStatus,
    latencyMs: ping.latencyMs,
    responseSnippet: ping.responseSnippet,
    error: ping.error,
    delivery: connector.syncQueue[0]
  });
});

export const retrySyncQueue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { deliveryId } = req.body || {};

  const connector = await EnterpriseIntegration.findById(id);
  if (!connector) throw new AppError("Webhook endpoint not found", 404);
  if (!isAuthorizedForConnector(req.user, connector)) {
    throw new AppError("Access denied: Unauthorized webhook endpoint", 403);
  }

  if (!connector.settings?.webhookUrl) {
    throw new AppError("No target webhook URL configured for retry", 400);
  }

  const targets = connector.syncQueue.filter((q) => {
    if (deliveryId) return String(q._id) === String(deliveryId);
    return q.status === "pending" || q.status === "failed";
  });

  let succeeded = 0;
  let failed = 0;

  for (const item of targets.slice(0, 10)) {
    const ping = await dispatchWebhookHttp({
      connector,
      eventType: item.eventType || "WEBHOOK_RETRY",
      payload: item.payload || {}
    });
    item.attempts = (item.attempts || 0) + 1;
    item.httpStatus = ping.httpStatus;
    item.latencyMs = ping.latencyMs;
    item.responseSnippet = ping.responseSnippet;
    item.lastError = ping.error;
    item.status = ping.ok ? "synced" : "failed";
    if (ping.ok) succeeded++;
    else failed++;
  }

  connector.lastSyncAt = new Date();
  await connector.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "INTEGRATION_SYNC_QUEUE_RETRIED",
    resource: "EnterpriseIntegration",
    resourceId: connector._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { connectorName: connector.connectorName, succeeded, failed }
  });

  return res.json({ succeeded, failed, syncQueue: connector.syncQueue });
});

export const receiveInboundWebhook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const connector = await EnterpriseIntegration.findById(id);
  if (!connector) throw new AppError("Inbound webhook endpoint not found", 404);

  const providedSecret = req.get("x-webhook-secret") || req.get("x-api-key") || req.query.secret || "";
  const expectedSecret = connector.settings?.signingSecret || "";

  if (expectedSecret && providedSecret !== expectedSecret) {
    throw new AppError("Invalid webhook signing secret", 401);
  }

  const eventType = req.get("x-jts-event") || req.body?.event || "inbound.received";
  pushDeliveryLog(connector, {
    direction: "inbound",
    eventType,
    payload: req.body || {},
    httpStatus: 200,
    latencyMs: 1,
    responseSnippet: "Accepted by JTS Inbound Webhook Receiver",
    status: "synced",
    attempts: 1,
    lastError: ""
  });
  connector.lastSyncAt = new Date();
  await connector.save();

  return res.status(200).json({
    received: true,
    connectorId: connector._id,
    eventType,
    receivedAt: new Date().toISOString()
  });
});
