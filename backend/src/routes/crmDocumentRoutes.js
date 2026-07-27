import { Router } from "express";
import {
  getCustomerDocuments,
  uploadCustomerDocument,
  replaceDocumentVersion,
  updateDocumentMetadata,
  deleteCustomerDocument
} from "../controllers/crmDocumentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/customer/:customerId", getCustomerDocuments);
router.post("/customer/:customerId", uploadCustomerDocument);
router.post("/:documentId/version", replaceDocumentVersion);
router.patch("/:documentId", updateDocumentMetadata);
router.delete("/:documentId", deleteCustomerDocument);

export default router;
