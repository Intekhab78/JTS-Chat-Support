import { Customer } from "../models/Customer.js";
import { Ticket } from "../models/Ticket.js";
import { Website } from "../models/Website.js";
import { User } from "../models/User.js";
import { Invoice } from "../models/Invoice.js";
import { Payment } from "../models/Payment.js";
import { Visitor } from "../models/Visitor.js";
import { ChatSession } from "../models/ChatSession.js";
import { Article } from "../models/Article.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import mongoose from "mongoose";

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveAnalyticsWebsiteScope(req, { websiteId, clientId } = {}) {
  const isAdmin = req.user?.role === "admin";
  if (!isAdmin) {
    const ownedIds = (await getOwnedWebsiteIds(req.user)).map((id) => new mongoose.Types.ObjectId(id));
    if (websiteId) {
      if (!mongoose.Types.ObjectId.isValid(String(websiteId))) return { $in: [] };
      const allowed = ownedIds.some((id) => id.toString() === String(websiteId));
      return allowed ? new mongoose.Types.ObjectId(websiteId) : { $in: [] };
    }
    return { $in: ownedIds };
  }
  if (websiteId && mongoose.Types.ObjectId.isValid(String(websiteId))) {
    return new mongoose.Types.ObjectId(websiteId);
  }
  if (clientId && mongoose.Types.ObjectId.isValid(String(clientId))) {
    const websites = await Website.find({ managerId: clientId }).select("_id");
    return { $in: websites.map((w) => w._id) };
  }
  return null;
}

