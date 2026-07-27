import { Router } from "express";
import {
  getVatComplianceStats,
  createVatComplianceRecord,
  updateVatComplianceRecord,
  deleteVatComplianceRecord,
  getCorporateTaxStats,
  createCorporateTaxRecord,
  updateCorporateTaxRecord,
  deleteCorporateTaxRecord,
  getTradeLicenseStats,
  createTradeLicenseRecord,
  updateTradeLicenseRecord,
  deleteTradeLicenseRecord,
  triggerInactivityCheck,
  getInactivityLogs,
  getComplianceReportData,
  getUnifiedComplianceOverview,
  getCalendarEvents
} from "../controllers/complianceController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", getUnifiedComplianceOverview);
router.get("/vat", getVatComplianceStats);
router.post("/vat", createVatComplianceRecord);
router.patch("/vat/:id", updateVatComplianceRecord);
router.delete("/vat/:id", deleteVatComplianceRecord);

router.get("/corporate-tax", getCorporateTaxStats);
router.post("/corporate-tax", createCorporateTaxRecord);
router.patch("/corporate-tax/:id", updateCorporateTaxRecord);
router.delete("/corporate-tax/:id", deleteCorporateTaxRecord);

router.get("/trade-license", getTradeLicenseStats);
router.post("/trade-license", createTradeLicenseRecord);
router.patch("/trade-license/:id", updateTradeLicenseRecord);
router.delete("/trade-license/:id", deleteTradeLicenseRecord);
router.get("/calendar", getCalendarEvents);
router.post("/trigger-inactivity-check", triggerInactivityCheck);
router.get("/inactivity-logs", getInactivityLogs);
router.get("/reports/data", getComplianceReportData);

export default router;
