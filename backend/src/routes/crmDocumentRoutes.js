import { Router } from "express";
import * as documentController from "../controllers/crmDocumentController.js";

const router = Router();

router.get("/", documentController.listDocuments);
router.post("/", documentController.createDocument);
router.delete("/:id", documentController.deleteDocument);

export default router;
