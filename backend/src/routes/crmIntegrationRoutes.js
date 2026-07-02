import { Router } from "express";
import * as integrationController from "../controllers/crmIntegrationController.js";

const router = Router();

// API Keys
router.get("/keys", integrationController.listApiKeys);
router.post("/keys", integrationController.createApiKey);
router.post("/keys/revoke/:id", integrationController.revokeApiKey);

// OAuth Apps
router.get("/oauth", integrationController.listOauthApps);
router.post("/oauth", integrationController.createOauthApp);

// Outbound Webhooks Logs
router.get("/webhooks", integrationController.listWebhookLogs);
router.post("/webhooks/trigger", integrationController.triggerSandboxWebhook);

export default router;
