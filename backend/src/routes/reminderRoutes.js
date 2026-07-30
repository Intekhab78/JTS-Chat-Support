import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  logDailyReminder,
  getClientReminderHistory,
  getAdminOverdueFollowups,
  getTaxConsultantOverview
} from "../controllers/reminderController.js";

const router = Router();

router.use(requireAuth);

router.post("/log", logDailyReminder);
router.get("/history", getClientReminderHistory);
router.get("/overdue-admin", getAdminOverdueFollowups);
router.get("/overview", getTaxConsultantOverview);

export default router;
