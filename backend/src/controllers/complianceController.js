import { Customer } from "../models/Customer.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { checkUnattendedClientsAndEscalate } from "../services/complianceInactivityService.js";
import { generateCRN } from "../services/customerService.js";

/**
 * 1. VAT Filing Dashboard Aggregation API
 * @route GET /api/crm/compliance/vat
 */
export const getVatComplianceStats = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, month, consultantId, status, search } = req.query;

  const query = {
    serviceType: { $in: ["VAT Registration", "VAT Filing"] },
    archivedAt: null
  };

  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(String(websiteId))) {
      throw new AppError("Unauthorized access to website data", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (consultantId) {
    query.ownerId = consultantId;
  }

  if (status) {
    query.workStatus = status;
  }

  if (search) {
    query.$or = [
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { companyName: new RegExp(search, "i") },
      { trn: new RegExp(search, "i") }
    ];
  }

  // Role scoping: Tax Consultants can only see assigned clients
  if (["tax_consultant", "sales", "agent"].includes(req.user.role)) {
    query.ownerId = req.user._id;
  }

  const allVatClients = await Customer.find(query)
    .populate("ownerId", "name email role")
    .sort({ vatFilingDueDate: 1, name: 1 })
    .lean();

  const now = new Date();
  const next7Days = new Date();
  next7Days.setDate(now.getDate() + 7);
  const next30Days = new Date();
  next30Days.setDate(now.getDate() + 30);

  // Filter clients by month if month filter provided (Format YYYY-MM)
  const filteredClients = allVatClients.filter(c => {
    if (month && c.vatFilingDueDate) {
      const dateStr = new Date(c.vatFilingDueDate).toISOString().substring(0, 7);
      if (dateStr !== month) return false;
    }
    return true;
  }).map(c => {
    const dueDate = c.vatFilingDueDate ? new Date(c.vatFilingDueDate) : null;
    let daysRemaining = null;
    let overdueDays = 0;

    if (dueDate) {
      const diffMs = dueDate - now;
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0 && c.workStatus !== "Completed") {
        overdueDays = Math.abs(daysRemaining);
      }
    }

    return {
      ...c,
      daysRemaining,
      overdueDays
    };
  });

  const totalClients = filteredClients.length;
  const pending = filteredClients.filter(c => c.workStatus === "Pending" || c.workStatus === "In Progress" || c.workStatus === "Under Review").length;
  const completed = filteredClients.filter(c => c.workStatus === "Completed").length;
  const overdue = filteredClients.filter(c => c.daysRemaining !== null && c.daysRemaining < 0 && c.workStatus !== "Completed").length;

  const upcomingThisWeek = filteredClients.filter(c => {
    if (!c.vatFilingDueDate || c.workStatus === "Completed") return false;
    const d = new Date(c.vatFilingDueDate);
    return d >= now && d <= next7Days;
  }).length;

  const upcomingThisMonth = filteredClients.filter(c => {
    if (!c.vatFilingDueDate || c.workStatus === "Completed") return false;
    const d = new Date(c.vatFilingDueDate);
    return d >= now && d <= next30Days;
  }).length;

  const upcomingFilingDates = filteredClients
    .filter(c => c.vatFilingDueDate && new Date(c.vatFilingDueDate) >= now && c.workStatus !== "Completed")
    .slice(0, 10);

  res.json({
    summary: {
      totalClients,
      pending,
      completed,
      overdue,
      upcomingThisWeek,
      upcomingThisMonth,
      upcomingCount: upcomingFilingDates.length
    },
    upcomingFilingDates,
    clients: filteredClients
  });
});

/**
 * 2. Corporate Tax Dashboard Aggregation API
 * @route GET /api/crm/compliance/corporate-tax
 */
