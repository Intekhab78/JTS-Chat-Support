import { Router } from "express";
import * as workflowController from "../controllers/crmWorkflowController.js";

const router = Router();

router.get("/", workflowController.listWorkflows);
router.post("/", workflowController.createWorkflow);
router.put("/:id", workflowController.updateWorkflow);
router.delete("/:id", workflowController.deleteWorkflow);

router.get("/executions", workflowController.listExecutions);
router.post("/trigger/:id", workflowController.triggerWorkflowManually);

export default router;