const getDateFilter = (range) => {
  const now = new Date();
  let startDate = new Date();
  if (range === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else if (range === 'month') {
    startDate.setMonth(now.getMonth() - 1);
  } else if (range === 'year') {
    startDate.setFullYear(now.getFullYear() - 1);
  } else {
    startDate = new Date(0); // All time
  }
  return { $gte: startDate, $lte: now };
};

const getPrevDateFilter = (range) => {
  const now = new Date();
  let endDate = new Date();
  let startDate = new Date();

  if (range === 'today') {
    endDate.setHours(0, 0, 0, 0);
    startDate.setDate(now.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    endDate.setDate(now.getDate() - 7);
    startDate.setDate(now.getDate() - 14);
  } else if (range === 'month') {
    endDate.setMonth(now.getMonth() - 1);
    startDate.setMonth(now.getMonth() - 2);
  } else if (range === 'year') {
    endDate.setFullYear(now.getFullYear() - 1);
    startDate.setFullYear(now.getFullYear() - 2);
  } else {
    return { $gte: new Date(0), $lte: new Date(0) }; // All time has no prev
  }
  return { $gte: startDate, $lt: endDate };
};

const calculateTrend = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export const getExecutiveSummary = async (req, res) => {
  try {
    const { range = 'month' } = req.query;
    const currentFilter = getDateFilter(range);
    const prevFilter = getPrevDateFilter(range);

    const isAdmin = req.user?.role === "admin";
    const scopedWebsites = await resolveAnalyticsWebsiteScope(req, { websiteId: req.query.websiteId, clientId: req.query.clientId });
    const siteMatch = scopedWebsites ? { websiteId: scopedWebsites } : {};
    const websiteDocMatch = !isAdmin
      ? { _id: scopedWebsites }
      : {};

    const totalClients = isAdmin
      ? await User.countDocuments({ role: "client", createdAt: currentFilter })
      : 1;
    const prevClients = isAdmin
      ? await User.countDocuments({ role: "client", createdAt: prevFilter })
      : 1;

    const activeWebsites = await Website.countDocuments({ ...websiteDocMatch, isActive: true, createdAt: currentFilter });
    const prevWebsites = await Website.countDocuments({ ...websiteDocMatch, isActive: true, createdAt: prevFilter });

    const totalLeads = await Customer.countDocuments({ ...siteMatch, recordType: "lead", createdAt: currentFilter });
    const prevLeads = await Customer.countDocuments({ ...siteMatch, recordType: "lead", createdAt: prevFilter });

    const newLeadsToday = await Customer.countDocuments({
      ...siteMatch,
      recordType: "lead",
      createdAt: getDateFilter('today')
    });

    const openTickets = await Ticket.countDocuments({ ...siteMatch, status: { $in: ["open", "pending", "in_progress"] } });
    const resolvedTickets = await Ticket.countDocuments({ ...siteMatch, status: { $in: ["resolved", "closed"] }, updatedAt: currentFilter });
    const prevResolvedTickets = await Ticket.countDocuments({ ...siteMatch, status: { $in: ["resolved", "closed"] }, updatedAt: prevFilter });

    const activeAgents = isAdmin
      ? await User.countDocuments({ role: "agent" })
      : await User.countDocuments({ role: "agent", managerId: req.user.role === "client" ? req.user._id : req.user.managerId, ...(scopedWebsites ? { websiteIds: scopedWebsites } : {}) });

    const leadsWithRevenue = await Customer.aggregate([
      { $match: { ...siteMatch, recordType: 'customer', status: 'won', createdAt: currentFilter } },
      { $group: { _id: null, totalRevenue: { $sum: "$leadValue" } } }
    ]);
    const prevLeadsWithRevenue = await Customer.aggregate([
      { $match: { ...siteMatch, recordType: 'customer', status: 'won', createdAt: prevFilter } },
      { $group: { _id: null, totalRevenue: { $sum: "$leadValue" } } }
    ]);

    const revenue = leadsWithRevenue[0]?.totalRevenue || 0;
    const prevRevenue = prevLeadsWithRevenue[0]?.totalRevenue || 0;

    const mrr = revenue > 0 ? Math.round(revenue / 12) : 0;
    const prevMrr = prevRevenue > 0 ? Math.round(prevRevenue / 12) : 0;

    const [satisfiedCurr, unsatisfiedCurr, satisfiedPrev, unsatisfiedPrev] = await Promise.all([
      ChatSession.countDocuments({ ...siteMatch, satisfactionStatus: "satisfied", createdAt: currentFilter }),
      ChatSession.countDocuments({ ...siteMatch, satisfactionStatus: "unsatisfied", createdAt: currentFilter }),
      ChatSession.countDocuments({ ...siteMatch, satisfactionStatus: "satisfied", createdAt: prevFilter }),
      ChatSession.countDocuments({ ...siteMatch, satisfactionStatus: "unsatisfied", createdAt: prevFilter })
    ]);
    const totalCurrFb = satisfiedCurr + unsatisfiedCurr;
    const totalPrevFb = satisfiedPrev + unsatisfiedPrev;
    const csat = totalCurrFb > 0 ? Number(((satisfiedCurr / totalCurrFb) * 100).toFixed(1)) : 0;
    const prevCsat = totalPrevFb > 0 ? Number(((satisfiedPrev / totalPrevFb) * 100).toFixed(1)) : 0;

    res.json({
      totalClients: { value: totalClients, trend: calculateTrend(totalClients, prevClients) },
      activeWebsites: { value: activeWebsites, trend: calculateTrend(activeWebsites, prevWebsites) },
      totalLeads: { value: totalLeads, trend: calculateTrend(totalLeads, prevLeads) },
      newLeadsToday: { value: newLeadsToday, trend: 0 },
      openTickets: { value: openTickets, trend: 0 },
      resolvedTickets: { value: resolvedTickets, trend: calculateTrend(resolvedTickets, prevResolvedTickets) },
      activeAgents: { value: activeAgents, trend: 0 },
      revenue: { value: revenue, trend: calculateTrend(revenue, prevRevenue) },
      mrr: { value: mrr, trend: calculateTrend(mrr, prevMrr) },
      csat: { value: csat, trend: calculateTrend(csat, prevCsat) }
    });
  } catch (error) {
    console.error("Error in getExecutiveSummary:", error);
    res.status(500).json({ message: "Server error retrieving executive summary", error: error.message });
  }
};

export const getLeadAnalytics = async (req, res) => {
  try {
    const { range = 'month', websiteId, agentId, clientId, service } = req.query;
    const dateFilter = getDateFilter(range);

    const matchQuery = { createdAt: dateFilter };
    const scopedWebsite = await resolveAnalyticsWebsiteScope(req, { websiteId, clientId });
    if (scopedWebsite) matchQuery.websiteId = scopedWebsite;

    if (agentId && mongoose.Types.ObjectId.isValid(String(agentId))) matchQuery.ownerId = new mongoose.Types.ObjectId(agentId);
    if (service) matchQuery.requirement = new RegExp(escapeRegex(service), 'i');

    const leadsByWebsite = await Customer.aggregate([
      { $match: { recordType: "lead", ...matchQuery } },
      { $group: { _id: "$websiteId", count: { $sum: 1 } } },
      { $lookup: { from: "websites", localField: "_id", foreignField: "_id", as: "website" } },
      { $unwind: "$website" },
      { $project: { name: { $ifNull: ["$website.websiteName", "$website.domain"] }, count: 1, _id: 0 } }
    ]);

    const funnel = await Customer.aggregate([
      { $match: { recordType: "lead", ...matchQuery } },
      { $group: { _id: "$leadStatus", value: { $sum: 1 } } },
      { $project: { name: "$_id", value: 1, _id: 0 } }
    ]);

    const leadsBySource = await Customer.aggregate([
      { $match: { recordType: "lead", ...matchQuery } },
      { $group: { _id: { $cond: [{ $eq: ["$leadSource", ""] }, "Unknown", "$leadSource"] }, count: { $sum: 1 } } },
      { $project: { name: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    const leadsByService = await Customer.aggregate([
      { $match: { recordType: "lead", ...matchQuery } },
      { $group: { _id: { $cond: [{ $eq: ["$requirement", ""] }, "General", "$requirement"] }, count: { $sum: 1 } } },
      { $project: { name: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const leadsOverTime = await Customer.aggregate([
      { $match: { recordType: "lead", ...matchQuery } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          leads: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", leads: 1, _id: 0 } }
    ]);

    const wonLeads = await Customer.countDocuments({ ...matchQuery, $or: [{ status: "won" }, { leadStatus: "won" }] });
    const lostLeads = await Customer.countDocuments({ ...matchQuery, $or: [{ status: "lost" }, { leadStatus: "lost" }] });
    const totalProcessed = await Customer.countDocuments(matchQuery);
    const conversionRate = totalProcessed > 0 ? ((wonLeads / totalProcessed) * 100).toFixed(1) : 0;

    res.json({
      leadsByWebsite,
      leadsBySource,
      leadsByService,
      leadsOverTime,
      funnel,
      wonLeads,
      lostLeads,
      conversionRate
    });
  } catch (error) {
    console.error("Error in getLeadAnalytics:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getTicketAnalytics = async (req, res) => {
  try {
    const { range = 'month', websiteId, agentId, clientId, department } = req.query;
    const dateFilter = getDateFilter(range);

    const matchQuery = { createdAt: dateFilter };
    const scopedWebsite = await resolveAnalyticsWebsiteScope(req, { websiteId, clientId });
    if (scopedWebsite) matchQuery.websiteId = scopedWebsite;
    if (agentId && mongoose.Types.ObjectId.isValid(String(agentId))) matchQuery.assignedAgent = new mongoose.Types.ObjectId(agentId);
    if (department) matchQuery.department = new RegExp(escapeRegex(department), 'i');

    const ticketsByStatus = await Ticket.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$status", value: { $sum: 1 } } },
      { $project: { name: "$_id", value: 1, _id: 0 } }
    ]);

    const ticketsByPriority = await Ticket.aggregate([
      { $match: matchQuery },
      { $group: { _id: "$priority", value: { $sum: 1 } } },
      { $project: { name: "$_id", value: 1, _id: 0 } }
    ]);

    const ticketsByCategory = await Ticket.aggregate([
      { $match: matchQuery },
      { $group: { _id: { $cond: [{ $eq: ["$category", null] }, "Uncategorized", "$category"] }, count: { $sum: 1 } } },
      { $project: { name: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const ticketsByDepartment = await Ticket.aggregate([
      { $match: matchQuery },
      { $group: { _id: { $cond: [{ $eq: ["$department", null] }, "General", "$department"] }, count: { $sum: 1 } } },
      { $project: { name: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const ticketsOverTime = await Ticket.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } }
    ]);

    const openCount = await Ticket.countDocuments({ status: { $in: ["open", "pending", "in_progress"] }, ...matchQuery });
    const resolvedCount = await Ticket.countDocuments({ status: { $in: ["resolved", "closed"] }, ...matchQuery });

    // Resolution Time Calculation
    const resolvedTickets = await Ticket.find({ status: { $in: ["resolved", "closed"] }, resolvedAt: { $exists: true }, ...matchQuery }).select("createdAt resolvedAt");
    let totalResolutionTime = 0;
    resolvedTickets.forEach(t => {
      totalResolutionTime += (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60); // hours
    });
    const avgResolutionTime = resolvedTickets.length > 0 ? (totalResolutionTime / resolvedTickets.length).toFixed(1) + " hours" : "N/A";

    // SLA Compliance Calculation
    const totalSlaTickets = await Ticket.countDocuments({ ...matchQuery, resolutionDueAt: { $exists: true, $ne: null } });
    const breachedSlaTickets = await Ticket.countDocuments({ ...matchQuery, slaBreachedAt: { $exists: true, $ne: null } });
    const slaCompliance = totalSlaTickets > 0 ? (((totalSlaTickets - breachedSlaTickets) / totalSlaTickets) * 100).toFixed(1) + "%" : "100%";

    res.json({
      ticketsByStatus,
      ticketsByPriority,
      ticketsByCategory,
      ticketsByDepartment,
      ticketsOverTime,
      openCount,
      resolvedCount,
      avgResolutionTime,
      slaCompliance
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAgentPerformanceAnalytics = async (req, res) => {
  try {
    const { range = 'month', clientId, websiteId } = req.query;
    const dateFilter = getDateFilter(range);

    const matchQuery = { createdAt: dateFilter };
    const scopedWebsite = await resolveAnalyticsWebsiteScope(req, { websiteId, clientId });
    if (scopedWebsite) matchQuery.websiteId = scopedWebsite;

    const agentQuery = { role: { $in: ["agent", "sales"] } };
    if (req.user?.role !== "admin") {
      agentQuery.managerId = req.user.role === "client" ? req.user._id : req.user.managerId;
    }
    if (scopedWebsite) agentQuery.websiteIds = scopedWebsite;

    // Agent aggregations
    const agents = await User.find(agentQuery);

    const performanceData = await Promise.all(agents.map(async (agent) => {
      const agentMatchQuery = { ...matchQuery, assignedAgent: agent._id };

      const assignedTickets = await Ticket.countDocuments(agentMatchQuery);
      const resolvedTickets = await Ticket.countDocuments({ ...agentMatchQuery, status: { $in: ["resolved", "closed"] } });

      const wonDeals = await Customer.countDocuments({
        ...(scopedWebsite ? { websiteId: scopedWebsite } : {}),
        ownerId: agent._id,
        status: "won",
        createdAt: dateFilter
      });

      const ratedSessions = await ChatSession.find({
        ...(scopedWebsite ? { websiteId: scopedWebsite } : {}),
        assignedAgent: agent._id,
        feedbackRating: { $gte: 1 }
      }).select("feedbackRating");

      const productivityScore = (resolvedTickets === 0 && wonDeals === 0 && assignedTickets === 0) ? 0 : Math.min(100, Math.round((resolvedTickets * 5) + (wonDeals * 10) + (assignedTickets * 2)));
      const csat = ratedSessions.length > 0
        ? Math.round((ratedSessions.reduce((s, r) => s + Number(r.feedbackRating || 0), 0) / (ratedSessions.length * 5)) * 100)
        : 0;

      return {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        assignedTickets,
        resolvedTickets,
        wonDeals,
        productivityScore,
        csat
      };
    }));

    // Leaderboards
    const topSupport = [...performanceData].filter(a => a.role === 'agent').sort((a, b) => b.resolvedTickets - a.resolvedTickets).slice(0, 5);
    const topSales = [...performanceData].filter(a => a.role === 'sales').sort((a, b) => b.wonDeals - a.wonDeals).slice(0, 5);
    const topPerformers = [...performanceData].sort((a, b) => b.productivityScore - a.productivityScore).slice(0, 5);

    res.json({
      metrics: {
        totalAgents: agents.length,
        avgProductivity: (performanceData.reduce((acc, curr) => acc + curr.productivityScore, 0) / (agents.length || 1)).toFixed(1),
        avgCsat: (performanceData.reduce((acc, curr) => acc + curr.csat, 0) / (agents.length || 1)).toFixed(1) + "%",
      },
      topSupport,
      topSales,
      topPerformers,
      allAgents: performanceData
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getRevenueAnalytics = async (req, res) => {
  try {
    const { range = 'month', clientId, websiteId } = req.query;

    let websiteFilter = {};
    const scopedWebsite = await resolveAnalyticsWebsiteScope(req, { websiteId, clientId });
    if (scopedWebsite) {
      websiteFilter.websiteId = scopedWebsite;
    }

    // 1. Aggregate real completed payments
    const payments = await Payment.find({
      ...websiteFilter,
      status: "completed"
    }).populate("customerId", "name companyName");

    const totalRevenueCalc = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 2. Real Invoices metrics
    const invoices = await Invoice.find({
      ...websiteFilter,
      status: { $in: ["paid", "partially_paid", "pending"] }
    }).populate("customerId", "name companyName");

    const paidInvoicesTotal = invoices
      .filter(i => i.status === "paid" || i.paymentStatus === "paid")
      .reduce((sum, i) => sum + (Number(i.paidAmount || i.total) || 0), 0);

    const effectiveTotal = totalRevenueCalc > 0 ? totalRevenueCalc : paidInvoicesTotal;

    // Estimate MRR / ARR from actual recurring or 30-day run rate
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRevenue = payments
      .filter(p => new Date(p.paymentDate || p.createdAt) >= thirtyDaysAgo)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const mrr = recentRevenue > 0 ? recentRevenue : Math.round(effectiveTotal / 12) || 0;
    const arr = mrr * 12;

    // 3. Real Revenue by Client
    const clientRevenueMap = {};
    for (const p of payments) {
      const clientName = p.customerId?.companyName || p.customerId?.name || "Direct Customer";
      clientRevenueMap[clientName] = (clientRevenueMap[clientName] || 0) + Number(p.amount || 0);
    }
    for (const inv of invoices.filter(i => i.status === "paid")) {
      const clientName = inv.customerId?.companyName || inv.customerId?.name || "Direct Customer";
      if (!clientRevenueMap[clientName]) {
        clientRevenueMap[clientName] = Number(inv.paidAmount || inv.total || 0);
      }
    }

    const revenueByClient = Object.entries(clientRevenueMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 4. Real monthly revenue growth
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(currentMonthIdx - i);
      const mIdx = d.getMonth();
      const mYear = d.getFullYear();

      const mPayments = payments.filter(p => {
        const pDate = new Date(p.paymentDate || p.createdAt);
        return pDate.getMonth() === mIdx && pDate.getFullYear() === mYear;
      });
      const mRev = mPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
      last6Months.push({
        month: months[mIdx],
        revenue: mRev,
        subscriptions: mPayments.length
      });
    }

    const pendingInvoicesTotal = invoices
      .filter(i => i.status !== "paid" && i.paymentStatus !== "paid")
      .reduce((sum, i) => sum + Math.max(0, Number(i.total || 0) - Number(i.paidAmount || 0)), 0);

    res.json({
      metrics: {
        totalRevenueAmount: effectiveTotal,
        pendingAmount: pendingInvoicesTotal,
        mrrAmount: mrr,
        arrAmount: arr,
        totalRevenue: effectiveTotal,
        pendingRevenue: pendingInvoicesTotal,
        mrr,
        arr
      },
      revenueGrowth: last6Months,
      revenueByClient
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getWebsiteAnalytics = async (req, res) => {
  try {
    const { range = 'month', clientId, websiteId } = req.query;
    const dateFilter = getDateFilter(range);

    const matchQuery = {};
    const scopedWebsite = await resolveAnalyticsWebsiteScope(req, { websiteId, clientId });
    if (scopedWebsite) {
      matchQuery._id = scopedWebsite;
    }

    const websites = await Website.find(matchQuery).select('_id domain websiteName');

    const performanceData = await Promise.all(websites.map(async (site) => {
      const [leadsGenerated, ticketsCreated, visitors, chatSessions] = await Promise.all([
        Customer.countDocuments({ recordType: "lead", websiteId: site._id, createdAt: dateFilter }),
        Ticket.countDocuments({ websiteId: site._id, createdAt: dateFilter }),
        Visitor.countDocuments({ websiteId: site._id, createdAt: dateFilter }),
        ChatSession.countDocuments({ websiteId: site._id, createdAt: dateFilter })
      ]);

      const conversionRate = visitors > 0 ? Math.min(100, (leadsGenerated / visitors) * 100).toFixed(1) : 0;

      return {
        _id: site._id,
        name: site.websiteName || site.domain,
        domain: site.domain,
        visitors,
        chatSessions,
        leadsGenerated,
        ticketsCreated,
        conversionRate: parseFloat(conversionRate)
      };
    }));

    // Rank websites by Visitors
    const rankedWebsites = [...performanceData].sort((a, b) => b.visitors - a.visitors);

    const totalVisitors = performanceData.reduce((acc, curr) => acc + curr.visitors, 0);
    const totalChatSessions = performanceData.reduce((acc, curr) => acc + curr.chatSessions, 0);
    const totalLeads = performanceData.reduce((acc, curr) => acc + curr.leadsGenerated, 0);
    const totalTickets = performanceData.reduce((acc, curr) => acc + curr.ticketsCreated, 0);
    const overallConversion = totalVisitors > 0 ? Math.min(100, (totalLeads / totalVisitors) * 100).toFixed(1) : 0;

    res.json({
      metrics: {
        visitors: totalVisitors,
        chatSessions: totalChatSessions,
        leadsGenerated: totalLeads,
        ticketsCreated: totalTickets,
        conversionRate: `${overallConversion}%`
      },
      websiteComparison: performanceData,
      performanceRanking: rankedWebsites.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getCustomerInsightsAnalytics = async (req, res) => {
  try {
    const { range = 'month', clientId, websiteId } = req.query;
    const dateFilter = getDateFilter(range);

    const matchQuery = { recordType: "customer" };
    const scopedWebsite = await resolveAnalyticsWebsiteScope(req, { websiteId, clientId });
    if (scopedWebsite) matchQuery.websiteId = scopedWebsite;

    // Total historical customers
    const totalCustomers = await Customer.countDocuments(matchQuery);

    // Active customers
    const activeCustomers = await Customer.countDocuments({ ...matchQuery, status: "won" });

    // Retention & Churn
    const churnedCustomers = await Customer.countDocuments({ ...matchQuery, status: "lost" });
    const churnRate = totalCustomers > 0 ? ((churnedCustomers / totalCustomers) * 100).toFixed(1) : 0;
    const retentionRate = (100 - churnRate).toFixed(1);

    const ratedSessions = await ChatSession.find({
      ...(scopedWebsite ? { websiteId: scopedWebsite } : {}),
      feedbackRating: { $gte: 1 }
    }).select("feedbackRating");
    const csat = ratedSessions.length > 0
      ? (ratedSessions.reduce((s, r) => s + Number(r.feedbackRating || 0), 0) / (ratedSessions.length * 5)) * 100
      : 0;

    // Growth over time
    const growthTrend = await Customer.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 6 },
      { $project: { month: "$_id", count: 1, _id: 0 } }
    ]);

    // Value by territory/region
    const customerByRegion = await Customer.aggregate([
      { $match: matchQuery },
      { $group: { _id: { $cond: [{ $or: [{ $eq: ["$territory", ""] }, { $eq: ["$territory", null] }] }, "Global / Unassigned", "$territory"] }, count: { $sum: 1 } } },
      { $project: { name: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      metrics: {
        totalCustomers,
        activeCustomers,
        retentionRate: `${retentionRate}%`,
        churnRate: `${churnRate}%`,
        customerSatisfaction: `${csat.toFixed(1)}%`
      },
      growthTrend,
      customerByRegion
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getAiInsightsAnalytics = async (req, res) => {
  try {
    const { range = 'month', clientId, websiteId } = req.query;
    const dateFilter = getDateFilter(range);
    const scopedWebsite = await resolveAnalyticsWebsiteScope(req, { websiteId, clientId });
    const siteMatch = scopedWebsite ? { websiteId: scopedWebsite } : {};

    const [
      ticketCategories,
      serviceRequests,
      kbArticles,
      totalChats,
      aiChats,
      satisfiedChats,
      unsatisfiedChats,
      leadsList
    ] = await Promise.all([
      Ticket.aggregate([
        { $match: { ...siteMatch, createdAt: dateFilter } },
        { $group: { _id: { $ifNull: ["$category", "General Support"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      Customer.aggregate([
        { $match: { ...siteMatch, createdAt: dateFilter } },
        { $group: { _id: { $cond: [{ $or: [{ $eq: ["$requirement", ""] }, { $eq: ["$requirement", null] }] }, "General Inquiry", "$requirement"] }, requests: { $sum: 1 } } },
        { $sort: { requests: -1 } },
        { $limit: 5 }
      ]),
      Article.find(siteMatch).sort({ views: -1, updatedAt: -1 }).limit(5).select("title views helpfulCount"),
      ChatSession.countDocuments({ ...siteMatch, createdAt: dateFilter }),
      ChatSession.countDocuments({ ...siteMatch, assignedAgent: null, createdAt: dateFilter }),
      ChatSession.countDocuments({ ...siteMatch, satisfactionStatus: "satisfied", createdAt: dateFilter }),
      ChatSession.countDocuments({ ...siteMatch, satisfactionStatus: "unsatisfied", createdAt: dateFilter }),
      Customer.find({ ...siteMatch, createdAt: dateFilter }).select("leadScore")
    ]);

    const trendingIssues = ticketCategories.map((t) => ({
      issue: t._id || "General Support",
      count: t.count,
      trend: "Live"
    }));

    const mostRequestedServices = serviceRequests.map((s) => {
      const raw = String(s._id || "General Inquiry");
      const reqMatch = raw.match(/(?:Requirement|Requierment)\s*:\s*(.+)$/i);
      const clean = (reqMatch ? reqMatch[1] : raw).replace(/\s+/g, " ").trim();
      return {
        service: clean.length > 50 ? `${clean.slice(0, 47)}...` : clean,
        requests: s.requests
      };
    });

    const faqAnalytics = kbArticles.map((a) => ({
      question: a.title,
      views: a.views || 0,
      helpfulness: a.helpfulCount ? `${Math.min(100, a.helpfulCount * 10)}%` : "100%"
    }));

    const ticketPrediction = ticketCategories.map((t) => ({
      category: t._id || "General Support",
      predictedVolume: t.count,
      confidence: t.count > 0 ? "100%" : "—"
    }));

    const avgLeadQualityScore = leadsList.length > 0
      ? Math.round(leadsList.reduce((acc, l) => acc + (Number(l.leadScore) || 50), 0) / leadsList.length)
      : 0;

    const aiResolutionRate = totalChats > 0
      ? `${Math.round((aiChats / totalChats) * 100)}%`
      : "0%";

    const totalSentiment = satisfiedChats + unsatisfiedChats;
    const sentimentScore = totalSentiment > 0
      ? `Positive (${Math.round((satisfiedChats / totalSentiment) * 100)}%)`
      : "No Ratings Yet";

    const totalTicketCount = ticketCategories.reduce((acc, t) => acc + (t.count || 0), 0);
    const totalLeadCount = leadsList.length;
    const forecastData = [
      { month: "Current Period", tickets: totalTicketCount, leads: totalLeadCount },
      { month: "Month +1 (Proj)", tickets: Math.round(totalTicketCount * 1.05), leads: Math.round(totalLeadCount * 1.1) },
      { month: "Month +2 (Proj)", tickets: Math.round(totalTicketCount * 1.10), leads: Math.round(totalLeadCount * 1.2) },
      { month: "Month +3 (Proj)", tickets: Math.round(totalTicketCount * 1.15), leads: Math.round(totalLeadCount * 1.3) }
    ];

    res.json({
      metrics: {
        avgLeadQualityScore,
        aiResolutionRate,
        sentimentScore
      },
      forecastData,
      trendingIssues,
      mostRequestedServices,
      faqAnalytics,
      ticketPrediction
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
