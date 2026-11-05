import express from "express";
import * as coreController from "../controllers/ticketCoreController.js";
import * as conversionController from "../controllers/ticketConversionController.js";
import * as publicController from "../controllers/ticketPublicController.js";
import { widgetSubmissionLimiter } from "../middleware/rateLimiters.js";
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
router.post("/public/:ticketId/notes", widgetSubmissionLimiter, publicController.addPublicTicketNote);

// Secured routes
router.use(requireAuth);
router.use(attachTenantSubscription);
router.use(requirePlanFeature("tickets"));

const STAFF_TICKET_ROLES = ["admin", "client", "manager", "management", "agent", "sales", "purchase", "tax_consultant", "accounts"];

router.get("/customer-history/:crn", requireRole(...STAFF_TICKET_ROLES), conversionController.getCustomerHistoryByCRN);
router.get("/visitor-history/:sessionId", requireRole(...STAFF_TICKET_ROLES), conversionController.getVisitorHistory);
router.get("/export", requireRole("admin", "client", "manager", "management"), coreController.exportTickets);
router.get("/", requireRole(...STAFF_TICKET_ROLES), coreController.getTickets);
router.get("/:id/activity", requireRole(...STAFF_TICKET_ROLES), coreController.getTicketActivity);
router.get("/:id", requireRole(...STAFF_TICKET_ROLES), coreController.getTicketById);
router.post("/convert", requireRole(...STAFF_TICKET_ROLES), validate(createTicketFromChatSchema), conversionController.createTicketFromChat);
router.post("/bulk-update", requireRole("admin", "client", "manager", "management", "agent"), validate(bulkUpdateTicketsSchema), coreController.bulkUpdateTickets);
router.post("/bulk-delete", requireRole("admin", "client", "manager", "management"), coreController.bulkDeleteTickets);
router.patch("/:id", requireRole(...STAFF_TICKET_ROLES), validate(updateTicketSchema), coreController.updateTicket);
router.delete("/:id", requireRole("admin", "client", "manager", "management"), coreController.deleteTicket);

export default router;
