import { Customer } from "../models/Customer.js";
import { createActivityEvent } from "../services/activityService.js";
import { getSocketServer } from "../sockets/index.js";
import { generateCRN } from "../services/customerService.js";

/**
 * Verify WhatsApp webhook token (required by Meta Cloud API setup)
 */
export async function verifyWebhook(req, res) {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "jts_crm_whatsapp_verify_token_2026";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[WhatsApp Webhook] Verification successful.");
      return res.status(200).send(challenge);
    } else {
      console.warn("[WhatsApp Webhook] Verification failed: Token mismatch.");
      return res.status(403).json({ message: "Verification token mismatch" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

/**
 * Handle incoming WhatsApp messaging payloads
 */
export async function handleIncomingMessage(req, res) {
  try {
    const body = req.body;
    console.log("[WhatsApp Webhook] Received payload:", JSON.stringify(body, null, 2));

    // Check if this is a standard message payload
    if (body.object === "whatsapp_business_account" && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const changeValue = body.entry[0].changes[0].value;
      const message = changeValue.messages[0];
      const contact = changeValue.contacts?.[0] || {};
      
      const fromPhone = message.from; // Sender phone number
      const senderName = contact.profile?.name || `WhatsApp Contact (${fromPhone})`;
      const textBody = message.text?.body || "[Media / Attachment]";
      
      console.log(`[WhatsApp Message] From: ${fromPhone} (${senderName}): ${textBody}`);

      // Locate corresponding customer record by matching phone number in database
      // Clean phone check (matching last 10 digits to handle international country code variances)
      const cleanPhoneQuery = fromPhone.slice(-10);
      let customer = await Customer.findOne({ 
        phone: new RegExp(cleanPhoneQuery + "$") 
      });

      if (!customer) {
        console.log(`[WhatsApp] No existing customer found for ${fromPhone}. Creating new CRM lead...`);
        const crn = await generateCRN();
        customer = await Customer.create({
          crn,
          name: senderName,
          phone: "+" + fromPhone,
          recordType: "lead",
          pipelineStage: "new",
          leadSource: "whatsapp_cloud_api"
        });
      }

      // Log interaction in customer's Activity Feed/Timeline
      await createActivityEvent({
        customerId: customer._id,
        websiteId: customer.websiteId || null,
        type: "communication",
        action: "whatsapp_received",
        details: `Received WhatsApp: "${textBody}"`,
        metadata: {
          from: fromPhone,
          messageId: message.id,
          text: textBody
        }
      });

      // Broadcast socket update to client terminals so agents see message instantly
      const io = getSocketServer();
      if (io) {
        io.to(String(customer._id)).emit("whatsapp_message_received", {
          customerId: customer._id,
          from: fromPhone,
          text: textBody,
          timestamp: new Date()
        });
        io.emit("crm_timeline_refresh", { customerId: customer._id });
      }
    }

    // Always respond with 200 OK to confirm receipt
    return res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("[WhatsApp Webhook] Handle Error:", error.message);
    return res.status(500).json({ message: error.message });
  }
}