export const getCorporateTaxStats = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, consultantId, status, financialYear, search } = req.query;

  const query = {
    serviceType: { $in: ["Corporate Tax Registration", "Corporate Tax Filing"] },
    archivedAt: null
  };

  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(String(websiteId))) {
      throw new AppError("Unauthorized access to website data", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (consultantId) {
    query.ownerId = consultantId;
  }

  if (status) {
    query.workStatus = status;
  }

  if (search) {
    query.$or = [
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { companyName: new RegExp(search, "i") },
      { trn: new RegExp(search, "i") }
    ];
  }

  if (["tax_consultant", "sales", "agent"].includes(req.user.role)) {
    query.ownerId = req.user._id;
  }

  const ctClients = await Customer.find(query)
    .populate("ownerId", "name email role")
    .sort({ corporateTaxDueDate: 1, name: 1 })
    .lean();

  const now = new Date();
  const next7Days = new Date();
  next7Days.setDate(now.getDate() + 7);
  const next30Days = new Date();
  next30Days.setDate(now.getDate() + 30);

  const enrichedFilings = ctClients.map(client => {
    let daysRemaining = null;
    let overdueDays = 0;
    let isOverdue = false;

    if (client.corporateTaxDueDate) {
      const dueDate = new Date(client.corporateTaxDueDate);
      const diffTime = dueDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0 && client.workStatus !== "Completed") {
        isOverdue = true;
        overdueDays = Math.abs(daysRemaining);
      }
    }

    return {
      ...client,
      daysRemaining,
      overdueDays,
      isOverdue
    };
  });

  const totalFilings = enrichedFilings.length;
  const overdueCount = enrichedFilings.filter(f => f.isOverdue).length;
  const pendingCount = enrichedFilings.filter(f => f.workStatus === "Pending" || f.workStatus === "In Progress" || f.workStatus === "Under Review").length;
  const completedCount = enrichedFilings.filter(f => f.workStatus === "Completed").length;
  const filedCount = enrichedFilings.filter(f => f.workStatus === "Submitted" || f.workStatus === "Completed").length;

  const upcomingThisWeek = enrichedFilings.filter(f => {
    if (!f.corporateTaxDueDate || f.workStatus === "Completed") return false;
    const d = new Date(f.corporateTaxDueDate);
    return d >= now && d <= next7Days;
  }).length;

  const upcomingThisMonth = enrichedFilings.filter(f => {
    if (!f.corporateTaxDueDate || f.workStatus === "Completed") return false;
    const d = new Date(f.corporateTaxDueDate);
    return d >= now && d <= next30Days;
  }).length;

  res.json({
    summary: {
      totalFilings,
      overdueCount,
      pendingCount,
      completedCount,
      filedCount,
      upcomingThisWeek,
      upcomingThisMonth
    },
    filings: enrichedFilings
  });
});

/**
 * 3. Trade License Dashboard Aggregation API
 * @route GET /api/crm/compliance/trade-license
 */
export const getTradeLicenseStats = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, consultantId, highlight, status, search } = req.query;

  const query = {
    archivedAt: null,
    $or: [
      { serviceType: "Trade License Renewal" },
      { tradeLicenseExpiryDate: { $ne: null } },
      { tradeLicenseNumber: { $ne: "" } }
    ]
  };

  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(String(websiteId))) {
      throw new AppError("Unauthorized access to website data", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (consultantId) {
    query.ownerId = consultantId;
  }

  if (status) {
    query.workStatus = status;
  }

  if (search) {
    query.$or = [
      { name: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { companyName: new RegExp(search, "i") },
      { tradeLicenseNumber: new RegExp(search, "i") }
    ];
  }

  if (["tax_consultant", "sales", "agent"].includes(req.user.role)) {
    query.ownerId = req.user._id;
  }

  const rawClients = await Customer.find(query)
    .populate("ownerId", "name email role")
    .sort({ tradeLicenseExpiryDate: 1, name: 1 })
    .lean();

  const now = new Date();

  let darkRedCount = 0; // Expired (<0 days)
  let redCount = 0;     // <30 Days
  let orangeCount = 0;  // 30-60 Days
  let yellowCount = 0;  // 60-90 Days
  let greenCount = 0;   // >90 Days

  const licenses = rawClients.map(client => {
    let daysRemaining = null;
    let alertLevel = "green";

    if (client.tradeLicenseExpiryDate) {
      const expiryDate = new Date(client.tradeLicenseExpiryDate);
      const diffTime = expiryDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining < 0) {
        alertLevel = "dark_red";
        darkRedCount++;
      } else if (daysRemaining <= 30) {
        alertLevel = "red";
        redCount++;
      } else if (daysRemaining <= 60) {
        alertLevel = "orange";
        orangeCount++;
      } else if (daysRemaining <= 90) {
        alertLevel = "yellow";
        yellowCount++;
      } else {
        alertLevel = "green";
        greenCount++;
      }
    } else {
      greenCount++;
    }

    return {
      ...client,
      daysRemaining,
      alertLevel
    };
  });

  const filteredLicenses = highlight
    ? licenses.filter(l => l.alertLevel === highlight)
    : licenses;

  const totalLicenses = licenses.length;
  const activeCount = licenses.filter(l => l.alertLevel === "green" || l.workStatus === "Completed").length;
  const renewalPendingCount = licenses.filter(l => l.alertLevel !== "green" && l.workStatus !== "Completed").length;
  const renewedCount = licenses.filter(l => l.workStatus === "Completed").length;
  const expiredCount = darkRedCount;
  const expiringIn90Days = yellowCount + orangeCount + redCount;
  const expiringIn60Days = orangeCount + redCount;
  const expiringIn30Days = redCount;

  res.json({
    summary: {
      totalLicenses,
      activeCount,
      renewalPendingCount,
      renewedCount,
      expiredCount,
      expiringIn90Days,
      expiringIn60Days,
      expiringIn30Days,
      darkRedCount,
      redCount,
      orangeCount,
      yellowCount,
      greenCount
    },
    licenses: filteredLicenses
  });
});

