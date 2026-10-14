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
const uploadAny = (req, res, next) => {
  upload.fields([{ name: "file", maxCount: 1 }, { name: "attachment", maxCount: 1 }])(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (req.files?.file?.[0]) req.file = req.files.file[0];
    else if (req.files?.attachment?.[0]) req.file = req.files.attachment[0];
    next();
  });
};

router.post("/api/widget/upload", requireWebsiteApiKey, uploadAny, uploadAttachment);
router.post("/api/widget/lead", requireWebsiteApiKey, submitWidgetLead);
router.post("/api/widget/ticket", requireWebsiteApiKey, submitWidgetTicket);
router.post("/api/widget/action", requireWebsiteApiKey, executeWidgetAction);
router.post("/api/widget/ai-response", requireWebsiteApiKey, generateWidgetAiResponse);

export default router;
