import { Router } from "express";
import {
  getWorkflowOverview,
  createWorkflow,
  executeWorkflowManual,
  deleteWorkflow
} from "../controllers/noCodeWorkflowController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getWorkflowOverview);
router.post("/workflows", requireRole("admin", "client", "manager"), createWorkflow);
router.post("/workflows/:id/execute", requireRole("admin", "client", "manager"), executeWorkflowManual);
router.delete("/workflows/:id", requireRole("admin", "client", "manager"), deleteWorkflow);

export default router;
