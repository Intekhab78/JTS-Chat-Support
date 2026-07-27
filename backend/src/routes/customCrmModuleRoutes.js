import { Router } from "express";
import {
  getCustomModulesOverview,
  createCustomModule,
  addModuleRecord,
  deleteCustomModule
} from "../controllers/customCrmModuleController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/overview", requireRole("admin", "client", "manager", "management"), getCustomModulesOverview);
router.post("/modules", requireRole("admin", "client", "manager"), createCustomModule);
router.post("/modules/:id/records", requireRole("admin", "client", "manager"), addModuleRecord);
router.delete("/modules/:id", requireRole("admin", "client", "manager"), deleteCustomModule);

export default router;
