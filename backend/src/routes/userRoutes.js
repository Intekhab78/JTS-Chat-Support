import { Router } from "express";
import { createAgent, listAgents, updateAvailability, listClients, createClient, updateProfile, updateDashboardPreferences, updateAgent, deleteAgent, getClientDetails, adminResetPassword } from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin", "client", "manager", "management", "sales", "agent", "tax_consultant", "accounts", "purchase"), listAgents);
router.get("/agents", requireAuth, requireRole("admin", "client", "manager", "management", "sales", "agent", "tax_consultant", "accounts", "purchase"), listAgents);
router.post("/agents", requireAuth, requireRole("admin", "client", "manager", "management"), createAgent);
router.patch("/agents/:id", requireAuth, requireRole("admin", "client", "manager", "management"), updateAgent);
router.delete("/agents/:id", requireAuth, requireRole("admin", "client", "manager", "management"), deleteAgent);
router.get("/clients", requireAuth, requireRole("admin"), listClients);
router.get("/clients/:id/details", requireAuth, requireRole("admin"), getClientDetails);
router.post("/:id/reset-password", requireAuth, requireRole("admin"), adminResetPassword);
router.post("/clients", requireAuth, requireRole("admin"), createClient);
router.patch("/availability", requireAuth, requireRole("agent", "sales", "user", "client", "admin", "manager", "management", "tax_consultant", "accounts", "purchase"), updateAvailability);
router.patch("/profile", requireAuth, updateProfile);
router.patch("/preferences", requireAuth, updateDashboardPreferences);

export default router;
