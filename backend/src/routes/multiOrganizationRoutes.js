import { Router } from "express";
import {
  getOrganizationOverview,
  createOrganizationNode,
  updateOrgPolicies
} from "../controllers/multiOrganizationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getOrganizationOverview);
router.post("/nodes", requireRole("admin", "client", "manager"), createOrganizationNode);
router.post("/policies/:id", requireRole("admin", "client", "manager"), updateOrgPolicies);

export default router;
