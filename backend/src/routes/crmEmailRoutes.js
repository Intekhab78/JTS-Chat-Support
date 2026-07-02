import { Router } from "express";
import * as emailController from "../controllers/crmEmailController.js";

const router = Router();

router.get("/", emailController.listEmails);
router.post("/", emailController.createEmail);
router.delete("/:id", emailController.deleteEmail);

export default router;
