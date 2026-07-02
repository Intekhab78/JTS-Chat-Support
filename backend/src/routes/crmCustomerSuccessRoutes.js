import { Router } from "express";
import * as customerSuccessController from "../controllers/crmCustomerSuccessController.js";

const router = Router();

router.get("/", customerSuccessController.listSuccessProfiles);
router.post("/", customerSuccessController.createOrUpdateSuccessProfile);
router.patch("/checklist", customerSuccessController.updateOnboardingChecklist);

export default router;
