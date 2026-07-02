import { Router } from "express";
import * as reminderController from "../controllers/crmReminderController.js";

const router = Router();

router.get("/", reminderController.listReminders);
router.post("/", reminderController.createReminder);
router.delete("/:id", reminderController.deleteReminder);

export default router;
