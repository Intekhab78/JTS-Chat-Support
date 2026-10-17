import { Router } from "express";
import {
  getOrganizationOverview,
  createOrganizationNode,
  updateOrgPolicies,
  getCrossSubsidiaryAnalytics,
  assignEntityToOrganization
} from "../controllers/multiOrganizationController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";

const router = Router();

router.use(requireAuth, attachTenantSubscription, requirePlanFeature("multi-organization"));

router.get("/overview", requireRole("admin", "client", "manager", "management"), getOrganizationOverview);
router.get("/consolidated-analytics", requireRole("admin", "client", "manager", "management"), getCrossSubsidiaryAnalytics);
router.post("/assign", requireRole("admin", "client", "manager"), assignEntityToOrganization);
router.post("/nodes", requireRole("admin", "client", "manager"), createOrganizationNode);
router.post("/policies/:id", requireRole("admin", "client", "manager"), updateOrgPolicies);

export default router;

