import { Router } from "express";
import {
  getDeveloperOverview,
  searchApiCatalog,
  getOpenApiSpec,
  getSchemaDetail,
  listDeveloperApiKeys,
  createDeveloperApiKey,
  revokeDeveloperApiKey,
  deleteDeveloperApiKey
} from "../controllers/developerPortalController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Strictly restricted to Superadmin / Global Admin
router.use(requireAuth, requireRole("admin"));

router.get("/overview", getDeveloperOverview);
router.get("/apis", searchApiCatalog);
router.get("/openapi.json", getOpenApiSpec);
router.get("/schemas/:modelName", getSchemaDetail);

router.get("/api-keys", listDeveloperApiKeys);
router.post("/api-keys", createDeveloperApiKey);
router.patch("/api-keys/:id/revoke", revokeDeveloperApiKey);
router.delete("/api-keys/:id", deleteDeveloperApiKey);

export default router;
