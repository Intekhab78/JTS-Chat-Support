import { Router } from "express";
import {
  getFinancialOverview,
  getTenantProfitability,
  updateSaasCosts
} from "../controllers/saasFinancialController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin"), getFinancialOverview);
router.get("/tenants", requireRole("admin"), getTenantProfitability);
router.post("/costs", requireRole("admin"), updateSaasCosts);

export default router;
