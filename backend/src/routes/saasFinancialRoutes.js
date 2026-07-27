import { Router } from "express";
import {
  getFinancialOverview,
  getTenantProfitability,
  updateSaasCosts
} from "../controllers/saasFinancialController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "accounts"), getFinancialOverview);
router.get("/tenants", requireRole("admin", "client", "accounts"), getTenantProfitability);
router.post("/costs", requireRole("admin", "client", "accounts"), updateSaasCosts);

export default router;
