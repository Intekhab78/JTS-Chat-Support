import { Router } from "express";
import {
  getBiOverview,
  saveBiDashboard,
  scheduleBiReport
} from "../controllers/enterpriseBiAnalyticsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getBiOverview);
router.post("/dashboards", requireRole("admin", "client", "manager"), saveBiDashboard);
router.post("/schedule-report", requireRole("admin", "client", "manager"), scheduleBiReport);

export default router;
