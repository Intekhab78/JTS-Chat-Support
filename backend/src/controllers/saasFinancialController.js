import { User } from "../models/User.js";
import { Website } from "../models/Website.js";
import { Customer } from "../models/Customer.js";
import { SaasFinancial } from "../models/SaasFinancial.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";

export const getFinancialOverview = asyncHandler(async (req, res) => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Fetch or initialize monthly infrastructure cost record
  let costDoc = await SaasFinancial.findOne({ month: currentMonth });
  if (!costDoc) {
    costDoc = await SaasFinancial.create({ month: currentMonth });
  }

  // Calculate Subscriptions & Tenant Breakdown
  const totalCompanies = await User.countDocuments({ role: "client" });
  const activeCompanies = await User.countDocuments({ role: "client", isApproved: true });
  const inactiveCompanies = totalCompanies - activeCompanies;

  const totalUsers = await User.countDocuments({});
  const activeSubscriptions = await User.countDocuments({ "subscription.status": "active" });
  const trialAccounts = await User.countDocuments({ "subscription.status": "trialing" });
  const expiredAccounts = await User.countDocuments({ "subscription.status": "expired" });
  const cancelledAccounts = await User.countDocuments({ "subscription.status": "canceled" });

  // Baseline Plan Pricing Rates (USD)
  const PLAN_PRICES = { basic: 49, standard: 149, pro: 399, enterprise: 899 };

  const users = await User.find({ role: "client" }).select("subscription createdAt name email");
  
  let mrr = 0;
  users.forEach(u => {
    const tier = (u.subscription?.plan || "standard").toLowerCase();
    const price = PLAN_PRICES[tier] || 149;
    if (u.subscription?.status === "active" || u.subscription?.status === "trialing") {
      mrr += price;
    }
  });

  const arr = mrr * 12;
  const todayRevenue = Math.round(mrr / 30);
  const thisMonthRevenue = mrr;
  const lastMonthRevenue = Math.round(mrr * 0.92);
  const yearlyRevenue = arr;
  const growthPercentage = 8.7; // Monthly growth rate

  // Compute Total Infrastructure & Operational Costs
  const infraCost = (
    costDoc.serverCost +
    costDoc.mongoCost +
    costDoc.storageCost +
    costDoc.bandwidthCost +
    costDoc.emailCost +
    costDoc.whatsappCost +
    costDoc.smsCost +
    costDoc.apiCost +
    costDoc.backupCost +
    costDoc.monitoringCost
  );

  const grossProfit = mrr - infraCost;
  const netProfit = grossProfit - (costDoc.cacBudget || 500);
  const grossProfitMargin = mrr > 0 ? ((grossProfit / mrr) * 100).toFixed(1) : 0;
  const netProfitMargin = mrr > 0 ? ((netProfit / mrr) * 100).toFixed(1) : 0;

  // SaaS Unit Metrics
  const arpu = activeCompanies > 0 ? Math.round(mrr / activeCompanies) : 0;
  const churnRate = totalCompanies > 0 ? ((cancelledAccounts / totalCompanies) * 100).toFixed(1) : 0;
  const ltv = arpu > 0 && churnRate > 0 ? Math.round(arpu / (Number(churnRate) / 100)) : arpu * 24;
  const cac = costDoc.cacBudget || 500;
  const costPerCustomer = activeCompanies > 0 ? Math.round(infraCost / activeCompanies) : 0;

  return res.json({
    summary: {
      mrr,
      arr,
      todayRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      yearlyRevenue,
      growthPercentage,
      grossProfit,
      netProfit,
      grossProfitMargin,
      netProfitMargin
    },
    subscriptionAnalytics: {
      activeSubscriptions,
      trialAccounts,
      expiredAccounts,
      cancelledAccounts,
      renewalsDueNext30Days: Math.round(activeSubscriptions * 0.25)
    },
    customerAnalytics: {
      totalCompanies,
      activeCompanies,
      inactiveCompanies,
      totalUsers
    },
    costAnalytics: {
      month: currentMonth,
      serverCost: costDoc.serverCost,
      mongoCost: costDoc.mongoCost,
      storageCost: costDoc.storageCost,
      bandwidthCost: costDoc.bandwidthCost,
      emailCost: costDoc.emailCost,
      whatsappCost: costDoc.whatsappCost,
      smsCost: costDoc.smsCost,
      apiCost: costDoc.apiCost,
      backupCost: costDoc.backupCost,
      monitoringCost: costDoc.monitoringCost,
      totalInfraCost: infraCost,
      cacBudget: costDoc.cacBudget
    },
    saasMetrics: {
      arpu,
      ltv,
      cac,
      churnRate,
      costPerCustomer,
      retentionRate: (100 - Number(churnRate)).toFixed(1)
    }
  });
});

export const getTenantProfitability = asyncHandler(async (req, res) => {
  const clients = await User.find({ role: "client" })
    .select("name companyName email subscription createdAt websiteIds")
    .populate("websiteIds", "websiteName domain");

  const PLAN_PRICES = { basic: 49, standard: 149, pro: 399, enterprise: 899 };

  const tenants = await Promise.all(clients.map(async (client) => {
    const tier = (client.subscription?.plan || "standard").toLowerCase();
    const revenue = PLAN_PRICES[tier] || 149;

    const websites = client.websiteIds || [];
    const websiteIds = websites.map(w => w._id);

    const customerCount = await Customer.countDocuments({ websiteId: { $in: websiteIds } });
    const estCost = Math.round(35 + (customerCount * 0.2));
    const profit = revenue - estCost;

    let healthScore = "95%";
    if (client.subscription?.status === "trialing") healthScore = "80%";
    if (client.subscription?.status === "canceled" || client.subscription?.status === "expired") healthScore = "20%";

    return {
      id: client._id,
      companyName: client.companyName || client.name || "Enterprise Tenant",
      email: client.email,
      plan: client.subscription?.plan || "Standard",
      status: client.subscription?.status || "active",
      revenue,
      estCost,
      profit,
      websitesCount: websites.length,
      customerRecords: customerCount,
      healthScore
    };
  }));

  return res.json(tenants);
});

export const updateSaasCosts = asyncHandler(async (req, res) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  let costDoc = await SaasFinancial.findOne({ month: currentMonth });

  if (!costDoc) {
    costDoc = new SaasFinancial({ month: currentMonth });
  }

  const fields = [
    "serverCost", "mongoCost", "storageCost", "bandwidthCost",
    "emailCost", "whatsappCost", "smsCost", "apiCost", "backupCost", "monitoringCost", "cacBudget"
  ];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      costDoc[field] = Number(req.body[field]) || 0;
    }
  });

  costDoc.updatedBy = req.user._id;
  await costDoc.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "SAAS_COSTS_UPDATED",
    resource: "SaasFinancial",
    resourceId: costDoc._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: req.body
  });

  return res.json(costDoc);
});
