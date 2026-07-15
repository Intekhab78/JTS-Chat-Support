import { Router } from "express";
import * as planController from "../controllers/crmPlanController.js";

const router = Router();

router.get("/", planController.listPlans);
router.post("/", planController.createPlan);
router.put("/:id", planController.updatePlan);
router.delete("/:id", planController.deletePlan);

export default router;