/**
 * 4. Manual Inactivity Escalation Check Trigger API
 * @route POST /api/crm/compliance/trigger-inactivity-check
 */
export const triggerInactivityCheck = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { websiteId } = req.body;
  const result = await checkUnattendedClientsAndEscalate({ websiteId });
  res.json(result);
});

/**
 * 5. Inactivity Escalation History Log API
 * @route GET /api/crm/compliance/inactivity-logs
 */
export const getInactivityLogs = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  const query = {
    websiteId: websiteId ? websiteId : { $in: ownedWebsiteIds },
    lastEscalationLevel: { $gt: 0 }
  };

  const escalatedClients = await Customer.find(query)
    .populate("ownerId", "name email role")
    .select("name companyName email trn serviceType workStatus lastFollowUpActivityAt lastEscalationLevel lastEscalatedAt inactivityReminderHistory")
    .sort({ lastEscalatedAt: -1 })
    .lean();

  res.json({
    count: escalatedClients.length,
    escalatedClients
  });
});

/**
 * 6. Unified Executive Compliance Overview API
 * @route GET /api/crm/compliance/overview
 */
export const getUnifiedComplianceOverview = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, consultantId } = req.query;

  const query = { archivedAt: null };
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(String(websiteId))) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (consultantId) query.ownerId = consultantId;
  if (["tax_consultant", "sales", "agent"].includes(req.user.role)) query.ownerId = req.user._id;

  const customers = await Customer.find(query)
    .populate("ownerId", "name email role")
    .lean();

  const now = new Date();
  const next7Days = new Date();
  next7Days.setDate(now.getDate() + 7);
  const next30Days = new Date();
  next30Days.setDate(now.getDate() + 30);

  let totalClients = customers.length;
  let activeServicesCount = 0;

  let vatPending = 0, vatCompleted = 0, vatOverdue = 0, vatUpcomingWeek = 0, vatUpcomingMonth = 0;
  let ctPending = 0, ctFiled = 0, ctCompleted = 0, ctOverdue = 0, ctUpcomingWeek = 0, ctUpcomingMonth = 0;
  let tlActive = 0, tlRenewalPending = 0, tlExpiring90 = 0, tlExpiring60 = 0, tlExpiring30 = 0, tlExpired = 0;

  const upcomingDeadlines = [];
  const overdueList = [];

  customers.forEach(c => {
    activeServicesCount += (c.services ? c.services.length : 0);

    // VAT metrics
    if (c.serviceType === "VAT Registration" || c.serviceType === "VAT Filing") {
      if (c.workStatus === "Completed") vatCompleted++;
      else {
        vatPending++;
        if (c.vatFilingDueDate && new Date(c.vatFilingDueDate) < now) vatOverdue++;
      }
      if (c.vatFilingDueDate) {
        const vd = new Date(c.vatFilingDueDate);
        if (vd >= now && vd <= next7Days) vatUpcomingWeek++;
        if (vd >= now && vd <= next30Days) vatUpcomingMonth++;
      }
    }

    // CT metrics
    if (c.serviceType === "Corporate Tax Registration" || c.serviceType === "Corporate Tax Filing") {
      if (c.workStatus === "Completed") ctCompleted++;
      else if (c.workStatus === "Submitted") ctFiled++;
      else {
        ctPending++;
        if (c.corporateTaxDueDate && new Date(c.corporateTaxDueDate) < now) ctOverdue++;
      }
      if (c.corporateTaxDueDate) {
        const cd = new Date(c.corporateTaxDueDate);
        if (cd >= now && cd <= next7Days) ctUpcomingWeek++;
        if (cd >= now && cd <= next30Days) ctUpcomingMonth++;
      }
    }

    // Trade License metrics
    if (c.tradeLicenseExpiryDate) {
      const exp = new Date(c.tradeLicenseExpiryDate);
      const diffMs = exp - now;
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (days < 0) tlExpired++;
      else if (days <= 30) tlExpiring30++;
      else if (days <= 60) tlExpiring60++;
      else if (days <= 90) tlExpiring90++;
      else tlActive++;

      if (days < 0 && c.workStatus !== "Completed") {
        overdueList.push({
          _id: c._id,
          name: c.name,
          companyName: c.companyName,
          complianceType: "Trade License Renewal",
          dueDate: c.tradeLicenseExpiryDate,
          daysOverdue: Math.abs(days),
          consultant: c.ownerId?.name || "Unassigned"
        });
      }
    }

    // Collect general upcoming deadlines
    const targetDueDate = c.vatFilingDueDate || c.corporateTaxDueDate || c.tradeLicenseExpiryDate;
    if (targetDueDate && new Date(targetDueDate) >= now && c.workStatus !== "Completed") {
      const d = new Date(targetDueDate);
      const daysLeft = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      upcomingDeadlines.push({
        _id: c._id,
        name: c.name,
        companyName: c.companyName,
        complianceType: c.serviceType || "Compliance Service",
        dueDate: targetDueDate,
        daysRemaining: daysLeft,
        consultant: c.ownerId?.name || "Unassigned"
      });
    }
  });

  res.json({
    kpis: {
      totalClients,
      activeServicesCount,
      vatPending,
      vatCompleted,
      ctPending,
      ctCompleted,
      tradeLicensesExpiring: tlExpiring30 + tlExpiring60 + tlExpiring90,
      overdueCompliance: vatOverdue + ctOverdue + tlExpired
    },
    vatSummary: { pending: vatPending, completed: vatCompleted, overdue: vatOverdue, upcomingThisWeek: vatUpcomingWeek, upcomingThisMonth: vatUpcomingMonth },
    corporateTaxSummary: { pending: ctPending, filed: ctFiled, completed: ctCompleted, overdue: ctOverdue, upcomingThisWeek: ctUpcomingWeek, upcomingThisMonth: ctUpcomingMonth },
    tradeLicenseSummary: { active: tlActive, renewalPending: tlExpiring30 + tlExpiring60 + tlExpiring90, expiringIn90Days: tlExpiring90, expiringIn60Days: tlExpiring60, expiringIn30Days: tlExpiring30, expired: tlExpired },
    upcomingDeadlines: upcomingDeadlines.slice(0, 10),
    overdueList: overdueList.slice(0, 10)
  });
});

