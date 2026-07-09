import * as communicationHubService from "../services/communicationHubService.js";
import asyncHandler from "../utils/asyncHandler.js";

// Meta verification endpoint (hub challenge handshake)
export const verifyMetaWebhook = asyncHandler(async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  
  if (mode && token === (process.env.META_VERIFY_TOKEN || "jts_verify_token")) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Meta webhook events processor (Facebook & Instagram)
export const handleMetaWebhook = asyncHandler(async (req, res) => {
  const { object, entry } = req.body;
  if (!entry) return res.sendStatus(200);

  const websiteId = req.query.websiteId; // Enforced via query param in webhook registration

  for (const e of entry) {
    const messaging = e.messaging || [];
    for (const msg of messaging) {
      // 1. Process Message Text or Media Attachments
      if (msg.message && !msg.message.is_echo) {
        const fromId = msg.sender.id;
        const text = msg.message.text || "";
        const attachment = msg.message.attachments?.[0];
        const attachmentUrl = attachment?.payload?.url || null;
        const attachmentType = attachment?.type || null;
        const channel = object === "instagram" ? "instagram" : "facebook";

        await communicationHubService.receiveIncomingMessage({
          websiteId,
          channel,
          from: fromId,
          text,
          providerMessageId: msg.message.mid,
          attachmentUrl,
          attachmentType
        });
      }
      
      // 2. Process Read Receipts
      if (msg.read) {
        // Meta delivery status report
        // Simple update status for all messages in the thread can be simulated or specific watermark midday mid
        console.log(`[Meta Webhook] Read receipt received for watermark ${msg.read.watermark}`);
      }
    }
  }
  res.sendStatus(200);
});

// Twilio webhook processor (WhatsApp & SMS)
export const handleTwilioWebhook = asyncHandler(async (req, res) => {
  const { MessageSid, From, Body, SmsStatus, MessageStatus } = req.body;
  const websiteId = req.query.websiteId;

  // Process Twilio Outbound Status Callbacks
  if (SmsStatus || MessageStatus) {
    const status = SmsStatus || MessageStatus;
    let mappedStatus = "sent";
    if (status === "delivered" || status === "sent") mappedStatus = "delivered";
    else if (status === "read") mappedStatus = "read";
    else if (status === "failed" || status === "undelivered") mappedStatus = "failed";

    await communicationHubService.updateMessageStatus(MessageSid, mappedStatus);
    return res.sendStatus(200);
  }

  // Process Incoming Twilio Message Webhooks
  if (From && Body) {
    const channel = From.startsWith("whatsapp:") ? "whatsapp" : "sms";
    const cleanFrom = From.replace("whatsapp:", "");

    await communicationHubService.receiveIncomingMessage({
      websiteId,
      channel,
      from: cleanFrom,
      text: Body,
      providerMessageId: MessageSid
    });
  }

  res.sendStatus(200);
});
