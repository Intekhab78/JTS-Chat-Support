import { Router } from "express";
import * as adminController from "../controllers/crmAdminController.js";

const router = Router();

// Org configuration
router.get("/config", adminController.getTenantConfig);
router.post("/config", adminController.saveTenantConfig);

// Feature Flags
router.get("/feature-flags", adminController.listFeatureFlags);
router.post("/feature-flags", adminController.createFeatureFlag);
router.put("/feature-flags/:id", adminController.updateFeatureFlag);
router.delete("/feature-flags/:id", adminController.deleteFeatureFlag);

// Custom fields registry
router.get("/custom-fields", adminController.listCustomFields);
router.post("/custom-fields", adminController.createCustomField);
router.put("/custom-fields/:id", adminController.updateCustomField);
router.delete("/custom-fields/:id", adminController.deleteCustomField);

// Session monitoring
router.get("/sessions", adminController.listSessionAudits);
router.post("/sessions/revoke/:id", adminController.revokeSession);

export default router;
