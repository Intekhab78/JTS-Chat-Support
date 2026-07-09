import { Router } from "express";
import { createWebsite, listWebsites, getWebsite, updateWebsite } from "../controllers/websiteController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("admin", "client", "manager", "sales", "accounts", "customer", "purchase"));
router.get("/", listWebsites);
router.get("/:id", getWebsite);
router.post("/", createWebsite);
router.patch("/:id", updateWebsite);

export default router;

