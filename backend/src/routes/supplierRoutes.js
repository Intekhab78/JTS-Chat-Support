import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getSupplierOrders,
  getSupplierProfile,
  updateOrderStatus,
  updateSupplierProfile,
  uploadInvoice,
  downloadPurchaseOrderPDF,
  getSupplierInventory,
  getSupplierLedger
} from "../controllers/supplierController.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("supplier"));

// Profile
router.get("/profile", getSupplierProfile);
router.patch("/profile", updateSupplierProfile);

// Orders
router.get("/orders", getSupplierOrders);
router.patch("/orders/:id/status", updateOrderStatus);
router.get("/orders/:id/pdf", downloadPurchaseOrderPDF);
router.post("/orders/:id/invoice", uploadInvoice);

// Inventory & Ledger
router.get("/inventory", getSupplierInventory);
router.get("/ledger", getSupplierLedger);

export default router;
