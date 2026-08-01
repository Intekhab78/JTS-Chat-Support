import express from "express";
import { 
  listSubscriptionPlans, 
  createSubscriptionPlan, 
  updateSubscriptionPlan, 
  deleteSubscriptionPlan 
} from "../controllers/subscriptionPlanController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", listSubscriptionPlans);
router.post("/", requireRole("admin"), createSubscriptionPlan);
router.patch("/:id", requireRole("admin"), updateSubscriptionPlan);
router.delete("/:id", requireRole("admin"), deleteSubscriptionPlan);

export default router;
