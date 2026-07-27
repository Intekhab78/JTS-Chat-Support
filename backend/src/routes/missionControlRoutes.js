import { Router } from "express";
import {
  getMissionControlTelemetry,
  executeCommandPaletteAction,
  generateAiExecutiveSummary
} from "../controllers/missionControlController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/telemetry", requireRole("admin", "client", "manager", "management"), getMissionControlTelemetry);
router.post("/command-palette", requireRole("admin", "client", "manager"), executeCommandPaletteAction);
router.post("/generate-ai-summary", requireRole("admin", "client", "manager"), generateAiExecutiveSummary);

export default router;
