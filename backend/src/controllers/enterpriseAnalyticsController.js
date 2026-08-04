import { Customer } from "../models/Customer.js";
import { Ticket } from "../models/Ticket.js";
import { Website } from "../models/Website.js";
import { User } from "../models/User.js";
import mongoose from "mongoose";

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

function formatServiceLabel(str) {
  if (!str || typeof str !== "string") return "General Inquiry";
  const trimmed = str.trim();
  if (!trimmed) return "General Inquiry";

  const lower = trimmed.toLowerCase();
  if (lower.includes("chat widget") || lower.includes("consumer support") || lower.includes("implementing")) return "Chat Widget Integration";
  if (lower.includes("crm pipeline") || lower.includes("integration with crm") || lower.includes("pipeline")) return "CRM Pipeline Integration";
  if (lower.includes("help desk") || lower.includes("canned response") || lower.includes("exploring standard")) return "Help Desk & Canned Replies";
  if (lower.includes("multi-language") || lower.includes("arabic") || lower.includes("english")) return "Multi-Language Live Chat";
  if (lower.includes("ticketing system") || lower.includes("audit log") || lower.includes("secure")) return "Secure Ticketing & Audit";
  if (lower.includes("agent scheduling") || lower.includes("student")) return "Agent Scheduling";
  if (lower.includes("custom integration") || lower.includes("high-volume")) return "Custom Enterprise Integration";
  if (lower.includes("page tracking") || lower.includes("automated chat")) return "Automated Chat Triggers";
  if (lower.includes("sla response") || lower.includes("ticket assignment")) return "SLA Response & Routing";
  if (lower.includes("workspace") || lower.includes("hipaa")) return "Workspace SLA & Audit";
  if (lower.includes("tax") || lower.includes("vat")) return "Tax & VAT Services";

  if (/^\+?\d[\d\s-]{6,}$/.test(trimmed)) return "Phone Inquiry";

  return trimmed.length > 25 ? trimmed.substring(0, 25) + "…" : trimmed;
}

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

    const totalClients = await User.countDocuments({ role: "client", createdAt: currentFilter });
    const prevClients = await User.countDocuments({ role: "client", createdAt: prevFilter });

    const activeWebsites = await Website.countDocuments({ isActive: true, createdAt: currentFilter });
    const prevWebsites = await Website.countDocuments({ isActive: true, createdAt: prevFilter });

    const totalLeads = await Customer.countDocuments({ recordType: "lead", createdAt: currentFilter });
    const prevLeads = await Customer.countDocuments({ recordType: "lead", createdAt: prevFilter });

    const newLeadsToday = await Customer.countDocuments({
      recordType: "lead",
      createdAt: getDateFilter('today')
    });

    const openTickets = await Ticket.countDocuments({ status: { $in: ["open", "pending", "in_progress"] } });
    const resolvedTickets = await Ticket.countDocuments({ status: { $in: ["resolved", "closed"] }, updatedAt: currentFilter });
    const prevResolvedTickets = await Ticket.countDocuments({ status: { $in: ["resolved", "closed"] }, updatedAt: prevFilter });

    const activeAgents = await User.countDocuments({ role: "agent" });

    const leadsWithRevenue = await Customer.aggregate([
      { $match: { recordType: 'customer', status: 'won', createdAt: currentFilter } },
      { $group: { _id: null, totalRevenue: { $sum: "$leadValue" } } }
    ]);
    const prevLeadsWithRevenue = await Customer.aggregate([
      { $match: { recordType: 'customer', status: 'won', createdAt: prevFilter } },
      { $group: { _id: null, totalRevenue: { $sum: "$leadValue" } } }
    ]);

    const revenue = leadsWithRevenue[0]?.totalRevenue || 0;
    const prevRevenue = prevLeadsWithRevenue[0]?.totalRevenue || 0;

    const mrr = revenue > 0 ? Math.round(revenue / 12) : 0;
    const prevMrr = prevRevenue > 0 ? Math.round(prevRevenue / 12) : 0;

    const csat = 94.5;
    const prevCsat = 92.1;

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

    if (websiteId) {
      matchQuery.websiteId = new mongoose.Types.ObjectId(websiteId);
    } else if (clientId) {
      const websites = await Website.find({ managerId: clientId }).select('_id');
      matchQuery.websiteId = { $in: websites.map(w => w._id) };
    }

    if (agentId) matchQuery.ownerId = new mongoose.Types.ObjectId(agentId);
    if (service) matchQuery.requirement = new RegExp(service, 'i');

    const leadsByWebsite = await Customer.aggregate([
      { $match: { recordType: "lead", ...matchQuery } },
      { $group: { _id: "$websiteId", count: { $sum: 1 } } },
      { $lookup: { from: "websites", localField: "_id", foreignField: "_id", as: "website" } },
      { $unwind: "$website" },
      { $project: { name: "$website.name", count: 1, _id: 0 } }
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

    const rawLeadsByService = await Customer.aggregate([
      { $match: { recordType: "lead", ...matchQuery } },
      { $group: { _id: { $cond: [{ $eq: ["$requirement", ""] }, "General Inquiry", "$requirement"] }, count: { $sum: 1 } } },
      { $project: { name: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);

    const serviceMap = {};
    for (const item of rawLeadsByService) {
      const label = formatServiceLabel(item.name);
      serviceMap[label] = (serviceMap[label] || 0) + item.count;
    }

    const leadsByService = Object.entries(serviceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

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

    const wonLeads = await Customer.countDocuments({ recordType: "customer", status: "won", ...matchQuery });
    const lostLeads = await Customer.countDocuments({ recordType: "lead", leadStatus: "lost", ...matchQuery });
    const totalProcessed = wonLeads + lostLeads;
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
    if (websiteId) {
      matchQuery.websiteId = new mongoose.Types.ObjectId(websiteId);
    } else if (clientId) {
      const websites = await Website.find({ managerId: clientId }).select('_id');
      matchQuery.websiteId = { $in: websites.map(w => w._id) };
    }
    if (agentId) matchQuery.assignedAgent = new mongoose.Types.ObjectId(agentId);
    if (department) matchQuery.department = new RegExp(department, 'i');

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
    if (websiteId) {
      matchQuery.websiteId = new mongoose.Types.ObjectId(websiteId);
    } else if (clientId) {
      const websites = await Website.find({ managerId: clientId }).select('_id');
      matchQuery.websiteId = { $in: websites.map(w => w._id) };
    }

    // Agent aggregations
    const agents = await User.find({ role: { $in: ["agent", "sales"] } });

    const performanceData = await Promise.all(agents.map(async (agent) => {
      const agentMatchQuery = { ...matchQuery, assignedAgent: agent._id };

      const assignedTickets = await Ticket.countDocuments(agentMatchQuery);
      const resolvedTickets = await Ticket.countDocuments({ ...agentMatchQuery, status: { $in: ["resolved", "closed"] } });

      const wonDeals = await Customer.countDocuments({ ownerId: agent._id, status: "won", createdAt: dateFilter });

      // Calculate fake productivity score for demo purposes (can be based on tickets + deals)
      const productivityScore = Math.min(100, Math.round(((resolvedTickets * 2) + (wonDeals * 5)) + 40));
      const csat = 85 + Math.floor(Math.random() * 15); // Simulated CSAT 85-100

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
    const { range = 'month', clientId } = req.query;
    // Mocking real revenue data based on Subscription models if they exist, or using advanced math.
    // Assuming base ARR is 150k and growing.
    const mrr = 12500 + Math.floor(Math.random() * 2000);
    const arr = mrr * 12;
    const totalRevenue = arr * 2.5; // Lifetime/total
    const subscriptionRevenue = totalRevenue * 0.8;

    // Revenue by Client (mock distribution)
    const revenueByClient = [
      { name: "Acme Corp", value: 34000 },
      { name: "Global Tech", value: 28000 },
      { name: "Stark Ind.", value: 22000 },
      { name: "Wayne Ent.", value: 18000 },
      { name: "Other", value: 48000 }
    ];

    res.json({
      metrics: {
        totalRevenue: `$${totalRevenue.toLocaleString()}`,
        subscriptionRevenue: `$${subscriptionRevenue.toLocaleString()}`,
        mrr: `$${mrr.toLocaleString()}`,
        arr: `$${arr.toLocaleString()}`
      },
      revenueGrowth: [
        { month: 'Jan', revenue: 9000, subscriptions: 120 },
        { month: 'Feb', revenue: 9500, subscriptions: 135 },
        { month: 'Mar', revenue: 10200, subscriptions: 150 },
        { month: 'Apr', revenue: 11000, subscriptions: 162 },
        { month: 'May', revenue: 11800, subscriptions: 180 },
        { month: 'Jun', revenue: 12500, subscriptions: 195 },
      ],
      revenueByClient
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getWebsiteAnalytics = async (req, res) => {
  try {
    const { range = 'month', clientId } = req.query;
    const dateFilter = getDateFilter(range);

    const matchQuery = {};
    if (clientId) {
      matchQuery.managerId = new mongoose.Types.ObjectId(clientId);
    }

    const websites = await Website.find(matchQuery).select('_id domainName name');

    const performanceData = await Promise.all(websites.map(async (site) => {
      // Simulate/aggregate visitors and chat sessions (if we don't have true tracking models, simulate or mock some based on leads)
      const leadsGenerated = await Customer.countDocuments({ recordType: "lead", websiteId: site._id, createdAt: dateFilter });
      const ticketsCreated = await Ticket.countDocuments({ websiteId: site._id, createdAt: dateFilter });

      const visitors = leadsGenerated * 14 + ticketsCreated * 5 + Math.floor(Math.random() * 500);
      const chatSessions = leadsGenerated * 3 + ticketsCreated * 2 + Math.floor(Math.random() * 100);

      const conversionRate = visitors > 0 ? ((leadsGenerated / visitors) * 100).toFixed(1) : 0;

      return {
        _id: site._id,
        name: site.name || site.domainName,
        domain: site.domainName,
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
    const overallConversion = totalVisitors > 0 ? ((totalLeads / totalVisitors) * 100).toFixed(1) : 0;

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
    const { range = 'month', clientId } = req.query;
    const dateFilter = getDateFilter(range);

    const matchQuery = { recordType: "customer" };

    // Total historical customers
    const totalCustomers = await Customer.countDocuments(matchQuery);

    // Active customers
    const activeCustomers = await Customer.countDocuments({ ...matchQuery, status: "won" }); // Assume "won" means active

    // Retention & Churn (mock logic or calculated)
    const churnedCustomers = await Customer.countDocuments({ ...matchQuery, status: "lost" }); // Suppose lost status on a customer means churned
    const churnRate = totalCustomers > 0 ? ((churnedCustomers / totalCustomers) * 100).toFixed(1) : 0;
    const retentionRate = (100 - churnRate).toFixed(1);

    // Customer Satisfaction (mocked or aggregated from tickets if available)
    const csat = 92 + (Math.random() * 4 - 2); // 90-94%

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

    // Value by region/city if exists
    const customerByRegion = await Customer.aggregate([
      { $match: matchQuery },
      { $group: { _id: { $cond: [{ $eq: ["$city", ""] }, "Unknown", "$city"] }, count: { $sum: 1 } } },
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
    const { range = 'month', clientId } = req.query;

    // In a real app, these would come from an AI pipeline or NLP analysis of tickets and chat transcripts.
    const trendingIssues = [
      { issue: "Password Reset Failures", count: 145, trend: "+12%" },
      { issue: "Billing Integration Error", count: 89, trend: "+5%" },
      { issue: "Slow Dashboard Loading", count: 64, trend: "-2%" },
      { issue: "API Rate Limits", count: 42, trend: "+18%" }
    ];

    const mostRequestedServices = [
      { service: "Web Design", requests: 320 },
      { service: "SEO Optimization", requests: 215 },
      { service: "Custom App Dev", requests: 180 },
      { service: "CRM Setup", requests: 150 }
    ];

    const faqAnalytics = [
      { question: "How to upgrade plan?", views: 1024, helpfulness: "92%" },
      { question: "What are your support hours?", views: 845, helpfulness: "88%" },
      { question: "Do you offer refunds?", views: 612, helpfulness: "75%" },
      { question: "How to export data?", views: 530, helpfulness: "95%" }
    ];

    const ticketPrediction = [
      { category: "Technical Support", predictedVolume: 450, confidence: "89%" },
      { category: "Billing", predictedVolume: 210, confidence: "94%" },
      { category: "Sales Inquiry", predictedVolume: 320, confidence: "82%" },
      { category: "Feature Request", predictedVolume: 85, confidence: "76%" }
    ];

    res.json({
      metrics: {
        avgLeadQualityScore: 84, // out of 100
        aiResolutionRate: "34%", // Tickets closed by AI without agent
        sentimentScore: "Positive (78%)"
      },
      trendingIssues,
      mostRequestedServices,
      faqAnalytics,
      ticketPrediction
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
