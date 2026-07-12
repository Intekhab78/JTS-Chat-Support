import { Router } from "express";
import { createAgent, listAgents, updateAvailability, listClients, createClient, updateProfile, updateDashboardPreferences, updateAgent, deleteAgent, getClientDetails, adminResetPassword } from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/agents", requireAuth, requireRole("admin", "client", "manager", "sales", "agent"), listAgents);
router.post("/agents", requireAuth, requireRole("admin", "client"), createAgent);
router.patch("/agents/:id", requireAuth, requireRole("admin", "client"), updateAgent);
router.delete("/agents/:id", requireAuth, requireRole("admin", "client"), deleteAgent);
router.get("/clients", requireAuth, requireRole("admin"), listClients);
router.get("/clients/:id/details", requireAuth, requireRole("admin"), getClientDetails);
router.post("/:id/reset-password", requireAuth, requireRole("admin"), adminResetPassword);
router.post("/clients", requireAuth, requireRole("admin"), createClient);
router.patch("/availability", requireAuth, requireRole("agent", "sales", "user", "client", "admin"), updateAvailability);
router.patch("/profile", requireAuth, updateProfile);
router.patch("/preferences", requireAuth, updateDashboardPreferences);

export default router;
