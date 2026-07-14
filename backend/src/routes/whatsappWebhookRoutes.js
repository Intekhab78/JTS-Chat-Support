import express from "express";
import { verifyWebhook, handleIncomingMessage } from "../controllers/whatsappWebhookController.js";

const router = express.Router();

// GET for Facebook Webhook subscribe verification challenge
router.get("/", verifyWebhook);

// POST for handling inbound message payloads from WhatsApp API
router.post("/", handleIncomingMessage);

export default router;