/**
 * 6. Enterprise Compliance Reports Data API
 * Supports: client_list, vat_status, corporate_tax, trade_license, consultant_performance, overdue_clients, payment_status
 * Filters: startDate, endDate, consultantId, serviceType
 * @route GET /api/crm/compliance/reports/data
 */
export const getComplianceReportData = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const {
    websiteId,
    reportType = "client_list",
    startDate,
    endDate,
    consultantId,
    serviceType
  } = req.query;

  const query = { archivedAt: null };

  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(String(websiteId))) {
      throw new AppError("Unauthorized access to website data", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (consultantId) query.ownerId = consultantId;
  if (serviceType) query.serviceType = serviceType;

  if (["tax_consultant", "sales", "agent"].includes(req.user.role)) {
    query.ownerId = req.user._id;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const now = new Date();
  let reportTitle = "Enterprise Compliance Report";
  let columns = [];
  let rows = [];

  if (reportType === "client_list") {
    reportTitle = "Master Client Compliance Directory";
    columns = ["Company Name", "Contact Person", "Email", "Phone", "TRN", "Trade License No", "Service Type", "Work Status", "Payment Status", "Consultant"];
    const clients = await Customer.find(query).populate("ownerId", "name").sort({ name: 1 }).lean();
    rows = clients.map(c => ({
      "Company Name": c.companyName || c.name,
      "Contact Person": c.name,
      "Email": c.email || "-",
      "Phone": c.phone || "-",
      "TRN": c.trn || "Not Registered",
      "Trade License No": c.tradeLicenseNumber || "N/A",
      "Service Type": c.serviceType || "N/A",
      "Work Status": c.workStatus || "Pending",
      "Payment Status": c.paymentStatus || "Pending",
      "Consultant": c.ownerId?.name || "Unassigned"
    }));
  } else if (reportType === "vat_status") {
    reportTitle = "VAT Filing Status & Schedule Report";
    query.serviceType = { $in: ["VAT Registration", "VAT Filing"] };
    columns = ["Company Name", "TRN", "Service Type", "VAT Filing Period", "VAT Due Date", "Work Status", "Payment Status", "Consultant"];
    const clients = await Customer.find(query).populate("ownerId", "name").sort({ vatFilingDueDate: 1 }).lean();
    rows = clients.map(c => ({
      "Company Name": c.companyName || c.name,
      "TRN": c.trn || "Not Registered",
      "Service Type": c.serviceType,
      "VAT Filing Period": c.vatFilingPeriod || "Current",
      "VAT Due Date": c.vatFilingDueDate ? new Date(c.vatFilingDueDate).toLocaleDateString() : "TBA",
      "Work Status": c.workStatus || "Pending",
      "Payment Status": c.paymentStatus || "Pending",
      "Consultant": c.ownerId?.name || "Unassigned"
    }));
  } else if (reportType === "corporate_tax") {
    reportTitle = "Corporate Tax Filing & Deadline Countdown Report";
    query.serviceType = { $in: ["Corporate Tax Registration", "Corporate Tax Filing"] };
    columns = ["Company Name", "TRN", "Service Type", "CT Due Date", "Days Remaining", "Work Status", "Payment Status", "Consultant"];
    const clients = await Customer.find(query).populate("ownerId", "name").sort({ corporateTaxDueDate: 1 }).lean();
    rows = clients.map(c => {
      let days = "N/A";
      if (c.corporateTaxDueDate) {
        days = Math.ceil((new Date(c.corporateTaxDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
      return {
        "Company Name": c.companyName || c.name,
        "TRN": c.trn || "Not Registered",
        "Service Type": c.serviceType,
        "CT Due Date": c.corporateTaxDueDate ? new Date(c.corporateTaxDueDate).toLocaleDateString() : "TBA",
        "Days Remaining": days,
        "Work Status": c.workStatus || "Pending",
        "Payment Status": c.paymentStatus || "Pending",
        "Consultant": c.ownerId?.name || "Unassigned"
      };
    });
  } else if (reportType === "trade_license") {
    reportTitle = "Trade License Expiry & Renewal Status Report";
    columns = ["Company Name", "Trade License No", "Expiry Date", "Days Remaining", "Highlight Bucket", "Work Status", "Consultant"];
    const clients = await Customer.find(query).populate("ownerId", "name").sort({ tradeLicenseExpiryDate: 1 }).lean();
    rows = clients.map(c => {
      let days = "N/A";
      let bucket = "Active (>60 Days)";
      if (c.tradeLicenseExpiryDate) {
        const diff = Math.ceil((new Date(c.tradeLicenseExpiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        days = diff;
        if (diff < 0) bucket = "Red (Expired)";
        else if (diff <= 30) bucket = "Orange (<30 Days)";
        else if (diff <= 60) bucket = "Yellow (<60 Days)";
      }
      return {
        "Company Name": c.companyName || c.name,
        "Trade License No": c.tradeLicenseNumber || "N/A",
        "Expiry Date": c.tradeLicenseExpiryDate ? new Date(c.tradeLicenseExpiryDate).toLocaleDateString() : "N/A",
        "Days Remaining": days,
        "Highlight Bucket": bucket,
        "Work Status": c.workStatus || "Pending",
        "Consultant": c.ownerId?.name || "Unassigned"
      };
    });
  } else if (reportType === "consultant_performance") {
    reportTitle = "Consultant Performance & Workload Matrix Report";
    const consultants = await Customer.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$ownerId",
          totalClients: { $sum: 1 },
          completedWork: { $sum: { $cond: [{ $eq: ["$workStatus", "Completed"] }, 1, 0] } },
          pendingWork: { $sum: { $cond: [{ $in: ["$workStatus", ["Pending", "In Progress"]] }, 1, 0] } },
          paidFees: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0] } },
          overdueEscalations: { $sum: { $cond: [{ $gt: ["$lastEscalationLevel", 0] }, 1, 0] } }
        }
      }
    ]);

    columns = ["Consultant Name", "Total Assigned Clients", "Completed Work", "Pending Work", "Paid Accounts", "Overdue Escalations"];
    for (const item of consultants) {
      let consultantName = "Unassigned";
      if (item._id) {
        const u = await User.findById(item._id).select("name");
        if (u) consultantName = u.name;
      }
      rows.push({
        "Consultant Name": consultantName,
        "Total Assigned Clients": item.totalClients,
        "Completed Work": item.completedWork,
        "Pending Work": item.pendingWork,
        "Paid Accounts": item.paidFees,
        "Overdue Escalations": item.overdueEscalations
      });
    }
  } else if (reportType === "overdue_clients") {
    reportTitle = "Overdue & Unattended Compliance Clients Audit Report";
    query.$or = [
      { vatFilingDueDate: { $lt: now }, workStatus: { $ne: "Completed" } },
      { corporateTaxDueDate: { $lt: now }, workStatus: { $ne: "Completed" } },
      { tradeLicenseExpiryDate: { $lt: now } },
      { lastEscalationLevel: { $gt: 0 } }
    ];
    columns = ["Company Name", "TRN / License No", "Service Type", "Escalation Tier", "Work Status", "Last Activity Date", "Consultant"];
    const clients = await Customer.find(query).populate("ownerId", "name").sort({ lastFollowUpActivityAt: 1 }).lean();
    rows = clients.map(c => ({
      "Company Name": c.companyName || c.name,
      "TRN / License No": c.trn || c.tradeLicenseNumber || "N/A",
      "Service Type": c.serviceType,
      "Escalation Tier": c.lastEscalationLevel ? `Level ${c.lastEscalationLevel}` : "Overdue Deadline",
      "Work Status": c.workStatus || "Pending",
      "Last Activity Date": c.lastFollowUpActivityAt ? new Date(c.lastFollowUpActivityAt).toLocaleDateString() : "Never",
      "Consultant": c.ownerId?.name || "Unassigned"
    }));
  } else if (reportType === "payment_status") {
    reportTitle = "Client Service Fee & Payment Status Summary Report";
    columns = ["Company Name", "Service Type", "Payment Status", "Estimated Value", "Budget", "Work Status", "Consultant"];
    const clients = await Customer.find(query).populate("ownerId", "name").sort({ paymentStatus: 1 }).lean();
    rows = clients.map(c => ({
      "Company Name": c.companyName || c.name,
      "Service Type": c.serviceType,
      "Payment Status": c.paymentStatus || "Pending",
      "Estimated Value": c.leadValue || 0,
      "Budget": c.budget || 0,
      "Work Status": c.workStatus || "Pending",
      "Consultant": c.ownerId?.name || "Unassigned"
    }));
  }

  res.json({
    reportTitle,
    generatedAt: now.toISOString(),
    reportType,
    totalRecords: rows.length,
    columns,
    rows
  });
});

/**
 * 7. Enterprise Calendar Events Aggregation API
 * @route GET /api/crm/compliance/calendar
 */
export const getCalendarEvents = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, consultantId, startDate, endDate } = req.query;

  const query = { archivedAt: null };
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(String(websiteId))) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (consultantId) query.ownerId = consultantId;
  if (req.user.role === "tax_consultant") query.ownerId = req.user._id;

  const customers = await Customer.find(query)
    .populate("ownerId", "name email role")
    .lean();

  const events = [];
  const now = new Date();

  customers.forEach(c => {
    // VAT Filing Due
    if (c.vatFilingDueDate) {
      const d = new Date(c.vatFilingDueDate);
      const isOverdue = d < now && c.workStatus !== "Completed";
      events.push({
        id: `vat_${c._id}`,
        title: `VAT Filing Due: ${c.companyName || c.name}`,
        customerName: c.name,
        companyName: c.companyName,
        type: "VAT Filing",
        date: c.vatFilingDueDate,
        consultant: c.ownerId?.name || "Unassigned",
        status: c.workStatus || "Pending",
        color: c.workStatus === "Completed" ? "green" : isOverdue ? "red" : "orange",
        link: `/crm?highlight=${c._id}`
      });
    }

    // Corporate Tax Due
    if (c.corporateTaxDueDate) {
      const d = new Date(c.corporateTaxDueDate);
      const isOverdue = d < now && c.workStatus !== "Completed";
      events.push({
        id: `ct_${c._id}`,
        title: `Corporate Tax Return: ${c.companyName || c.name}`,
        customerName: c.name,
        companyName: c.companyName,
        type: "Corporate Tax",
        date: c.corporateTaxDueDate,
        consultant: c.ownerId?.name || "Unassigned",
        status: c.workStatus || "Pending",
        color: c.workStatus === "Completed" ? "green" : isOverdue ? "red" : "orange",
        link: `/crm?highlight=${c._id}`
      });
    }

    // Trade License Expiry
    if (c.tradeLicenseExpiryDate) {
      const d = new Date(c.tradeLicenseExpiryDate);
      const isOverdue = d < now && c.workStatus !== "Completed";
      events.push({
        id: `tl_${c._id}`,
        title: `Trade License Expiry: ${c.companyName || c.name}`,
        customerName: c.name,
        companyName: c.companyName,
        type: "Trade License Renewal",
        date: c.tradeLicenseExpiryDate,
        consultant: c.ownerId?.name || "Unassigned",
        status: c.workStatus || "Pending",
        color: c.workStatus === "Completed" ? "green" : isOverdue ? "red" : "yellow",
        link: `/crm?highlight=${c._id}`
      });
    }
  });

  res.json({
    totalEvents: events.length,
    events
  });
});

