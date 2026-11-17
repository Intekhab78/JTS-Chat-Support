import { User } from "../models/User.js";
import { Website } from "../models/Website.js";
import { Customer } from "../models/Customer.js";
import { Ticket } from "../models/Ticket.js";
import { ChatSession } from "../models/ChatSession.js";
import { SubscriptionPlan } from "../models/SubscriptionPlan.js";
import { SaasFinancial } from "../models/SaasFinancial.js";
import asyncHandler from "../utils/asyncHandler.js";
import { logAuditEvent } from "../services/auditService.js";

const FALLBACK_PLAN_PRICES = {
  basic: 49,
  standard: 149,
  pro: 399,
  enterprise: 899
};

const INFRA_FIELDS = [
  "serverCost",
  "mongoCost",
  "storageCost",
  "bandwidthCost",
  "emailCost",
  "whatsappCost",
  "smsCost",
  "apiCost",
  "backupCost",
  "monitoringCost"
];

function sanitizeMonth(input) {
  const str = String(input || "").trim();
  if (/^\d{4}-\d{2}$/.test(str)) return str;
  return new Date().toISOString().slice(0, 7);
}

function getMonthBounds(monthStr) {
  const [year, mon] = monthStr.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, mon, 0, 23, 59, 59, 999));
  const prevEnd = new Date(start.getTime() - 1);
  const prevMonthStr = prevEnd.toISOString().slice(0, 7);
  return { start, end, prevEnd, prevMonthStr };
}

async function buildPlanPriceMap() {
  const plans = await SubscriptionPlan.find({ isActive: { $ne: false } })
    .select("code name monthlyPrice")
    .lean();
  const map = { ...FALLBACK_PLAN_PRICES };
  plans.forEach((p) => {
    const price = Number(p.monthlyPrice);
    if (!Number.isFinite(price)) return;
    if (p.code) map[String(p.code).trim().toLowerCase()] = price;
    if (p.name) map[String(p.name).trim().toLowerCase()] = price;
  });
  return map;
}

function resolveClientMonthlyRevenue(user, planPriceMap) {
  const tier = String(user.subscription?.plan || "standard").trim().toLowerCase();
  const basePrice = planPriceMap[tier] ?? FALLBACK_PLAN_PRICES.standard;
  const discount = Math.min(100, Math.max(0, Number(user.subscription?.discountPercentage || 0)));
  return Number((basePrice * (1 - discount / 100)).toFixed(2));
}

function isPaidActiveStatus(status) {
  return status === "active";
}

function isTrialStatus(status) {
  return status === "trial" || status === "trialing";
}

function isChurnedStatus(status) {
  return status === "expired" || status === "suspended" || status === "canceled" || status === "cancelled";
}

function computeInfraTotal(doc) {
  if (!doc) return 0;
  return INFRA_FIELDS.reduce((sum, field) => sum + (Number(doc[field]) || 0), 0);
}

