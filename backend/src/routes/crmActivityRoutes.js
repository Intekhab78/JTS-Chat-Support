import { Router } from "express";
import * as activityController from "../controllers/crmActivityController.js";

const router = Router();

router.get("/", activityController.listActivities);
router.post("/", activityController.createActivity);
router.delete("/:id", activityController.deleteActivity);

export default router;
