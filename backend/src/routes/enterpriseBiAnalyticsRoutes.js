import { Router } from "express";
import {
  getBiOverview,
  saveBiDashboard,
  deleteBiDashboard,
  scheduleBiReport,
  deleteScheduledBiReport
} from "../controllers/enterpriseBiAnalyticsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";

const router = Router();

router.use(requireAuth, attachTenantSubscription, requirePlanFeature("enterprise-bi"));

router.get("/overview", requireRole("admin", "client", "manager", "management"), getBiOverview);
router.post("/dashboards", requireRole("admin", "client", "manager"), saveBiDashboard);
router.delete("/dashboards/:id", requireRole("admin", "client", "manager"), deleteBiDashboard);
router.post("/schedule-report", requireRole("admin", "client", "manager"), scheduleBiReport);
router.delete("/schedule-report/:dashboardId/:reportId", requireRole("admin", "client", "manager"), deleteScheduledBiReport);

export default router;
