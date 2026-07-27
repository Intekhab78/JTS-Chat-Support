import { Router } from "express";
import {
  getLoadTestHistory,
  runLoadSimulation,
  deleteLoadTestResult
} from "../controllers/loadTestController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/history", requireRole("admin", "client", "manager", "management"), getLoadTestHistory);
router.post("/run", requireRole("admin", "client", "manager"), runLoadSimulation);
router.delete("/history/:id", requireRole("admin", "client"), deleteLoadTestResult);

export default router;
