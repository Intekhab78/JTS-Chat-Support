import { Router } from "express";
import { getManagerAnalytics, exportAnalyticsCSV, getAgentAnalytics } from "../controllers/analyticsController.js";
import { getSalesPerformanceStats } from "../controllers/salesAnalyticsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin", "client", "manager", "accounts"), getManagerAnalytics);
router.get("/sales", requireAuth, requireRole("admin", "client", "manager", "sales"), getSalesPerformanceStats);
router.get("/agent", requireAuth, requireRole("agent", "sales", "user"), getAgentAnalytics);
router.get("/export/csv", requireAuth, requireRole("admin", "client", "manager", "accounts"), attachTenantSubscription, requirePlanFeature("reports"), exportAnalyticsCSV);

export default router;
