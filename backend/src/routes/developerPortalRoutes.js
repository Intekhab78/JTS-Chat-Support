import { Router } from "express";
import {
  getDeveloperOverview,
  searchApiCatalog
} from "../controllers/developerPortalController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getDeveloperOverview);
router.get("/apis", requireRole("admin", "client", "manager", "management"), searchApiCatalog);

export default router;
