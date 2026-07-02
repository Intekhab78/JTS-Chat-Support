import { Router } from "express";
import * as biController from "../controllers/crmBiController.js";

const router = Router();

// Dashboard Configurations
router.get("/dashboards", biController.listDashboards);
router.post("/dashboards", biController.createDashboard);

// Metrics aggregations
router.get("/metrics", biController.getCentralMetrics);

// Alerts threshold
router.get("/alerts", biController.listAlerts);
router.post("/alerts", biController.createAlert);

export default router;