export const getFinancialOverview = asyncHandler(async (req, res) => {
  const targetMonth = sanitizeMonth(req.query.month);
  const { end: monthEnd, prevEnd, prevMonthStr } = getMonthBounds(targetMonth);

  // Fetch or initialize monthly infrastructure cost record
  let costDoc = await SaasFinancial.findOne({ month: targetMonth });
  if (!costDoc) {
    costDoc = await SaasFinancial.create({ month: targetMonth });
  }

  const allCostMonths = await SaasFinancial.find({}).select("month").sort({ month: -1 }).lean();
  const availableMonths = [...new Set([new Date().toISOString().slice(0, 7), targetMonth, ...allCostMonths.map((d) => d.month)])]
    .sort()
    .reverse();

  const planPriceMap = await buildPlanPriceMap();

  const clients = await User.find({ role: "client" })
    .select("subscription createdAt name email")
    .lean();

  const totalCompanies = clients.length;
  const totalUsers = await User.countDocuments({});

  let activeSubscriptions = 0;
  let trialAccounts = 0;
  let expiredAccounts = 0;
  let cancelledAccounts = 0;
  let renewalsDueNext30Days = 0;

  let mrr = 0;
  let trialPipelineMrr = 0;
  let lastMonthRevenue = 0;

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  clients.forEach((u) => {
    const status = String(u.subscription?.status || "active").toLowerCase();
    const rev = resolveClientMonthlyRevenue(u, planPriceMap);
    const createdAt = u.createdAt ? new Date(u.createdAt) : now;

    if (isPaidActiveStatus(status)) {
      activeSubscriptions += 1;
      if (createdAt <= monthEnd) {
        mrr += rev;
      }
      if (createdAt <= prevEnd) {
        lastMonthRevenue += rev;
      }
    } else if (isTrialStatus(status)) {
      trialAccounts += 1;
      if (createdAt <= monthEnd) {
        trialPipelineMrr += rev;
      }
    } else if (status === "expired") {
      expiredAccounts += 1;
    } else if (isChurnedStatus(status)) {
      cancelledAccounts += 1;
    }

    if (
      (isPaidActiveStatus(status) || isTrialStatus(status)) &&
      u.subscription?.expiresAt
    ) {
      const exp = new Date(u.subscription.expiresAt);
      if (exp >= now && exp <= in30Days) {
        renewalsDueNext30Days += 1;
      }
    }
  });

  mrr = Number(mrr.toFixed(2));
  trialPipelineMrr = Number(trialPipelineMrr.toFixed(2));
  lastMonthRevenue = Number(lastMonthRevenue.toFixed(2));

  const activeCompanies = activeSubscriptions + trialAccounts;
  const inactiveCompanies = Math.max(0, totalCompanies - activeCompanies);

  const arr = Number((mrr * 12).toFixed(2));
  const daysInMonth = new Date(monthEnd.getUTCFullYear(), monthEnd.getUTCMonth() + 1, 0).getUTCDate();
  const todayRevenue = Number((mrr / (daysInMonth || 30)).toFixed(2));
  const thisMonthRevenue = mrr;
  const yearlyRevenue = arr;

  const growthPercentage =
    lastMonthRevenue > 0
      ? Number((((mrr - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1))
      : mrr > 0
      ? 100
      : 0;

  const infraCost = Number(computeInfraTotal(costDoc).toFixed(2));
  const cacBudget = Number(costDoc.cacBudget || 0);

  const grossProfit = Number((mrr - infraCost).toFixed(2));
  const netProfit = Number((grossProfit - cacBudget).toFixed(2));
  const grossProfitMargin = mrr > 0 ? Number(((grossProfit / mrr) * 100).toFixed(1)) : 0;
  const netProfitMargin = mrr > 0 ? Number(((netProfit / mrr) * 100).toFixed(1)) : 0;

  // SaaS Unit Economics
  const arpu = activeSubscriptions > 0 ? Math.round(mrr / activeSubscriptions) : 0;
  const churnedTotal = expiredAccounts + cancelledAccounts;
  const churnRate = totalCompanies > 0 ? Number(((churnedTotal / totalCompanies) * 100).toFixed(1)) : 0;
  const retentionRate = Number(Math.max(0, 100 - churnRate).toFixed(1));
  const ltv =
    arpu > 0
      ? churnRate > 0
        ? Math.round(arpu / (churnRate / 100))
        : arpu * 12
      : 0;
  const newClientsThisMonth = clients.filter((u) => {
    if (!u.createdAt) return false;
    return new Date(u.createdAt).toISOString().slice(0, 7) === targetMonth;
  }).length;
  const cac = newClientsThisMonth > 0 ? Math.round(cacBudget / newClientsThisMonth) : Math.round(cacBudget);
  const costPerCustomer = activeCompanies > 0 ? Math.round(infraCost / activeCompanies) : 0;

  // Build 6-month historical trend from actual client creation dates & saved SaasFinancial docs
  const trendMonths = [];
  const [tYear, tMon] = targetMonth.split("-").map(Number);
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(tYear, tMon - 1 - i, 1));
    trendMonths.push(d.toISOString().slice(0, 7));
  }
  const trendCostDocs = await SaasFinancial.find({ month: { $in: trendMonths } }).lean();
  const trendCostMap = Object.fromEntries(trendCostDocs.map((d) => [d.month, d]));

  const monthlyTrend = trendMonths.map((m) => {
    const { end } = getMonthBounds(m);
    const monthMrr = clients.reduce((sum, u) => {
      const status = String(u.subscription?.status || "active").toLowerCase();
      if (!isPaidActiveStatus(status)) return sum;
      const created = u.createdAt ? new Date(u.createdAt) : now;
      if (created <= end) {
        return sum + resolveClientMonthlyRevenue(u, planPriceMap);
      }
      return sum;
    }, 0);
    const cDoc = trendCostMap[m];
    const monthCost = computeInfraTotal(cDoc) + (Number(cDoc?.cacBudget) || 0);
    return {
      month: m,
      mrr: Number(monthMrr.toFixed(2)),
      cost: Number(monthCost.toFixed(2)),
      profit: Number((monthMrr - monthCost).toFixed(2))
    };
  });

  return res.json({
    month: targetMonth,
    prevMonth: prevMonthStr,
    availableMonths,
    summary: {
      mrr,
      arr,
      trialPipelineMrr,
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
      renewalsDueNext30Days
    },
    customerAnalytics: {
      totalCompanies,
      activeCompanies,
      inactiveCompanies,
      totalUsers
    },
    costAnalytics: {
      month: targetMonth,
      serverCost: Number(costDoc.serverCost || 0),
      mongoCost: Number(costDoc.mongoCost || 0),
      storageCost: Number(costDoc.storageCost || 0),
      bandwidthCost: Number(costDoc.bandwidthCost || 0),
      emailCost: Number(costDoc.emailCost || 0),
      whatsappCost: Number(costDoc.whatsappCost || 0),
      smsCost: Number(costDoc.smsCost || 0),
      apiCost: Number(costDoc.apiCost || 0),
      backupCost: Number(costDoc.backupCost || 0),
      monitoringCost: Number(costDoc.monitoringCost || 0),
      totalInfraCost: infraCost,
      cacBudget
    },
    saasMetrics: {
      arpu,
      ltv,
      cac,
      newClientsThisMonth,
      churnRate,
      costPerCustomer,
      retentionRate
    },
    monthlyTrend
  });
});

