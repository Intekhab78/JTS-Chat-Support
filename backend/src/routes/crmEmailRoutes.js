import { Router } from "express";
import * as emailController from "../controllers/crmEmailController.js";
import * as templateController from "../controllers/crmEmailTemplateController.js";

const router = Router();

// Custom Design Email Templates
router.get("/templates", templateController.listTemplates);
router.post("/templates", templateController.createTemplate);
router.put("/templates/:id", templateController.updateTemplate);
router.delete("/templates/:id", templateController.deleteTemplate);
router.post("/templates/test", templateController.sendTestEmail);

// Direct Email History Logs
router.get("/", emailController.listEmails);
router.post("/", emailController.createEmail);
router.delete("/:id", emailController.deleteEmail);

export default router;
