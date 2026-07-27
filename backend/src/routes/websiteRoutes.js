import { Router } from "express";
import { createWebsite, listWebsites, getWebsite, updateWebsite, deleteWebsite } from "../controllers/websiteController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Everyone (including agents, sales, tax consultants, management, etc.) can list and get website details
router.get("/", listWebsites);
router.get("/:id", getWebsite);

// Only managers/clients/admins can create, update or delete websites
router.post("/", requireRole("admin", "client", "manager"), createWebsite);
router.patch("/:id", requireRole("admin", "client", "manager"), updateWebsite);
router.delete("/:id", requireRole("admin", "client", "manager"), deleteWebsite);

export default router;

