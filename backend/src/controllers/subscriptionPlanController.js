import { SubscriptionPlan } from "../models/SubscriptionPlan.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { normalizeRole } from "../utils/roleUtils.js";

const DEFAULT_PLANS = [
  {
    name: "Starter Basic Tier",
    code: "basic",
    description: "Essential live chat, help center, and basic lead capture for small businesses.",
    monthlyPrice: 49,
    annualPrice: 490,
    currency: "USD",
    currencySymbol: "$",
    limits: { agents: 2, websites: 1 },
    includedModules: ["crm", "service"],
    isPopular: false,
    isActive: true
  },
  {
    name: "Business Standard Tier",
    code: "standard",
    description: "Complete sales operations, invoicing, payments ledger, and helpdesk SLA ticketing.",
    monthlyPrice: 149,
    annualPrice: 1490,
    currency: "USD",
    currencySymbol: "$",
    limits: { agents: 5, websites: 3 },
    includedModules: ["crm", "operations", "finance", "service"],
    isPopular: false,
    isActive: true
  },
  {
    name: "Pro Enterprise Tier",
    code: "pro",
    description: "Full suite including UAE VAT Compliance, Corporate Tax, AI Workflows & BI Analytics.",
    monthlyPrice: 349,
    annualPrice: 3490,
    currency: "USD",
    currencySymbol: "$",
    limits: { agents: 10, websites: 10 },
    includedModules: ["crm", "operations", "finance", "compliance", "service", "automation"],
    isPopular: true,
    isActive: true
  },
  {
    name: "Custom Enterprise Unlimited",
    code: "enterprise",
    description: "Dedicated infrastructure, security audit trail, custom SLA, and high-capacity domain slots.",
    monthlyPrice: 799,
    annualPrice: 7990,
    currency: "USD",
    currencySymbol: "$",
    limits: { agents: 50, websites: 25 },
    includedModules: ["crm", "operations", "finance", "compliance", "service", "automation"],
    isPopular: false,
    isActive: true
  }
];

export const listSubscriptionPlans = asyncHandler(async (req, res) => {
  let plans = await SubscriptionPlan.find().sort({ monthlyPrice: 1 });
  if (plans.length === 0) {
    plans = await SubscriptionPlan.insertMany(DEFAULT_PLANS);
  }
  res.json(plans);
});

export const createSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const role = normalizeRole(req.user.role);
  if (role !== "admin") {
    return next(new AppError("Only Superadmin can create subscription plans", 403));
  }

  const { name, code, description, monthlyPrice, annualPrice, currency, currencySymbol, agents, websites, includedModules, isPopular } = req.body;
  if (!name || !code) {
    return next(new AppError("Plan Name and Code are required", 400));
  }

  const existing = await SubscriptionPlan.findOne({ code: code.toLowerCase() });
  if (existing) {
    return next(new AppError("A plan package with this code already exists", 400));
  }

  const plan = await SubscriptionPlan.create({
    name,
    code: code.toLowerCase(),
    description: description || "",
    monthlyPrice: Number(monthlyPrice) || 0,
    annualPrice: Number(annualPrice) || 0,
    currency: currency || "USD",
    currencySymbol: currencySymbol || "$",
    limits: {
      agents: Number(agents) || 5,
      websites: Number(websites) || 2
    },
    includedModules: Array.isArray(includedModules) ? includedModules : ["crm", "operations", "finance", "compliance", "service", "automation"],
    isPopular: !!isPopular,
    isActive: true
  });

  res.status(201).json(plan);
});

export const updateSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const role = normalizeRole(req.user.role);
  if (role !== "admin") {
    return next(new AppError("Only Superadmin can update subscription plans", 403));
  }

  const { id } = req.params;
  const updateData = {};
  const allowed = ["name", "description", "monthlyPrice", "annualPrice", "currency", "currencySymbol", "isPopular", "isActive", "includedModules"];

  allowed.forEach(f => {
    if (req.body[f] !== undefined) updateData[f] = req.body[f];
  });

  if (req.body.agents !== undefined || req.body.websites !== undefined) {
    updateData.limits = {
      agents: req.body.agents !== undefined ? Number(req.body.agents) : 5,
      websites: req.body.websites !== undefined ? Number(req.body.websites) : 2
    };
  }

  const plan = await SubscriptionPlan.findByIdAndUpdate(id, updateData, { new: true });
  if (!plan) {
    return next(new AppError("Subscription plan not found", 404));
  }

  res.json(plan);
});

export const deleteSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const role = normalizeRole(req.user.role);
  if (role !== "admin") {
    return next(new AppError("Only Superadmin can delete subscription plans", 403));
  }

  const { id } = req.params;
  await SubscriptionPlan.findByIdAndDelete(id);
  res.json({ message: "Subscription plan deleted successfully" });
});
