import Stripe from "stripe";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { buildSubscription } from "../utils/planUtils.js";
import { normalizeRole } from "../utils/roleUtils.js";
import { canUseMockBilling, logBlockedMockBillingRequest } from "../utils/mockBillingAccess.js";
import crypto from "crypto";
import Razorpay from "razorpay";

const getStripe = () => {
  if (!env.stripeSecretKey || env.stripeSecretKey === "") {
    throw new AppError("Stripe API key is missing. Please set STRIPE_SECRET_KEY in your .env file.", 500);
  }
  return new Stripe(env.stripeSecretKey);
};

export const createCheckoutSession = asyncHandler(async (req, res, next) => {
  const { plan } = req.body;
  const priceId = env.stripePriceIds[plan];

  if (!priceId) {
    return next(new AppError("Invalid plan selected", 400));
  }

  // Ensure user is a client/admin who can actually manage a subscription
  if (req.user.role !== "client" && req.user.role !== "admin") {
    return next(new AppError("Only clients can initiate a subscription", 403));
  }

  let customerId = req.user.stripeCustomerId;
  if (!customerId) {
    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.name,
      metadata: { userId: req.user._id.toString() }
    });
    customerId = customer.id;
    req.user.stripeCustomerId = customerId;
    await req.user.save();
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${env.clientUrl}/client?tab=billing&success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientUrl}/client?tab=billing&canceled=true`,
    metadata: { userId: req.user._id.toString(), plan }
  });

  res.json({ status: "success", url: session.url });
});

export const createPortalSession = asyncHandler(async (req, res, next) => {
  if (!req.user.stripeCustomerId) {
    return next(new AppError("No active billing account found", 404));
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: req.user.stripeCustomerId,
    return_url: `${env.clientUrl}/client?tab=billing`
  });

  res.json({ status: "success", url: session.url });
});

export const adminGetAllSubscriptions = asyncHandler(async (req, res, next) => {
  const role = normalizeRole(req.user.role);
  if (role !== "admin" && role !== "accounts") {
    return next(new AppError("Access denied", 403));
  }
  const users = await User.find({ role: "client" }).select("name email subscription stripeSubscriptionId");
  res.json(users);
});
export const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({
    status: "success",
    subscription: user.subscription,
    stripeCustomerId: user.stripeCustomerId,
    stripeSubscriptionId: user.stripeSubscriptionId
  });
});

export const executeMockCheckout = asyncHandler(async (req, res, next) => {
  if (!canUseMockBilling({ nodeEnv: env.nodeEnv, enableMockBilling: env.enableMockBilling })) {
    logBlockedMockBillingRequest({
      user: req.user,
      ipAddress: req.ip,
      nodeEnv: env.nodeEnv,
      reason: "Mock billing is disabled in this environment."
    });
    return res.status(403).json({ status: "error", message: "Mock billing is disabled." });
  }

  const { plan } = req.body;
  const validPlans = ["basic", "standard", "pro"];

  if (!validPlans.includes(plan)) {
    return next(new AppError("Invalid plan selected", 400));
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Update subscription using the utility
  user.subscription = buildSubscription(plan, { status: "active" });

  await user.save();

  res.json({
    status: "success",
    message: `Plan ${plan} activated successfully (Mock Payment)`,
    subscription: user.subscription
  });
});

export const createRazorpaySubscriptionOrder = asyncHandler(async (req, res, next) => {
  const { plan } = req.body;
  const planPrices = {
    basic: 2400,     // 2400 INR
    standard: 6500,  // 6500 INR
    pro: 16500       // 16500 INR
  };

  const amount = planPrices[plan];
  if (!amount) {
    return next(new AppError("Invalid plan selected", 400));
  }

  const keyId = env.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = env.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return next(new AppError("Razorpay keys are not configured.", 500));
  }

  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });

  const order = await razorpay.orders.create({
    amount: amount * 100, // in paise
    currency: "INR",
    receipt: `sub_${Date.now()}`,
    notes: {
      userId: req.user._id.toString(),
      plan
    }
  });

  res.json({
    status: "success",
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: keyId
  });
});

export const verifyRazorpaySubscriptionPayment = asyncHandler(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

  const keySecret = env.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return next(new AppError("Razorpay API Configuration missing.", 500));
  }

  // Verify signature
  const hmac = crypto.createHmac("sha256", keySecret);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generatedSignature = hmac.digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return next(new AppError("Payment verification failed.", 400));
  }

  // Update subscription
  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  user.subscription = buildSubscription(plan, { status: "active" });
  await user.save();

  res.json({
    status: "success",
    message: `Plan ${plan} activated successfully via Razorpay`,
    subscription: user.subscription
  });
});