/**
 * Create VAT Compliance Record
 * @route POST /api/crm/compliance/vat
 */
export const createVatComplianceRecord = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const {
    name,
    companyName,
    email,
    trn,
    serviceType = "VAT Filing",
    vatFilingPeriod,
    vatFilingDueDate,
    workStatus = "Pending",
    ownerId,
    websiteId
  } = req.body;

  if (!name && !companyName) {
    throw new AppError("Client Name or Company Name is required", 400);
  }

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const targetWebsiteId = websiteId || ownedWebsiteIds[0];

  const crn = await generateCRN();
  const customer = await Customer.create({
    crn,
    name: name || companyName,
    companyName: companyName || name,
    email: email || "",
    trn: trn || "",
    serviceType: serviceType || "VAT Filing",
    vatFilingPeriod: vatFilingPeriod || "Q1 2026",
    vatFilingDueDate: vatFilingDueDate ? new Date(vatFilingDueDate) : null,
    workStatus: workStatus || "Pending",
    ownerId: ownerId || req.user._id,
    websiteId: targetWebsiteId,
    recordType: "customer"
  });

  return res.status(201).json(customer);
});

/**
 * Update VAT Compliance Record
 * @route PATCH /api/crm/compliance/vat/:id
 */
export const updateVatComplianceRecord = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { id } = req.params;
  const {
    name,
    companyName,
    email,
    trn,
    serviceType,
    vatFilingPeriod,
    vatFilingDueDate,
    workStatus,
    ownerId
  } = req.body;

  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError("VAT Compliance record not found", 404);
  }

  if (name !== undefined) customer.name = name;
  if (companyName !== undefined) customer.companyName = companyName;
  if (email !== undefined) customer.email = email;
  if (trn !== undefined) customer.trn = trn;
  if (serviceType !== undefined) customer.serviceType = serviceType;
  if (vatFilingPeriod !== undefined) customer.vatFilingPeriod = vatFilingPeriod;
  if (vatFilingDueDate !== undefined) customer.vatFilingDueDate = vatFilingDueDate ? new Date(vatFilingDueDate) : null;
  if (workStatus !== undefined) customer.workStatus = workStatus;
  if (ownerId !== undefined) customer.ownerId = ownerId || null;

  await customer.save();
  return res.json(customer);
});

