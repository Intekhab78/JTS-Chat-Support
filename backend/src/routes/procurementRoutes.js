import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getSuppliers,
  createSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  getProcurementStats,
  downloadPurchaseOrderPDF
} from "../controllers/procurementController.js";
import {
  getRFQs,
  createRFQ,
  submitBid,
  awardRFQ
} from "../controllers/rfqController.js";

const router = express.Router();

router.use(requireAuth);

// RFQ Bidding (Suppliers can submit bids)
router.get("/rfqs", getRFQs);
router.post("/rfqs/:id/bids", requireRole("supplier"), submitBid);

// Managerial Routes
router.use(requireRole("admin", "client", "manager", "purchase", "accounts"));

router.get("/stats", getProcurementStats);
router.route("/suppliers").get(getSuppliers).post(createSupplier);
router.get("/orders", getPurchaseOrders);
router.get("/orders/:id/pdf", downloadPurchaseOrderPDF);
router.post("/orders", createPurchaseOrder);
router.patch("/orders/:id", updatePurchaseOrder);

// RFQ Management
router.post("/rfqs", createRFQ);
router.post("/rfqs/:id/award", awardRFQ);

export default router;
