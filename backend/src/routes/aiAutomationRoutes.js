import { Router } from "express";
import {
  getAiAutomationOverview,
  addPromptTemplate,
  addAutomationRule,
  simulateOcrExtraction
} from "../controllers/aiAutomationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getAiAutomationOverview);
router.post("/prompts", requireRole("admin", "client", "manager"), addPromptTemplate);
router.post("/automation-rules", requireRole("admin", "client", "manager"), addAutomationRule);
router.post("/ocr-extract-placeholder", requireRole("admin", "client", "manager"), simulateOcrExtraction);

export default router;
