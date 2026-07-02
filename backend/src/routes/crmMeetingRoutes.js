import { Router } from "express";
import * as meetingController from "../controllers/crmMeetingController.js";

const router = Router();

router.get("/", meetingController.listMeetings);
router.post("/", meetingController.createMeeting);
router.patch("/:id", meetingController.updateMeeting);
router.delete("/:id", meetingController.deleteMeeting);

export default router;
