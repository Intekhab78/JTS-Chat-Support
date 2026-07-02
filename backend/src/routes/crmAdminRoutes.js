import { Router } from "express";
import * as adminController from "../controllers/crmAdminController.js";

const router = Router();

// Org configuration
router.get("/config", adminController.getTenantConfig);
router.post("/config", adminController.saveTenantConfig);

// Feature Flags
router.get("/feature-flags", adminController.listFeatureFlags);
router.post("/feature-flags", adminController.createFeatureFlag);

// Custom fields registry
router.get("/custom-fields", adminController.listCustomFields);
router.post("/custom-fields", adminController.createCustomField);

// Session monitoring
router.get("/sessions", adminController.listSessionAudits);
router.post("/sessions/revoke/:id", adminController.revokeSession);

export default router;
