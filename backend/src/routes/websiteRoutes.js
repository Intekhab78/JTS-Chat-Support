import { Router } from "express";
import { createWebsite, listWebsites, getWebsite, updateWebsite } from "../controllers/websiteController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Everyone (including agents, sales, etc.) can list and get website details
router.get("/", requireRole("admin", "client", "manager", "sales", "accounts", "customer", "purchase", "agent"), listWebsites);
router.get("/:id", requireRole("admin", "client", "manager", "sales", "accounts", "customer", "purchase", "agent"), getWebsite);

// Only managers/clients/admins can create or update websites
router.post("/", requireRole("admin", "client", "manager"), createWebsite);
router.patch("/:id", requireRole("admin", "client", "manager"), updateWebsite);

export default router;

