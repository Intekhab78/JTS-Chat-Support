import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getCallLogs, getCallAnalytics, simulateIncomingCall } from "../controllers/voiceCallController.js";
import { voiceCallLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

// Public simulation endpoints for website widget & visitors (protected by voiceCallLimiter)
router.post("/simulate-call-public", voiceCallLimiter, simulateIncomingCall);
router.post("/call-simulated", voiceCallLimiter, simulateIncomingCall);
router.post("/simulate-call", voiceCallLimiter, simulateIncomingCall);

// Protected log & analytics endpoints for dashboard operators
router.get("/logs", requireAuth, getCallLogs);
router.get("/analytics", requireAuth, getCallAnalytics);

export default router;
