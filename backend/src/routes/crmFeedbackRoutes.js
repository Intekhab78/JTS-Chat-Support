import { Router } from "express";
import * as feedbackController from "../controllers/crmFeedbackController.js";

const router = Router();

router.get("/", feedbackController.listFeedback);
router.post("/", feedbackController.createFeedback);

export default router;
