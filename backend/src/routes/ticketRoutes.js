import express from "express";
import * as coreController from "../controllers/ticketCoreController.js";
import * as conversionController from "../controllers/ticketConversionController.js";
import * as publicController from "../controllers/ticketPublicController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";
import {
  validate,
  bulkUpdateTicketsSchema,
  createTicketFromChatSchema,
  submitVisitorTicketSchema,
  updateTicketSchema
} from "../utils/validators.js";

const router = express.Router();

// Public endpoints (no auth needed)
router.post("/submit", validate(submitVisitorTicketSchema), conversionController.submitVisitorTicket);
router.get("/public/:ticketId", publicController.getTicketByPublicId);

// Secured routes
router.use(requireAuth);
router.use(attachTenantSubscription);
router.use(requirePlanFeature("tickets"));

router.get("/customer-history/:crn", requireRole("admin", "client", "manager", "agent", "sales", "purchase"), conversionController.getCustomerHistoryByCRN);
router.get("/visitor-history/:sessionId", requireRole("admin", "client", "manager", "agent", "sales", "purchase"), conversionController.getVisitorHistory);
router.get("/export", requireRole("admin", "client", "manager"), coreController.exportTickets);
router.get("/", requireRole("admin", "client", "manager", "agent", "sales", "purchase"), coreController.getTickets);
router.get("/:id/activity", requireRole("admin", "client", "manager", "agent", "sales", "purchase"), coreController.getTicketActivity);
router.get("/:id", requireRole("admin", "client", "manager", "agent", "sales", "purchase"), coreController.getTicketById);
router.post("/convert", requireRole("admin", "client", "manager", "agent", "sales"), validate(createTicketFromChatSchema), conversionController.createTicketFromChat);
router.post("/bulk-update", requireRole("admin", "client", "manager", "agent"), validate(bulkUpdateTicketsSchema), coreController.bulkUpdateTickets);
router.post("/bulk-delete", requireRole("admin", "client", "manager"), coreController.bulkDeleteTickets);
router.patch("/:id", requireRole("admin", "client", "manager", "agent", "sales"), validate(updateTicketSchema), coreController.updateTicket);
router.delete("/:id", requireRole("admin", "client", "manager"), coreController.deleteTicket);

export default router;
