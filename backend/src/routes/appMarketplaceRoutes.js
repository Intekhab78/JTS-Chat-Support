import { Router } from "express";
import {
  getMarketplaceOverview,
  installPlugin,
  togglePluginActive,
  uninstallPlugin
} from "../controllers/appMarketplaceController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getMarketplaceOverview);
router.post("/plugins/:id/install", requireRole("admin", "client", "manager"), installPlugin);
router.post("/plugins/:id/toggle", requireRole("admin", "client", "manager"), togglePluginActive);
router.post("/plugins/:id/uninstall", requireRole("admin", "client", "manager"), uninstallPlugin);

export default router;
