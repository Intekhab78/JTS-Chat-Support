import { Router } from "express";
import { getManagerAnalytics, exportAnalyticsCSV, getAgentAnalytics } from "../controllers/analyticsController.js";
import { getSalesPerformanceStats } from "../controllers/salesAnalyticsController.js";
import {
  getExecutiveSummary, 
  getLeadAnalytics, 
  getTicketAnalytics, 
  getRevenueAnalytics,
  getAgentPerformanceAnalytics,
  getWebsiteAnalytics,
  getCustomerInsightsAnalytics,
  getAiInsightsAnalytics
} from "../controllers/enterpriseAnalyticsController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin", "client", "manager", "accounts", "management", "tax_consultant"), getManagerAnalytics);
router.get("/sales", requireAuth, requireRole("admin", "client", "manager", "sales", "tax_consultant"), getSalesPerformanceStats);
router.get("/agent", requireAuth, requireRole("agent", "sales", "user", "tax_consultant", "management", "manager", "accounts", "purchase"), getAgentAnalytics);
router.get("/export/csv", requireAuth, requireRole("admin", "client", "manager", "accounts"), attachTenantSubscription, requirePlanFeature("reports"), exportAnalyticsCSV);

// Enterprise Reporting Endpoints
router.get("/enterprise/executive", requireAuth, requireRole("admin", "client", "manager", "accounts"), getExecutiveSummary);
router.get("/enterprise/leads", requireAuth, requireRole("admin", "client", "manager", "sales", "accounts"), getLeadAnalytics);
router.get("/enterprise/tickets", requireAuth, requireRole("admin", "client", "manager", "accounts"), getTicketAnalytics);
router.get("/enterprise/revenue", requireAuth, requireRole("admin", "client", "manager", "accounts"), getRevenueAnalytics);
router.get("/enterprise/agents", requireAuth, requireRole("admin", "client", "manager", "accounts"), getAgentPerformanceAnalytics);
router.get("/enterprise/websites", requireAuth, requireRole("admin", "client", "manager", "accounts"), getWebsiteAnalytics);
router.get("/enterprise/customers", requireAuth, requireRole("admin", "client", "manager", "accounts"), getCustomerInsightsAnalytics);
router.get("/enterprise/ai-insights", requireAuth, requireRole("admin", "client", "manager", "accounts"), getAiInsightsAnalytics);


export default router;
