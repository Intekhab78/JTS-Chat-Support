import { Router } from "express";
import * as customerController from "../controllers/crmCustomerController.js";
import * as quotationController from "../controllers/crmQuotationController.js";
import * as timelineController from "../controllers/crmTimelineController.js";
import communicationRoutes from "./crmCommunicationRoutes.js";
import customerPortalRoutes from "./crmCustomerPortalRoutes.js";
import * as searchController from "../controllers/crmSearchController.js";
import * as invoiceController from "../controllers/crmInvoiceController.js";
import * as interactionController from "../controllers/crmInteractionController.js";
import * as taskController from "../controllers/crmTaskController.js";
import * as workflowController from "../controllers/crmWorkflowController.js";
import * as analyticsController from "../controllers/crmAnalyticsController.js";

import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";
import { attachOwnedWebsiteIds } from "../middleware/attachOwnedWebsiteIds.js";
import {
  validate,
  updateCustomerSchema,
  sendCustomerEmailSchema,
  createCustomerSchema,
  createFollowUpTaskSchema,
  updateFollowUpTaskSchema,
  mergeCustomersSchema
} from "../utils/validators.js";
import { upload } from "../utils/multerConfig.js";
import companyRoutes from "./crmCompanyRoutes.js";
import contactRoutes from "./crmContactRoutes.js";
import dealRoutes from "./crmDealRoutes.js";
import pipelineRoutes from "./crmPipelineRoutes.js";
import activityRoutes from "./crmActivityRoutes.js";
import meetingRoutes from "./crmMeetingRoutes.js";
import callRoutes from "./crmCallRoutes.js";
import emailRoutes from "./crmEmailRoutes.js";
import documentRoutes from "./crmDocumentRoutes.js";
import reminderRoutes from "./crmReminderRoutes.js";
import productRoutes from "./crmProductRoutes.js";
import priceBookRoutes from "./crmPriceBookRoutes.js";
import salesOrderRoutes from "./crmSalesOrderRoutes.js";
import paymentRoutes from "./crmPaymentRoutes.js";
import subscriptionRoutes from "./crmSubscriptionRoutes.js";
import planRoutes from "./crmPlanRoutes.js";
import taxRoutes from "./crmTaxRoutes.js";
import creditNoteRoutes from "./crmCreditNoteRoutes.js";
import debitNoteRoutes from "./crmDebitNoteRoutes.js";
import omnichannelRoutes from "./crmOmnichannelRoutes.js";
import cannedResponseRoutes from "./crmCannedResponseRoutes.js";
import customerSuccessRoutes from "./crmCustomerSuccessRoutes.js";
import assetRoutes from "./crmAssetRoutes.js";
import feedbackRoutes from "./crmFeedbackRoutes.js";
import helpdeskRoutes from "./crmHelpdeskRoutes.js";
import workflowRoutes from "./crmWorkflowRoutes.js";
import aiRoutes from "./crmAiRoutes.js";
import biRoutes from "./crmBiRoutes.js";
import adminRoutes from "./crmAdminRoutes.js";
import integrationRoutes from "./crmIntegrationRoutes.js";
import meetingPlatformRoutes from "./meetingPlatformRoutes.js";
import salesTargetRoutes from "./crmSalesTargetRoutes.js";
import complianceRoutes from "./crmComplianceRoutes.js";

const router = Router();

// All CRM routes require auth + at minimum sales/manager/agent/accounts/tax_consultant/management access
router.use(requireAuth, requireRole("admin", "client", "manager", "agent", "sales", "purchase", "accounts", "tax_consultant", "management"));
router.use(attachOwnedWebsiteIds);
router.use(attachTenantSubscription);
router.use(requirePlanFeature("crm"));

router.use("/companies", companyRoutes);
router.use("/contacts", contactRoutes);
router.use("/deals", dealRoutes);
router.use("/pipelines", pipelineRoutes);
router.use("/products", productRoutes);
router.use("/pricebooks", priceBookRoutes);
router.use("/salesorders", salesOrderRoutes);
router.use("/payments", paymentRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/plans", planRoutes);
router.use("/tax", taxRoutes);
router.use("/creditnotes", creditNoteRoutes);
router.use("/debitnotes", debitNoteRoutes);
router.use("/omnichannel", omnichannelRoutes);
router.use("/communication", communicationRoutes);
router.use("/customer-portal", customerPortalRoutes);
router.use("/canned-responses", cannedResponseRoutes);
router.use("/customersuccess", customerSuccessRoutes);
router.use("/assets", assetRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/helpdesk", helpdeskRoutes);
router.use("/workflows", workflowRoutes);
router.use("/ai", aiRoutes);
router.use("/bi", biRoutes);
router.use("/admin", adminRoutes);
router.use("/integration", integrationRoutes);
router.use("/activities", activityRoutes);
router.use("/meetings", meetingRoutes);
router.use("/calls", callRoutes);
router.use("/emails", emailRoutes);
router.use("/documents", documentRoutes);
router.use("/reminders", reminderRoutes);
router.use("/meeting-platforms", meetingPlatformRoutes);
router.use("/sales-targets", salesTargetRoutes);
router.use("/compliance", complianceRoutes);

// Analytics & Reports (Move above /:id to avoid shadowing)
router.get("/reports", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), analyticsController.getCrmReports);
router.get("/reports/won-timeseries", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), analyticsController.getWonRevenueTimeseries);

// Static Activity & Search
router.get("/search", searchController.globalSearch);
router.get("/timeline/:id", timelineController.getTimeline);
router.post("/promote", requireRole("admin", "client", "manager", "agent", "sales", "tax_consultant"), interactionController.promoteVisitor);
router.get("/notes/my", interactionController.getMyCustomerNotes);
router.get("/tasks/my", taskController.getMyFollowUpTasks);

