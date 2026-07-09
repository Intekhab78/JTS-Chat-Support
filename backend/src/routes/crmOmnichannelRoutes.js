import { Router } from "express";
import * as omnichannelController from "../controllers/crmOmnichannelController.js";

const router = Router();

router.get("/sessions", omnichannelController.listOmnichannelSessions);
router.post("/sessions", omnichannelController.createOmnichannelSession);
router.get("/sessions/messages/:sessionId", omnichannelController.getSessionMessages);
router.post("/messages", omnichannelController.postMessage);
router.patch("/agent-status", omnichannelController.updateAgentStatus);
router.get("/track-open/:id", omnichannelController.trackOpen);

// Omnichannel unified inbox extensions
router.patch("/sessions/:id/assign", omnichannelController.assignSession);
router.patch("/sessions/:id/priority", omnichannelController.updateSessionPriority);
router.patch("/sessions/:id/labels", omnichannelController.updateSessionLabels);
router.post("/sessions/:id/merge", omnichannelController.mergeSessions);

export default router;
