import { Router } from "express";
import * as webhookController from "../controllers/crmCommunicationWebhookController.js";
import { WhatsAppProviderManager } from "../services/providers/whatsappProvider.js";
import { TelegramProviderManager } from "../services/providers/telegramProvider.js";
import { logCrmActivity } from "../services/activityLoggerService.js";

const router = Router();

// Twilio webhooks (whatsapp & sms share the same twilio handlers)
router.post("/webhooks/twilio", webhookController.handleTwilioWebhook);

// Meta webhooks (Facebook Messenger & Instagram Messaging)
router.get("/webhooks/meta", webhookController.verifyMetaWebhook);
router.post("/webhooks/meta", webhookController.handleMetaWebhook);

// Direct outbound WhatsApp message dispatch
router.post("/send-whatsapp", async (req, res) => {
  try {
    const { to, message, customerId, templateName } = req.body;
    if (!to) {
      return res.status(400).json({ success: false, error: "Recipient phone number 'to' is required." });
    }

    const provider = WhatsAppProviderManager.getProvider("meta");
    let result;
    if (templateName) {
      result = await provider.sendTemplate({ to, templateName });
    } else {
      result = await provider.sendMessage({ to, message });
    }

    if (customerId) {
      await logCrmActivity({
        type: "communication",
        title: `WhatsApp Message Dispatched to ${to}`,
        description: message || `Template: ${templateName}`,
        customerId,
        ownerId: req.user?._id
      }).catch(() => {});
    }

    return res.json({
      success: true,
      result,
      provider: "meta_cloud_api",
      mode: result?.mode || "live"
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Direct outbound Telegram bot dispatch
router.post("/send-telegram", async (req, res) => {
  try {
    const { chatId, text, customerId } = req.body;
    const targetChatId = chatId || "5055032301";
    const msgText = text || "Hello from JTS Chat Support Telegram Bot!";

    const provider = TelegramProviderManager.getProvider();
    const result = await provider.sendMessage({
      chatId: targetChatId,
      text: msgText
    });

    if (customerId) {
      await logCrmActivity({
        type: "communication",
        title: `Telegram Alert Dispatched to Chat ${targetChatId}`,
        description: msgText,
        customerId,
        ownerId: req.user?._id
      }).catch(() => {});
    }

    return res.json({
      success: true,
      result,
      provider: "telegram_bot_api",
      mode: result?.mode || "live"
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


