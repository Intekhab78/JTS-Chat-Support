import { Router } from "express";
import {
  getIntegrationOverview,
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  toggleConnectorStatus,
  testWebhookEndpoint,
  retrySyncQueue,
  receiveInboundWebhook
} from "../controllers/enterpriseIntegrationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";

const router = Router();

// Public inbound webhook receiver (verified via X-Webhook-Secret / X-API-Key)
router.post("/inbound/:id", receiveInboundWebhook);

router.use(requireAuth, attachTenantSubscription, requirePlanFeature("enterprise-integrations"));

router.get("/overview", requireRole("admin", "client", "manager", "management"), getIntegrationOverview);
router.post("/webhooks", requireRole("admin", "client", "manager"), createWebhookEndpoint);
router.delete("/webhooks/:id", requireRole("admin", "client", "manager"), deleteWebhookEndpoint);
router.post("/connect/:id", requireRole("admin", "client", "manager"), toggleConnectorStatus);
router.post("/test/:id", requireRole("admin", "client", "manager"), testWebhookEndpoint);
router.post("/retry-sync/:id", requireRole("admin", "client", "manager"), retrySyncQueue);

export default router;
