import { Router } from "express";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roleController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", getRoles);
router.post("/", requireRole("admin", "client"), createRole);
router.patch("/:id", requireRole("admin", "client"), updateRole);
router.delete("/:id", requireRole("admin", "client"), deleteRole);

export default router;
