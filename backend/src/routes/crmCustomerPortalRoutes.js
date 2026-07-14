import { Router } from "express";
import * as portalController from "../controllers/crmCustomerPortalController.js";
import { requireAuth } from "../middleware/auth.js";
import AppError from "../utils/AppError.js";

const router = Router();

// Multi-tenant boundary verification middleware for Customer role
const requireCustomerPortal = (req, res, next) => {
  if (req.user.role !== "customer" || !req.user.customerId) {
    throw new AppError("Access denied. Customer account authorization required.", 403);
  }
  next();
};

router.use(requireAuth);
router.use(requireCustomerPortal);

// Dashboard
router.get("/dashboard", portalController.getDashboardSummary);

// Quotations
router.get("/quotations", portalController.getQuotations);
router.post("/quotations/:id/status", portalController.updateQuotationStatus);

// Orders
router.get("/orders", portalController.getOrders);

// Invoices
router.get("/invoices", portalController.getInvoices);
router.post("/invoices/:id/pay", portalController.payInvoice);

// Support tickets
router.get("/tickets", portalController.getTickets);
router.post("/tickets", portalController.createTicket);
router.post("/tickets/:id/replies", portalController.replyToTicket);

// Profile
router.get("/profile", portalController.getProfile);
router.put("/profile", portalController.updateProfile);
router.put("/profile/change-password", portalController.changePassword);

export default router;
