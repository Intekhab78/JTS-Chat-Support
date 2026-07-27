import { Router } from "express";
import {
  listRisks,
  createRisk,
  updateRisk,
  deleteRisk,
  addRiskComment
} from "../controllers/riskController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("admin", "client", "manager", "management", "tax_consultant"), listRisks);
router.post("/", requireRole("admin", "client", "manager", "management", "tax_consultant"), createRisk);
router.patch("/:id", requireRole("admin", "client", "manager", "management", "tax_consultant"), updateRisk);
router.delete("/:id", requireRole("admin", "client", "manager"), deleteRisk);
router.post("/:id/comments", requireRole("admin", "client", "manager", "management", "tax_consultant"), addRiskComment);

export default router;
