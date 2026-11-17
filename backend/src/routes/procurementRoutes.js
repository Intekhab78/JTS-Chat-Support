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
import { attachTenantSubscription, requirePlanFeature } from "../middleware/planAccess.js";
import { PERMISSIONS, requireAnyPermission } from "../utils/permissions.js";

const router = express.Router();

router.use(requireAuth);

// RFQ Bidding (Suppliers can submit bids)
router.get("/rfqs", getRFQs);
router.post("/rfqs/:id/bids", requireRole("supplier"), submitBid);

// Managerial Routes (gated by procurement plan feature)
router.use(
  requireRole("admin", "client", "manager", "purchase", "accounts", "sales", "tax_consultant"),
  attachTenantSubscription,
  requirePlanFeature("procurement")
);

const requirePurchaseView = requireAnyPermission(PERMISSIONS.PURCHASE_VIEW, PERMISSIONS.PURCHASE_MANAGE, PERMISSIONS.ACCOUNTS_VIEW);
const requirePurchaseCreate = requireAnyPermission(PERMISSIONS.PURCHASE_CREATE, PERMISSIONS.PURCHASE_MANAGE);
const requirePurchaseUpdate = requireAnyPermission(PERMISSIONS.PURCHASE_UPDATE, PERMISSIONS.PURCHASE_MANAGE);

router.get("/stats", requirePurchaseView, getProcurementStats);
router.route("/suppliers").get(requirePurchaseView, getSuppliers).post(requirePurchaseCreate, createSupplier);
router.get("/orders", requirePurchaseView, getPurchaseOrders);
router.get("/orders/:id/pdf", requirePurchaseView, downloadPurchaseOrderPDF);
router.post("/orders", requirePurchaseCreate, createPurchaseOrder);
router.patch("/orders/:id", requirePurchaseUpdate, updatePurchaseOrder);

// RFQ Management
router.post("/rfqs", requirePurchaseCreate, createRFQ);
router.post("/rfqs/:id/award", requirePurchaseUpdate, awardRFQ);

export default router;
