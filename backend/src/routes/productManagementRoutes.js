import { Router } from "express";
import {
  getProductOverview,
  listFeatures,
  createFeature,
  updateFeatureStatus,
  voteFeature,
  deleteFeature
} from "../controllers/productManagementController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getProductOverview);
router.get("/features", requireRole("admin", "client", "manager", "management"), listFeatures);
router.post("/features", requireRole("admin", "client", "manager"), createFeature);
router.patch("/features/:id/status", requireRole("admin", "client", "manager"), updateFeatureStatus);
router.post("/features/:id/vote", requireRole("admin", "client", "manager", "user"), voteFeature);
router.delete("/features/:id", requireRole("admin", "client", "manager"), deleteFeature);

export default router;
