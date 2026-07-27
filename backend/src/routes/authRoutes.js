import { Router } from "express";
import {
  disableTwoFactor,
  login,
  me,
  refresh,
  register,
  setupTwoFactor,
  verifyTwoFactorSetup
} from "../controllers/authController.js";
import { forgotPassword, resetPassword } from "../controllers/passwordResetController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

import rateLimit from "express-rate-limit";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/refresh", requireAuth, refresh);
router.get("/me", requireAuth, me);
router.post("/agents/register", requireAuth, requireRole("admin", "client"), register);
router.post("/2fa/setup", requireAuth, setupTwoFactor);
router.post("/2fa/verify", requireAuth, verifyTwoFactorSetup);
router.post("/2fa/disable", requireAuth, disableTwoFactor);

// Forgot / Reset Password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;

