import { Router } from "express";
import {
  getObservabilityOverview,
  searchAuditLogs,
  listAlertRules,
  createAlertRule,
  deleteAlertRule
} from "../controllers/observabilityController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getObservabilityOverview);
router.get("/logs", requireRole("admin", "client", "manager", "management"), searchAuditLogs);
router.get("/alerts", requireRole("admin", "client", "manager", "management"), listAlertRules);
router.post("/alerts", requireRole("admin", "client", "manager"), createAlertRule);
router.delete("/alerts/:id", requireRole("admin", "client", "manager"), deleteAlertRule);

export default router;
