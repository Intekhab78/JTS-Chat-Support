import { Router } from "express";
import {
  getReleaseOverview,
  listReleases,
  createRelease,
  updateReleaseStatus,
  runSmokeTests
} from "../controllers/releaseManagementController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getReleaseOverview);
router.get("/releases", requireRole("admin", "client", "manager", "management"), listReleases);
router.post("/releases", requireRole("admin", "client", "manager"), createRelease);
router.patch("/releases/:id/status", requireRole("admin", "client", "manager"), updateReleaseStatus);
router.post("/smoke-tests", requireRole("admin", "client", "manager"), runSmokeTests);

export default router;
