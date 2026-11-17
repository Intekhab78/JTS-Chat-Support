import { Router } from "express";
import {
  listRisks,
  createRisk,
  updateRisk,
  deleteRisk,
  addRiskComment,
  addRiskAttachment,
  deleteRiskAttachment
} from "../controllers/riskController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload } from "../utils/multerConfig.js";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("admin", "client", "manager", "management", "tax_consultant"), listRisks);
router.post("/", requireRole("admin", "client", "manager", "management", "tax_consultant"), createRisk);
router.patch("/:id", requireRole("admin", "client", "manager", "management", "tax_consultant"), updateRisk);
router.delete("/:id", requireRole("admin", "client", "manager"), deleteRisk);
router.post("/:id/comments", requireRole("admin", "client", "manager", "management", "tax_consultant"), addRiskComment);
router.post("/:id/attachments", requireRole("admin", "client", "manager", "management", "tax_consultant"), upload.single("attachment"), addRiskAttachment);
router.delete("/:id/attachments/:attachmentId", requireRole("admin", "client", "manager", "management", "tax_consultant"), deleteRiskAttachment);

export default router;
