import { Router } from "express";
import { listWebhookDeliveries, handleJtsMeetWebhook } from "../controllers/webhookController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/deliveries", requireAuth, requireRole("admin", "client"), listWebhookDeliveries);

// JTS Meet Inbound Webhook Endpoints (both POST and health check)
router.post("/jts-meet", handleJtsMeetWebhook);
router.get("/jts-meet", (req, res) => res.status(200).json({ success: true, status: "alive", service: "JTS Support Webhook Gateway" }));

// Fallback direct root handlers
router.post("/", handleJtsMeetWebhook);
router.get("/", (req, res) => res.status(200).json({ success: true, status: "alive" }));

export default router;
