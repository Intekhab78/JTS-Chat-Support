import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getCallLogs, getCallAnalytics, simulateIncomingCall } from "../controllers/voiceCallController.js";

const router = express.Router();

// Public simulation endpoints for website widget & visitors
router.post("/simulate-call-public", simulateIncomingCall);
router.post("/call-simulated", simulateIncomingCall);
router.post("/simulate-call", simulateIncomingCall);

// Protected log & analytics endpoints for dashboard operators
router.get("/logs", requireAuth, getCallLogs);
router.get("/analytics", requireAuth, getCallAnalytics);

export default router;
