import { Router } from "express";
import { uploadAttachment, initVisitorSession, submitSessionFeedback, getWidgetConfig, submitBotStatus } from "../controllers/chatController.js";
import { getWidgetScript, submitWidgetLead, submitWidgetTicket, executeWidgetAction, generateWidgetAiResponse } from "../controllers/widgetController.js";
import { requireWebsiteApiKey } from "../middleware/apiKey.js";
import { upload } from "../utils/multerConfig.js";

const router = Router();

router.get("/chat-widget.js", getWidgetScript);
router.get("/api/widget/config", requireWebsiteApiKey, getWidgetConfig);
router.post("/api/widget/init", requireWebsiteApiKey, initVisitorSession);
router.post("/api/widget/feedback", requireWebsiteApiKey, submitSessionFeedback);
router.post("/api/widget/bot-status", requireWebsiteApiKey, submitBotStatus);
router.post("/api/widget/upload", requireWebsiteApiKey, upload.single("attachment"), uploadAttachment);
router.post("/api/widget/lead", requireWebsiteApiKey, submitWidgetLead);
router.post("/api/widget/ticket", requireWebsiteApiKey, submitWidgetTicket);
router.post("/api/widget/action", requireWebsiteApiKey, executeWidgetAction);
router.post("/api/widget/ai-response", requireWebsiteApiKey, generateWidgetAiResponse);

export default router;
