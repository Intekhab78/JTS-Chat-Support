import { Router } from "express";
import * as webhookController from "../controllers/crmCommunicationWebhookController.js";

const router = Router();

// Twilio webhooks (whatsapp & sms share the same twilio handlers)
router.post("/webhooks/twilio", webhookController.handleTwilioWebhook);

// Meta webhooks (Facebook Messenger & Instagram Messaging)
router.get("/webhooks/meta", webhookController.verifyMetaWebhook);
router.post("/webhooks/meta", webhookController.handleMetaWebhook);

export default router;
