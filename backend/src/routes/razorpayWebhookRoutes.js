import { Router } from "express";
import express from "express";
import { handleRazorpayWebhook } from "../controllers/razorpayWebhookController.js";

const router = Router();

// Razorpay requires signature validation matching exact raw JSON request body
router.post(
  "/razorpay",
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  }),
  handleRazorpayWebhook
);

export default router;
