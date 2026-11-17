import { Router } from "express";
import { createWebsite, listWebsites, getWebsite, updateWebsite, deleteWebsite, testWebsiteWebhook } from "../controllers/websiteController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { checkPlanLimit } from "../middleware/planAccess.js";
import { PERMISSIONS, requireAnyPermission } from "../utils/permissions.js";

const router = Router();

router.use(requireAuth);

// Everyone (including agents, sales, tax consultants, management, etc.) can list and get website details
router.get("/", listWebsites);
router.get("/:id", getWebsite);

// Only managers/clients/admins with settings.manage permission can create, update or delete websites
router.post("/", requireRole("admin", "client", "manager"), requireAnyPermission(PERMISSIONS.SETTINGS_MANAGE), checkPlanLimit("websites"), createWebsite);
router.patch("/:id", requireRole("admin", "client", "manager"), requireAnyPermission(PERMISSIONS.SETTINGS_MANAGE), updateWebsite);
router.patch("/:id/widget-config", requireRole("admin", "client", "manager"), requireAnyPermission(PERMISSIONS.SETTINGS_MANAGE), updateWebsite);
router.post("/:id/test-webhook", requireRole("admin", "client", "manager"), requireAnyPermission(PERMISSIONS.SETTINGS_MANAGE), testWebsiteWebhook);
router.delete("/:id", requireRole("admin", "client", "manager"), requireAnyPermission(PERMISSIONS.SETTINGS_MANAGE), deleteWebsite);

export default router;

