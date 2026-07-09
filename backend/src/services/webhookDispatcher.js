import crypto from "crypto";
import { WebhookDeliveryLog } from "../models/WebhookDeliveryLog.js";

/**
 * Centred Outbound Webhook Dispatcher
 * Automatically signs payload cryptographically to prevent spoofing.
 */
export async function dispatchWebhookEvent(websiteId, eventName, url, payload = {}) {
  console.log(`[Webhook Dispatcher] Dispatching "${eventName}" event to URL: ${url}`);
  
  const latencyStart = Date.now();
  let status = "sent";
  let httpStatus = 200;
  
  try {
    // Generate signature header: SHA256 HMAC of JSON payload
    const payloadStr = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", "jts_webhook_secret_key")
      .update(payloadStr)
      .digest("hex");

    console.log(`[Webhook Dispatcher] Generated Header x-jts-signature: ${signature}`);

    // Perform actual outbound HTTP POST Request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-jts-signature": signature
      },
      body: payloadStr,
      signal: AbortSignal.timeout(5000)
    });

    httpStatus = response.status;
    status = response.ok ? "sent" : "failed";
    console.log(`[Webhook Dispatcher] Payload delivered. HTTP Status: ${httpStatus}`);
  } catch (err) {
    console.error(`[Webhook Dispatcher] Delivery failed:`, err.message);
    status = "failed";
    httpStatus = err.name === "TimeoutError" ? 408 : 500;
  } finally {
    // Save audit log trace
    await WebhookDeliveryLog.create({
      websiteId,
      eventName,
      url,
      status,
      httpStatus,
      latencyMs: Date.now() - latencyStart
    });
  }
}
