import { Router } from "express";
import {
  getIntegrationOverview,
  toggleConnectorStatus,
  retrySyncQueue
} from "../controllers/enterpriseIntegrationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getIntegrationOverview);
router.post("/connect/:id", requireRole("admin", "client", "manager"), toggleConnectorStatus);
router.post("/retry-sync/:id", requireRole("admin", "client", "manager"), retrySyncQueue);

export default router;