/**
 * Delete VAT Compliance Record
 * @route DELETE /api/crm/compliance/vat/:id
 */
export const deleteVatComplianceRecord = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const { id } = req.params;

  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError("VAT Compliance record not found", 404);
  }

  customer.archivedAt = new Date();
  await customer.save();

  return res.json({ message: "VAT Compliance record deleted successfully" });
});

/**
 * Create Corporate Tax Compliance Record
 * @route POST /api/crm/compliance/corporate-tax
 */
export const createCorporateTaxRecord = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const {
    name,
    companyName,
    email,
    trn,
    serviceType = "Corporate Tax Filing",
    corporateTaxPeriod,
    corporateTaxDueDate,
    financialYear,
    workStatus = "Pending",
    ownerId,
    websiteId
  } = req.body;

  if (!name && !companyName) {
    throw new AppError("Client Name or Company Name is required", 400);
  }

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const targetWebsiteId = websiteId || ownedWebsiteIds[0];

  const crn = await generateCRN();
  const customer = await Customer.create({
    crn,
    name: name || companyName,
    companyName: companyName || name,
    email: email || "",
    trn: trn || "",
    serviceType: serviceType || "Corporate Tax Filing",
    corporateTaxPeriod: corporateTaxPeriod || "FY 2025-2026",
    corporateTaxDueDate: corporateTaxDueDate ? new Date(corporateTaxDueDate) : null,
    financialYear: financialYear || "2025-2026",
    workStatus: workStatus || "Pending",
    ownerId: ownerId || req.user._id,
    websiteId: targetWebsiteId,
    recordType: "customer"
  });

  return res.status(201).json(customer);
});