// Invoices
router.get("/invoices", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), invoiceController.listAllInvoices);
router.post("/invoices", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), invoiceController.createInvoice);
router.put("/invoices/:id", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), invoiceController.updateInvoice);
router.delete("/invoices/:id", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), invoiceController.deleteInvoice);
router.post("/invoices/:id/pdf", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant", "customer"), invoiceController.generateInvoicePdf);
router.post("/invoices/:id/razorpay-order", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), invoiceController.createRazorpayOrder);
router.post("/invoices/:id/razorpay-verify", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), invoiceController.verifyRazorpayPayment);

// Core Customer/Lead Routes
router.get("/customers", customerController.listCustomers);
router.get("/", customerController.listCustomers);
router.post("/", requireRole("admin", "client", "manager", "sales", "tax_consultant"), validate(createCustomerSchema), customerController.createCustomer);
router.post("/import", requireRole("admin", "client", "manager", "sales", "tax_consultant"), upload.single("file"), customerController.importCustomers);
router.post("/merge", requireRole("admin", "client", "manager", "tax_consultant"), validate(mergeCustomersSchema), customerController.mergeCustomers);
router.patch("/bulk-update", requireRole("admin", "client", "manager", "tax_consultant"), customerController.bulkUpdateCustomers);
router.delete("/bulk-delete", requireRole("admin", "client", "manager", "tax_consultant"), customerController.bulkDeleteCustomers);

// Quotations
router.get("/quotations/reports", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), quotationController.getQuotationsReports);
router.get("/quotations", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), quotationController.listAllQuotations);
router.get("/:customerId/quotations", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), quotationController.getCustomerQuotations);
router.post("/quotations", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), quotationController.createQuotation);
router.patch("/quotations/:id/status", quotationController.updateQuotationStatus);
router.put("/quotations/:id", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), quotationController.updateQuotation);
router.delete("/quotations/:id", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), quotationController.deleteQuotation);
router.post("/quotations/:id/send", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), quotationController.sendQuotation);
router.post("/quotations/:id/pay", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), quotationController.createQuotationPayment);
router.post("/quotations/:id/approve", requireRole("admin", "client", "manager", "tax_consultant"), quotationController.approveQuotation);
router.post("/quotations/:id/deny", requireRole("admin", "client", "manager", "tax_consultant"), quotationController.denyQuotation);
router.post("/quotations/:id/pdf", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant", "customer"), quotationController.generateQuotationPdf);

// Interactions & Activity
router.get("/:id/activity", interactionController.getCustomerActivity);
router.post("/:id/notes", requireRole("admin", "client", "manager", "sales", "tax_consultant"), interactionController.addCustomerNote);
router.post("/:id/send-email", requireRole("admin", "client", "manager", "sales", "tax_consultant"), upload.single("attachment"), interactionController.sendCustomerEmail);
router.get("/:id/invoices", requireRole("admin", "client", "manager", "sales", "purchase", "accounts", "tax_consultant"), invoiceController.getCustomerInvoices);

// Tasks
router.post("/:id/tasks", requireRole("admin", "client", "manager", "sales"), validate(createFollowUpTaskSchema), taskController.createFollowUpTask);
router.patch("/:id/tasks/:taskId", requireRole("admin", "client", "manager", "sales"), validate(updateFollowUpTaskSchema), taskController.updateFollowUpTask);
router.delete("/:id/tasks/:taskId", requireRole("admin", "client", "manager", "sales"), taskController.deleteFollowUpTask);

// Workflow & Automation
router.post("/:id/post-win", requireRole("admin", "client", "manager", "sales"), workflowController.postWin);
router.post("/:id/unlock", requireRole("admin", "client", "manager", "sales"), workflowController.unlockLead);
router.post("/:id/generate-code", requireRole("admin", "client", "manager", "sales"), workflowController.generateLeadCode);
router.patch("/:id/purchase-workflow", requireRole("admin", "client", "manager", "purchase"), workflowController.updatePurchaseWorkflowStatus);
router.post("/:id/auto-assign", requireRole("admin", "client", "manager"), workflowController.autoAssignCustomer);

// Portal access settings for customers
router.get("/employees", customerController.getEmployees);
router.get("/:id/portal-access", requireRole("admin", "client", "manager", "agent", "sales"), customerController.getPortalAccessStatus);
router.post("/:id/portal-access", requireRole("admin", "client", "manager", "agent", "sales"), customerController.grantPortalAccess);
router.delete("/:id/portal-access", requireRole("admin", "client", "manager", "agent", "sales"), customerController.revokePortalAccess);

// Enterprise Service Management
router.post("/:id/services", requireRole("admin", "client", "manager", "sales", "tax_consultant"), customerController.addCustomerService);
router.put("/:id/services/:serviceId", requireRole("admin", "client", "manager", "sales", "tax_consultant"), customerController.updateCustomerService);
router.delete("/:id/services/:serviceId", requireRole("admin", "client", "manager", "sales", "tax_consultant"), customerController.deleteCustomerService);

// Parameterized Routes (Keep at bottom to avoid shadowing)
router.get("/:id", customerController.getCustomerProfile);
router.patch("/:id", requireRole("admin", "client", "manager", "sales"), validate(updateCustomerSchema), customerController.updateCustomer);
router.delete("/:id", requireRole("admin", "client", "manager"), customerController.deleteCustomer);
router.post("/:id/archive", requireRole("admin", "client", "manager"), customerController.archiveCustomer);

export default router;
