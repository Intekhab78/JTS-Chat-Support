import { Router } from "express";
import {
  getStudioOverview,
  createStudioPage,
  exportPageJson,
  deleteStudioPage
} from "../controllers/lowCodeStudioController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getStudioOverview);
router.post("/pages", requireRole("admin", "client", "manager"), createStudioPage);
router.get("/pages/:id/export", requireRole("admin", "client", "manager"), exportPageJson);
router.delete("/pages/:id", requireRole("admin", "client", "manager"), deleteStudioPage);

export default router;