/**
 * Update Corporate Tax Compliance Record
 * @route PATCH /api/crm/compliance/corporate-tax/:id
 */
export const updateCorporateTaxRecord = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { id } = req.params;
  const {
    name,
    companyName,
    email,
    trn,
    serviceType,
    corporateTaxPeriod,
    corporateTaxDueDate,
    financialYear,
    workStatus,
    ownerId
  } = req.body;

  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError("Corporate Tax record not found", 404);
  }

  if (name !== undefined) customer.name = name;
  if (companyName !== undefined) customer.companyName = companyName;
  if (email !== undefined) customer.email = email;
  if (trn !== undefined) customer.trn = trn;
  if (serviceType !== undefined) customer.serviceType = serviceType;
  if (corporateTaxPeriod !== undefined) customer.corporateTaxPeriod = corporateTaxPeriod;
  if (corporateTaxDueDate !== undefined) customer.corporateTaxDueDate = corporateTaxDueDate ? new Date(corporateTaxDueDate) : null;
  if (financialYear !== undefined) customer.financialYear = financialYear;
  if (workStatus !== undefined) customer.workStatus = workStatus;
  if (ownerId !== undefined) customer.ownerId = ownerId || null;

  await customer.save();
  return res.json(customer);
});

/**
 * Delete Corporate Tax Compliance Record
 * @route DELETE /api/crm/compliance/corporate-tax/:id
 */
