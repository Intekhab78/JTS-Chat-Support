import Stripe from "stripe";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { buildSubscription, buildSubscriptionAsync } from "../utils/planUtils.js";
import { SubscriptionPlan } from "../models/SubscriptionPlan.js";
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

  // Admin sees all clients
  if (role === "admin") {
    const users = await User.find({ role: "client" }).select("name email subscription stripeSubscriptionId");
    return res.json(users);
  }

  // Accounts user sees only their own client's subscription (their managerId)
  if (role === "accounts") {
    const clientId = req.user.managerId;
    if (!clientId) return res.json([]);
    const client = await User.findById(clientId).select("name email subscription stripeSubscriptionId");
    return res.json(client ? [client] : []);
  }
});

export const adminUpdateClientSubscription = asyncHandler(async (req, res, next) => {
  const role = normalizeRole(req.user.role);
  if (role !== "admin") {
    return next(new AppError("Only Superadmin can update client subscriptions", 403));
  }

  const { clientId, plan, status, offerCode, discountPercentage, specialNotes, agentSeats, websiteSlots, durationDays } = req.body;

  const client = await User.findById(clientId);
  if (!client || client.role !== "client") {
    return next(new AppError("Client user not found", 404));
  }

  const updatedSub = await buildSubscriptionAsync(plan || client.subscription?.plan || "basic", {
    status: status || client.subscription?.status || "active"
  });

  if (offerCode !== undefined) updatedSub.offerCode = offerCode;
  if (discountPercentage !== undefined) updatedSub.discountPercentage = Number(discountPercentage) || 0;
  if (specialNotes !== undefined) updatedSub.specialNotes = specialNotes;

  if (agentSeats !== undefined && !Number.isNaN(Number(agentSeats))) {
    updatedSub.limits.agents = Number(agentSeats);
  }
  if (websiteSlots !== undefined && !Number.isNaN(Number(websiteSlots))) {
    updatedSub.limits.websites = Number(websiteSlots);
  }

  if (durationDays && Number(durationDays) > 0) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + Number(durationDays));
    updatedSub.expiresAt = expiry;
  }

  client.subscription = updatedSub;
  await client.save();

  res.json({
    status: "success",
    message: `Subscription successfully updated for ${client.name}`,
    subscription: client.subscription
  });
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
  if (!plan) {
    return next(new AppError("Plan is required", 400));
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Fully dynamic plan resolution from MongoDB
  user.subscription = await buildSubscriptionAsync(plan, { status: "active" });

  await user.save();

  res.json({
    status: "success",
    message: `Plan ${plan} activated successfully`,
    subscription: user.subscription
  });
});

export const createRazorpaySubscriptionOrder = asyncHandler(async (req, res, next) => {
  const { plan } = req.body;
  const planDoc = await SubscriptionPlan.findOne({ code: String(plan || "").toLowerCase() });
  const monthlyPrice = planDoc ? planDoc.monthlyPrice : 49;
  const amount = Math.floor(monthlyPrice * 80); // USD to INR conversion (e.g. $49 -> ₹3,920)

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
      website_source: "JTS Chat Support",
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
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, billingPeriod } = req.body;

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
  
  const days = billingPeriod === "annual" ? 365 : 30;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  user.subscription.expiresAt = expiryDate;

  await user.save();

  res.json({
    status: "success",
    message: `Plan ${plan} activated successfully via Razorpay`,
    subscription: user.subscription
  });
});
