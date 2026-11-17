import { Router } from "express";
import { listCannedResponses, createCannedResponse, updateCannedResponse, deleteCannedResponse } from "../controllers/cannedResponseController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";

const router = Router();

router.use(requireAuth, attachTenantSubscription, requirePlanFeature("service"));

router.get("/", requireRole("admin", "client", "manager", "agent", "sales", "user"), listCannedResponses);
router.post("/", requireRole("admin", "client", "manager", "agent"), createCannedResponse);
router.patch("/:id", requireRole("admin", "client", "manager", "agent"), updateCannedResponse);
router.delete("/:id", requireRole("admin", "client", "manager", "agent"), deleteCannedResponse);

export default router;
