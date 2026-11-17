import { Router } from "express";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roleController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";
import { PERMISSIONS, requireAnyPermission } from "../utils/permissions.js";

const router = Router();

router.use(requireAuth, attachTenantSubscription);

router.get("/", getRoles);
router.post("/", requireRole("admin", "client"), requireAnyPermission(PERMISSIONS.ROLE_MANAGE, PERMISSIONS.SETTINGS_MANAGE), requirePlanFeature("security"), createRole);
router.patch("/:id", requireRole("admin", "client"), requireAnyPermission(PERMISSIONS.ROLE_MANAGE, PERMISSIONS.SETTINGS_MANAGE), requirePlanFeature("security"), updateRole);
router.delete("/:id", requireRole("admin", "client"), requireAnyPermission(PERMISSIONS.ROLE_MANAGE, PERMISSIONS.SETTINGS_MANAGE), requirePlanFeature("security"), deleteRole);

export default router;
