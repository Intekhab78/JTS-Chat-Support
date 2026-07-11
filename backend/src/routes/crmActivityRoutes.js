import { Router } from "express";
import * as activityController from "../controllers/crmActivityController.js";

const router = Router();

router.get("/", activityController.listActivities);
router.post("/", activityController.createActivity);
router.patch("/:id", activityController.updateActivity);
router.put("/:id", activityController.updateActivity);  // alias for frontend PUT calls
router.delete("/:id", activityController.deleteActivity);

export default router;
