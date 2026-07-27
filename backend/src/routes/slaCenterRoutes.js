import { Router } from "express";
import {
  getSlaOverview,
  listSlaPolicies,
  createSlaPolicy,
  updateSlaPolicy,
  deleteSlaPolicy
} from "../controllers/slaCenterController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management", "tax_consultant"), getSlaOverview);
router.get("/policies", requireRole("admin", "client", "manager", "management", "tax_consultant"), listSlaPolicies);
router.post("/policies", requireRole("admin", "client", "manager", "management"), createSlaPolicy);
router.patch("/policies/:id", requireRole("admin", "client", "manager", "management"), updateSlaPolicy);
router.delete("/policies/:id", requireRole("admin", "client", "manager"), deleteSlaPolicy);

export default router;
