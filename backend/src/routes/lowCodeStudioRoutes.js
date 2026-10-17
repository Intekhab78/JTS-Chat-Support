import { Router } from "express";
import {
  getStudioOverview,
  createStudioPage,
  exportPageJson,
  deleteStudioPage,
  getPublicForm,
  submitPublicForm,
  getFormSubmissions
} from "../controllers/lowCodeStudioController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";

const router = Router();

// Public routes (accessible by visitors, embed widgets, or external client landing pages)
router.get("/public/forms/:idOrSlug", getPublicForm);
router.post("/public/forms/:idOrSlug/submit", submitPublicForm);

// Authenticated studio routes (gated by lowcode-studio plan feature)
router.use(requireAuth, attachTenantSubscription, requirePlanFeature("lowcode-studio"));

router.get("/overview", requireRole("admin", "client", "manager", "management"), getStudioOverview);
router.post("/pages", requireRole("admin", "client", "manager"), createStudioPage);
router.get("/pages/:id/export", requireRole("admin", "client", "manager"), exportPageJson);
router.get("/pages/:id/submissions", requireRole("admin", "client", "manager"), getFormSubmissions);
router.delete("/pages/:id", requireRole("admin", "client", "manager"), deleteStudioPage);

export default router;

