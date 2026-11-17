import { Router } from "express";
import { listAuditLogs } from "../controllers/auditController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";
import { PERMISSIONS, requireAnyPermission } from "../utils/permissions.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin", "client", "manager", "management"), requireAnyPermission(PERMISSIONS.AUDIT_VIEW), attachTenantSubscription, requirePlanFeature("security"), listAuditLogs);

export default router;
