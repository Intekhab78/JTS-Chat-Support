import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";
import { getFlows, getFlowById, createFlow, updateFlow, deleteFlow } from "../controllers/flowController.js";

const router = express.Router();

router.use(requireAuth, attachTenantSubscription, requirePlanFeature("flows"));

router.get("/", getFlows);
router.get("/:id", getFlowById);
router.post("/", createFlow);
router.put("/:id", updateFlow);
router.delete("/:id", deleteFlow);

export default router;
