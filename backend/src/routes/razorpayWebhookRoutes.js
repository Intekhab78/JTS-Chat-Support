import { Router } from "express";
import express from "express";
import { handleRazorpayWebhook } from "../controllers/razorpayWebhookController.js";

const router = Router();

// Razorpay requires signature validation matching raw JSON request body
router.post("/razorpay", express.json(), handleRazorpayWebhook);

export default router;
