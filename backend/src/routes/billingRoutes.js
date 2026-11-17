import express from "express";
import { 
  createCheckoutSession, 
  createPortalSession, 
  getSubscriptionStatus, 
  adminGetAllSubscriptions,
  adminUpdateClientSubscription,
  executeMockCheckout,
  createRazorpaySubscriptionOrder,
  verifyRazorpaySubscriptionPayment
} from "../controllers/billingController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { PERMISSIONS, requireAnyPermission } from "../utils/permissions.js";

const router = express.Router();

router.use(requireAuth);

router.get("/status", getSubscriptionStatus);
router.get("/admin/all", requireRole("admin"), adminGetAllSubscriptions);
router.patch("/admin/update", requireRole("admin"), adminUpdateClientSubscription);
router.post("/checkout", requireRole("admin", "client"), requireAnyPermission(PERMISSIONS.BILLING_VIEW, PERMISSIONS.SETTINGS_MANAGE), createCheckoutSession);
router.post("/mock-checkout", requireRole("admin", "client"), requireAnyPermission(PERMISSIONS.BILLING_VIEW, PERMISSIONS.SETTINGS_MANAGE), executeMockCheckout);
router.post("/razorpay-order", requireRole("admin", "client"), requireAnyPermission(PERMISSIONS.BILLING_VIEW, PERMISSIONS.SETTINGS_MANAGE), createRazorpaySubscriptionOrder);
router.post("/razorpay-verify", requireRole("admin", "client"), requireAnyPermission(PERMISSIONS.BILLING_VIEW, PERMISSIONS.SETTINGS_MANAGE), verifyRazorpaySubscriptionPayment);
router.post("/portal", requireRole("admin", "client"), requireAnyPermission(PERMISSIONS.BILLING_VIEW, PERMISSIONS.SETTINGS_MANAGE), createPortalSession);

export default router;
