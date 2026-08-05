import express from "express";
import { 
  listSubscriptionPlans, 
  createSubscriptionPlan, 
  updateSubscriptionPlan, 
  deleteSubscriptionPlan 
} from "../controllers/subscriptionPlanController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Public route for landing page & checkout pricing
router.get("/", listSubscriptionPlans);

// Protected Admin CRUD operations
router.post("/", requireAuth, requireRole("admin"), createSubscriptionPlan);
router.patch("/:id", requireAuth, requireRole("admin"), updateSubscriptionPlan);
router.delete("/:id", requireAuth, requireRole("admin"), deleteSubscriptionPlan);

export default router;