export const deleteCorporateTaxRecord = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const { id } = req.params;

  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError("Corporate Tax record not found", 404);
  }

  customer.archivedAt = new Date();
  await customer.save();

  return res.json({ message: "Corporate Tax record deleted successfully" });
});

/**
 * Create Trade License Compliance Record
 * @route POST /api/crm/compliance/trade-license
 */
export const createTradeLicenseRecord = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const {
    name,
    companyName,
    email,
    tradeLicenseNumber,
    issuingAuthority,
    tradeLicenseExpiryDate,
    serviceType = "Trade License Renewal",
    workStatus = "Pending",
    ownerId,
    websiteId
  } = req.body;

  if (!name && !companyName) {
    throw new AppError("Client Name or Company Name is required", 400);
  }

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const targetWebsiteId = websiteId || ownedWebsiteIds[0];

  const crn = await generateCRN();
  const customer = await Customer.create({
    crn,
    name: name || companyName,
    companyName: companyName || name,
    email: email || "",
    tradeLicenseNumber: tradeLicenseNumber || "",
    issuingAuthority: issuingAuthority || "DET Dubai",
    serviceType: serviceType || "Trade License Renewal",
    tradeLicenseExpiryDate: tradeLicenseExpiryDate ? new Date(tradeLicenseExpiryDate) : null,
    workStatus: workStatus || "Pending",
    ownerId: ownerId || req.user._id,
    websiteId: targetWebsiteId,
    recordType: "customer"
  });

  return res.status(201).json(customer);
});

/**
 * Update Trade License Compliance Record
 * @route PATCH /api/crm/compliance/trade-license/:id
 */
export const updateTradeLicenseRecord = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { id } = req.params;
  const {
    name,
    companyName,
    email,
    tradeLicenseNumber,
    issuingAuthority,
    tradeLicenseExpiryDate,
    serviceType,
    workStatus,
    ownerId
  } = req.body;

  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError("Trade License record not found", 404);
  }

  if (name !== undefined) customer.name = name;
  if (companyName !== undefined) customer.companyName = companyName;
  if (email !== undefined) customer.email = email;
  if (tradeLicenseNumber !== undefined) customer.tradeLicenseNumber = tradeLicenseNumber;
  if (issuingAuthority !== undefined) customer.issuingAuthority = issuingAuthority;
  if (serviceType !== undefined) customer.serviceType = serviceType;
  if (tradeLicenseExpiryDate !== undefined) customer.tradeLicenseExpiryDate = tradeLicenseExpiryDate ? new Date(tradeLicenseExpiryDate) : null;
  if (workStatus !== undefined) customer.workStatus = workStatus;
  if (ownerId !== undefined) customer.ownerId = ownerId || null;

  await customer.save();
  return res.json(customer);
});

/**
 * Delete Trade License Compliance Record
 * @route DELETE /api/crm/compliance/trade-license/:id
 */
export const deleteTradeLicenseRecord = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const { id } = req.params;

  const customer = await Customer.findById(id);
  if (!customer) {
    throw new AppError("Trade License record not found", 404);
  }

  customer.archivedAt = new Date();
  await customer.save();

  return res.json({ message: "Trade License record deleted successfully" });
});
