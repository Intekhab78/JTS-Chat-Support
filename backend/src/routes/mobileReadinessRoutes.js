import { Router } from "express";
import {
  getMobileOverview,
  processOfflineSync,
  logDeviceTelemetry
} from "../controllers/mobileReadinessController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getMobileOverview);
router.post("/sync", requireRole("admin", "client", "manager"), processOfflineSync);
router.post("/device-log", requireRole("admin", "client", "manager", "user"), logDeviceTelemetry);

export default router;