export const getTenantProfitability = asyncHandler(async (req, res) => {
  const targetMonth = sanitizeMonth(req.query.month);
  const costDoc = await SaasFinancial.findOne({ month: targetMonth }).lean();
  const totalInfraCost = computeInfraTotal(costDoc);

  const planPriceMap = await buildPlanPriceMap();

  const clients = await User.find({ role: "client" })
    .select("name companyName email subscription createdAt websiteIds")
    .populate("websiteIds", "websiteName domain")
    .lean();

  const allOwnedWebsites = await Website.find({
    ownerId: { $in: clients.map((c) => c._id) }
  })
    .select("_id ownerId websiteName domain")
    .lean();

  const websitesByOwner = new Map();
  allOwnedWebsites.forEach((w) => {
    const key = String(w.ownerId);
    if (!websitesByOwner.has(key)) websitesByOwner.set(key, []);
    websitesByOwner.get(key).push(w._id);
  });

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const rawTenants = await Promise.all(
    clients.map(async (client) => {
      const status = String(client.subscription?.status || "active").toLowerCase();
      const revenue = isPaidActiveStatus(status)
        ? resolveClientMonthlyRevenue(client, planPriceMap)
        : 0;

      const linkedIds = (client.websiteIds || []).map((w) => w._id || w);
      const ownedIds = websitesByOwner.get(String(client._id)) || [];
      const websiteIdSet = new Map();
      [...linkedIds, ...ownedIds].forEach((id) => {
        if (id) websiteIdSet.set(String(id), id);
      });
      const websiteIds = [...websiteIdSet.values()];

      const [customerCount, ticketCount, chatCount] = websiteIds.length
        ? await Promise.all([
            Customer.countDocuments({ websiteId: { $in: websiteIds } }),
            Ticket.countDocuments({ websiteId: { $in: websiteIds } }),
            ChatSession.countDocuments({ websiteId: { $in: websiteIds } })
          ])
        : [0, 0, 0];

      const usageWeight =
        websiteIds.length * 5 +
        customerCount * 1 +
        ticketCount * 0.5 +
        chatCount * 0.5 +
        (isPaidActiveStatus(status) || isTrialStatus(status) ? 1 : 0);

      let score = 100;
      if (isTrialStatus(status)) score = 75;
      else if (isChurnedStatus(status)) score = status === "suspended" ? 30 : 15;

      if (client.subscription?.expiresAt) {
        const exp = new Date(client.subscription.expiresAt);
        if (exp < now) score = Math.min(score, 20);
        else if (exp <= in7Days) score = Math.max(0, score - 10);
      }
      if (websiteIds.length === 0 && customerCount === 0 && chatCount === 0 && ticketCount === 0) {
        score = Math.max(0, score - 15);
      }

      return {
        id: client._id,
        companyName: client.companyName || client.name || "Enterprise Tenant",
        email: client.email,
        plan: client.subscription?.plan || "standard",
        status,
        revenue,
        websitesCount: websiteIds.length,
        customerRecords: customerCount,
        ticketCount,
        chatCount,
        usageWeight,
        healthScoreNum: Math.min(100, Math.max(0, Math.round(score)))
      };
    })
  );

  const totalWeight = rawTenants.reduce((sum, t) => sum + t.usageWeight, 0);

  const tenants = rawTenants.map((t) => {
    const estCost =
      totalInfraCost > 0 && totalWeight > 0
        ? Number(((t.usageWeight / totalWeight) * totalInfraCost).toFixed(2))
        : 0;
    const profit = Number((t.revenue - estCost).toFixed(2));
    const margin = t.revenue > 0 ? Number(((profit / t.revenue) * 100).toFixed(1)) : 0;
    return {
      id: t.id,
      companyName: t.companyName,
      email: t.email,
      plan: t.plan,
      status: t.status,
      revenue: t.revenue,
      estCost,
      profit,
      margin,
      websitesCount: t.websitesCount,
      customerRecords: t.customerRecords,
      ticketCount: t.ticketCount,
      chatCount: t.chatCount,
      healthScoreNum: t.healthScoreNum,
      healthScore: `${t.healthScoreNum}%`
    };
  });

  return res.json(tenants);
});

export const updateSaasCosts = asyncHandler(async (req, res) => {
  const targetMonth = sanitizeMonth(req.body.month || req.query.month);
  let costDoc = await SaasFinancial.findOne({ month: targetMonth });

  if (!costDoc) {
    costDoc = new SaasFinancial({ month: targetMonth });
  }

  const fields = [...INFRA_FIELDS, "cacBudget"];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      costDoc[field] = Math.max(0, Number(req.body[field]) || 0);
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
    changes: { month: targetMonth, ...req.body }
  });

  return res.json(costDoc);
});
