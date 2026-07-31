import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  logDailyReminder,
  logBatchDailyReminders,
  getClientReminderHistory,
  getAdminOverdueFollowups,
  getTaxConsultantOverview,
  updateWorkStatus
} from "../controllers/reminderController.js";

const router = Router();

router.use(requireAuth);

router.post("/log", logDailyReminder);
router.post("/batch-log", logBatchDailyReminders);
router.post("/status", updateWorkStatus);
router.patch("/status", updateWorkStatus);
router.get("/history", getClientReminderHistory);
router.get("/overdue-admin", getAdminOverdueFollowups);
router.get("/overview", getTaxConsultantOverview);

export default router;
