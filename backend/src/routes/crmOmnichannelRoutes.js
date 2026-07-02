import { Router } from "express";
import * as omnichannelController from "../controllers/crmOmnichannelController.js";

const router = Router();

router.get("/sessions", omnichannelController.listOmnichannelSessions);
router.post("/sessions", omnichannelController.createOmnichannelSession);
router.get("/sessions/messages/:sessionId", omnichannelController.getSessionMessages);
router.post("/messages", omnichannelController.postMessage);
router.patch("/agent-status", omnichannelController.updateAgentStatus);
router.get("/track-open/:id", omnichannelController.trackOpen);

export default router;
