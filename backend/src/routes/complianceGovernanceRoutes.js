import { Router } from "express";
import {
  getComplianceOverview,
  submitDsarRequest,
  updateDsarStatus
} from "../controllers/complianceGovernanceController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getComplianceOverview);
router.post("/dsar", requireRole("admin", "client", "manager"), submitDsarRequest);
router.patch("/dsar/:id/status", requireRole("admin", "client", "manager"), updateDsarStatus);

export default router;
