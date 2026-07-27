import { Router } from "express";
import {
  uploadAttachment, acceptChatSession, closeChatSession, archiveChatSession, restoreChatSession,
  getSessionMessages, listAgentSessions, listManagerSessions, listSalesSessions,
  listQueuedSessions, getChatHistory, transferChatSession,
  addInternalNote, getInternalNotes, getSessionActivity,
  bulkCloseSessions, bulkReassignSessions, bulkDeleteSessions, deleteChatSession
} from "../controllers/chatController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload } from "../utils/multerConfig.js";

const router = Router();

router.get("/admin/sessions", requireAuth, requireRole("admin"), listManagerSessions);
router.get("/client/sessions", requireAuth, requireRole("admin", "client", "manager", "management"), listManagerSessions);
router.get("/agent/sessions", requireAuth, requireRole("agent", "sales", "user", "tax_consultant", "management", "manager", "accounts", "purchase"), listAgentSessions);
router.get("/sessions", requireAuth, async (req, res, next) => {
  try {
    const role = req.user.role;
    if (role === "admin" || role === "client" || role === "manager" || role === "management") return await listManagerSessions(req, res, next);
    if (role === "sales") return await listSalesSessions(req, res, next);
    return await listAgentSessions(req, res, next);
  } catch (err) {
    next(err);
  }
});
router.get("/queued", requireAuth, listQueuedSessions);
router.get("/history", requireAuth, getChatHistory);
router.get("/sessions/:sessionId/messages", requireAuth, getSessionMessages);
router.get("/sessions/:sessionId/activity", requireAuth, getSessionActivity);
router.patch("/sessions/:sessionId/accept", requireAuth, acceptChatSession);
router.patch("/sessions/:sessionId/close", requireAuth, closeChatSession);
router.patch("/sessions/:sessionId/archive", requireAuth, archiveChatSession);
router.patch("/sessions/:sessionId/restore", requireAuth, restoreChatSession);
router.delete("/sessions/:sessionId", requireAuth, deleteChatSession);

// Bulk Operations
router.post("/bulk-close", requireAuth, requireRole("admin", "client", "manager"), bulkCloseSessions);
router.post("/bulk-reassign", requireAuth, requireRole("admin", "client", "manager"), bulkReassignSessions);
router.post("/bulk-delete", requireAuth, requireRole("admin", "client", "manager"), bulkDeleteSessions);

// Feature 5: Chat Transfer
router.post("/sessions/:sessionId/transfer", requireAuth, requireRole("admin", "client", "agent"), transferChatSession);

// Feature 6: Internal Notes
router.get("/sessions/:sessionId/notes", requireAuth, requireRole("admin", "client", "agent", "sales"), getInternalNotes);
router.post("/sessions/:sessionId/notes", requireAuth, requireRole("admin", "client", "agent", "sales"), addInternalNote);

router.post("/upload", requireAuth, upload.single("attachment"), uploadAttachment);

export default router;
