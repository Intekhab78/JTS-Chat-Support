import { Router } from "express";
import { runTicketEscalationEngine } from "../services/ticketEscalationService.js";
import asyncHandler from "../utils/asyncHandler.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

const router = Router();

router.post("/escalate-cron", asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  await runTicketEscalationEngine();
  res.json({ success: true, message: "Ticket SLA Escalation check completed." });
}));

export default router;
