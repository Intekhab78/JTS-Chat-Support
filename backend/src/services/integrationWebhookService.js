import crypto from "crypto";
import { performance } from "perf_hooks";
import { EnterpriseIntegration } from "../models/EnterpriseIntegration.js";
import { Website } from "../models/Website.js";

export async function dispatchWebhookHttp({ connector, eventType, payload }) {
  const url = connector.settings?.webhookUrl;
  if (!url || !/^https?:\/\//i.test(url)) {
    return {
      ok: false,
      httpStatus: null,
      latencyMs: 0,
      responseSnippet: "",
      error: "Invalid or missing HTTP(S) webhook URL"
    };
  }

  const secret = connector.settings?.signingSecret || "";
  const deliveryId = crypto.randomUUID();
  const bodyObj = {
    id: deliveryId,
    event: eventType || "WEBHOOK_EVENT",
    createdAt: new Date().toISOString(),
    connectorId: connector._id,
    connectorName: connector.connectorName,
    data: payload || {}
  };
  const bodyStr = JSON.stringify(bodyObj);
  const signature = secret
    ? `sha256=${crypto.createHmac("sha256", secret).update(bodyStr).digest("hex")}`
    : "";

  const start = performance.now();
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "JTS-Enterprise-Webhook-Engine/2.0",
        "X-JTS-Event": eventType || "WEBHOOK_EVENT",
        "X-JTS-Delivery": deliveryId,
        ...(signature ? { "X-JTS-Signature": signature } : {})
      },
      body: bodyStr,
      signal: AbortSignal.timeout(5000)
    });
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    let text = "";
    try {
      text = (await resp.text()).slice(0, 240);
    } catch {
      text = "";
    }
    return {
      ok: resp.ok,
      httpStatus: resp.status,
      latencyMs,
      responseSnippet: text,
      error: resp.ok ? "" : `HTTP ${resp.status}${text ? `: ${text.slice(0, 80)}` : ""}`
    };
  } catch (err) {
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    return {
      ok: false,
      httpStatus: null,
      latencyMs,
      responseSnippet: "",
      error: err?.message || "Network timeout / unreachable endpoint"
    };
  }
}

export function pushDeliveryLog(connector, entry) {
  connector.syncQueue.unshift(entry);
  if (connector.syncQueue.length > 50) {
    connector.syncQueue = connector.syncQueue.slice(0, 50);
  }
}

/**
 * Fire-and-forget emitter for real SaaS events (ticket.created, ticket.resolved,
 * lead.created, customer.created, deal.won, invoice.paid, chat.started).
 */
export async function emitIntegrationEvent({ eventType, payload = {}, websiteId = null, ownerId = null }) {
  try {
    if (!eventType) return;

    let resolvedOwnerId = ownerId;
    if (!resolvedOwnerId && websiteId) {
      const ws = await Website.findById(websiteId).select("clientId managerId").lean();
      resolvedOwnerId = ws?.clientId || ws?.managerId || null;
    }

    const query = {
      status: "connected",
      "settings.webhookUrl": { $regex: /^https?:\/\//i }
    };
    const candidates = await EnterpriseIntegration.find(query);
    if (!candidates.length) return;

    const matching = candidates.filter((ep) => {
      if (resolvedOwnerId && ep.createdBy && String(ep.createdBy) !== String(resolvedOwnerId)) {
        // Also allow global admin-created endpoints if no tenant match? Keep strict tenant isolation when owner known,
        // unless endpoint has no createdBy.
        return false;
      }
      const subscribed = ep.settings?.events || [];
      return subscribed.length === 0 || subscribed.includes(eventType);
    });

    await Promise.allSettled(
      matching.map(async (connector) => {
        const ping = await dispatchWebhookHttp({ connector, eventType, payload });
        pushDeliveryLog(connector, {
          direction: "outbound",
          eventType,
          payload,
          httpStatus: ping.httpStatus,
          latencyMs: ping.latencyMs,
          responseSnippet: ping.responseSnippet,
          status: ping.ok ? "synced" : "failed",
          attempts: 1,
          lastError: ping.error
        });
        connector.lastSyncAt = new Date();
        await connector.save();
      })
    );
  } catch (err) {
    console.warn(`[IntegrationWebhook] emitIntegrationEvent(${eventType}) warning:`, err?.message);
  }
}

