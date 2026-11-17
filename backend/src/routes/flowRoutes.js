import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";
import {
  getFlows,
  getFlowById,
  getFlowsByWebsite,
  getFlowExecutiveSummary,
  createFlow,
  updateFlow,
  deleteFlow,
  listFlowTemplates,
  createFlowTemplate
} from "../controllers/flowController.js";

const router = express.Router();

router.use(requireAuth, attachTenantSubscription, requirePlanFeature("flows"));

router.get("/templates", listFlowTemplates);
router.post("/templates", createFlowTemplate);
router.get("/", getFlows);
router.get("/website/:websiteId", getFlowsByWebsite);
router.get("/:id/executive-summary", getFlowExecutiveSummary);
router.get("/:id", getFlowById);
router.post("/", createFlow);
router.put("/:id", updateFlow);
router.delete("/:id", deleteFlow);

export default router;
