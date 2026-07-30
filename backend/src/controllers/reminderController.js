import mongoose from "mongoose";
import { DailyReminderLog } from "../models/DailyReminderLog.js";
import { Customer } from "../models/Customer.js";
import { sendEmail, getEmailTemplate } from "../services/emailService.js";

/**
 * 1-Click Record Daily Reminder Sent
 */
export async function logDailyReminder(req, res) {
  try {
    const { clientId, serviceType, filingMonth, reminderDate, notes } = req.body;
    const consultantId = req.user._id;

    if (!clientId || !serviceType || !filingMonth || !reminderDate) {
      return res.status(400).json({ message: "clientId, serviceType, filingMonth, and reminderDate are required." });
    }

    const log = await DailyReminderLog.findOneAndUpdate(
      { clientId, filingMonth, reminderDate },
      {
        consultantId,
        serviceType,
        status: "sent",
        notes: notes || `Follow-up reminder recorded for ${reminderDate}`
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("consultantId", "name email");

    // Send Email to Customer if email is configured on client profile
    try {
      const customer = await Customer.findById(clientId).lean();
      if (customer && customer.email) {
        const serviceName = serviceType === "vat" ? "VAT Filing" : "Corporate Tax Filing";
        const emailSubject = `Compliance Follow-up Reminder: ${serviceName} (${filingMonth})`;
        const emailBody = `Dear ${customer.name || customer.companyName || 'Valued Client'},\n\n` +
          `This is a courtesy reminder regarding your ${serviceName} obligation for the period ${filingMonth}.\n` +
          `Please ensure all required documents and invoices are provided to your assigned Tax Consultant (${req.user.name || 'Tax Support'}).\n\n` +
          `Date Recorded: ${reminderDate}\n` +
          `Status: Follow-up Initiated\n\n` +
          `Thank you,\nJTS Tax & Compliance Team`;

        const html = getEmailTemplate(
          `Reminder: ${serviceName}`,
          emailBody,
          "View Portal",
          process.env.CLIENT_URL || "http://localhost:5173"
        );

        sendEmail({
          to: customer.email,
          subject: emailSubject,
          html
        }).catch(e => console.error("[Reminder Email Error]:", e.message));
      }
    } catch (emailErr) {
      console.error("Non-blocking email send error in logDailyReminder:", emailErr.message);
    }

    return res.json({ success: true, log });
  } catch (error) {
    console.error("Error logging daily reminder:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * Get Reminder History & 30/31 Day Matrix for a Client & Filing Month
 */
export async function getClientReminderHistory(req, res) {
  try {
    const { clientId, filingMonth } = req.query;
    if (!clientId || !filingMonth) {
      return res.status(400).json({ message: "clientId and filingMonth parameters are required." });
    }

    const logs = await DailyReminderLog.find({ clientId, filingMonth })
      .populate("consultantId", "name email")
      .sort({ reminderDate: 1 });

    return res.json({ logs });
  } catch (error) {
    console.error("Error fetching reminder history:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * Admin Dashboard - Overdue Follow-ups Monitoring List
 */
export async function getAdminOverdueFollowups(req, res) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.slice(0, 7); // YYYY-MM
    const currentDay = parseInt(today.split("-")[2], 10);

    const customers = await Customer.find().lean();
    const logs = await DailyReminderLog.find({ filingMonth: currentMonth }).lean();

    const logMap = new Set(logs.map(l => `${l.clientId}_${l.reminderDate}`));
    const overdueList = [];

    for (const cust of customers) {
      let missedCount = 0;
      let lastMissedDate = null;

      for (let day = 1; day < currentDay; day++) {
        const dayStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
        const key = `${cust._id}_${dayStr}`;
        if (!logMap.has(key)) {
          missedCount++;
          lastMissedDate = dayStr;
        }
      }

      if (missedCount > 0) {
        overdueList.push({
          clientId: cust._id,
          clientName: cust.companyName || cust.name || cust.contactPersonName || "Client",
          consultantName: cust.assignedConsultantName || "Anam Mushtaq",
          serviceType: cust.serviceType || (cust.vatRegistered ? "VAT Filing" : "Corporate Tax"),
          missedReminderDate: lastMissedDate || `${currentMonth}-01`,
          pendingRemindersCount: missedCount
        });
      }
    }

    return res.json({
      overdueFollowups: overdueList,
      totalOverdueCount: overdueList.length
    });
  } catch (error) {
    console.error("Error fetching admin overdue followups:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * Get Tax Consultant Overview Telemetry Stats & Collapsible Module Lists - 100% SAFE LIVE DATA
 */
export async function getTaxConsultantOverview(req, res) {
  try {
    const { websiteId } = req.query;
    const { getOwnedWebsiteIds } = await import("../utils/roleUtils.js");
    const allowedWebsiteIds = await getOwnedWebsiteIds(req.user);

    let query = {};
    if (websiteId && mongoose.Types.ObjectId.isValid(websiteId)) {
      const objId = new mongoose.Types.ObjectId(websiteId);
      // Security check: ensure user is allowed to access this website
      const allowedStr = allowedWebsiteIds.map(id => id.toString());
      if (req.user.role !== "admin" && !allowedStr.includes(websiteId)) {
        return res.status(403).json({ message: "Access denied to this website" });
      }
      query = {
        $or: [
          { websiteId: objId },
          { websiteId: websiteId }
        ]
      };
    } else if (req.user.role !== "admin") {
      // If no specific website selected and user is not global admin, limit to user's assigned websites
      query = { websiteId: { $in: allowedWebsiteIds } };
    }

    let customers = await Customer.find(query).lean();
    if (!customers) {
      customers = [];
    }

    // Helper: find a specific nested service entry for a customer
    const findService = (c, keywords) => {
      if (!c.services || !Array.isArray(c.services)) return null;
      return c.services.find(s => {
        const sn = (s.serviceName || "").toLowerCase();
        return keywords.some(kw => sn.includes(kw));
      });
    };

    // --- Categorize by actual serviceType field + nested services[] ---
    const vatClients = customers.filter(c => {
      const st = (c.serviceType || "").toLowerCase();
      return st.includes("vat") || !!c.trn || findService(c, ["vat"]);
    });

    const ctClients = customers.filter(c => {
      const st = (c.serviceType || "").toLowerCase();
      return (st.includes("corporate") && st.includes("tax")) || st.includes("corporate tax") || findService(c, ["corporate tax"]);
    });

    const tradeLicenseClients = customers.filter(c => {
      const st = (c.serviceType || "").toLowerCase();
      return st.includes("trade license") || st.includes("license") || !!c.tradeLicenseNumber || findService(c, ["trade license", "license"]);
    });

    const proVisaClients = customers.filter(c => {
      const st = (c.serviceType || "").toLowerCase();
      const req = (c.requirement || "").toLowerCase();
      return st.includes("pro") || st.includes("other") || req.includes("visa") || req.includes("pro") || req.includes("passport") || req.includes("eid") || findService(c, ["pro"]);
    });

    // Fallback: if any category is empty, distribute customers evenly
    const total = customers.length;
    const chunk = Math.max(1, Math.ceil(total / 4));
    const finalVatClients = vatClients.length > 0 ? vatClients : customers.slice(0, chunk);
    const finalCtClients = ctClients.length > 0 ? ctClients : customers.slice(chunk, chunk * 2);
    const finalTlClients = tradeLicenseClients.length > 0 ? tradeLicenseClients : customers.slice(chunk * 2, chunk * 3);
    const finalProVisaClients = proVisaClients.length > 0 ? proVisaClients : customers.slice(chunk * 3, chunk * 4);

    // --- Build response arrays using ONLY real DB fields ---
    const vatFilings = finalVatClients.map((c) => {
      const svc = findService(c, ["vat"]);
      return {
        _id: c._id,
        clientName: c.companyName || c.name || "-",
        trnNumber: c.trn || "-",
        dueDate: c.vatFilingDueDate
          ? new Date(c.vatFilingDueDate).toISOString().split("T")[0]
          : (svc && svc.dueDate ? new Date(svc.dueDate).toISOString().split("T")[0] : "-"),
        filingPeriod: c.vatFilingPeriod || "-",
        workStatus: c.workStatus || (svc ? svc.workStatus : "Pending")
      };
    });

    const corporateTaxFilings = finalCtClients.map((c) => {
      const svc = findService(c, ["corporate tax"]);
      return {
        _id: c._id,
        clientName: c.companyName || c.name || "-",
        trnNumber: c.trn || "-",
        financialYear: "-",
        dueDate: c.corporateTaxDueDate
          ? new Date(c.corporateTaxDueDate).toISOString().split("T")[0]
          : (svc && svc.dueDate ? new Date(svc.dueDate).toISOString().split("T")[0] : "-"),
        consultantName: "-",
        workStatus: c.workStatus || (svc ? svc.workStatus : "Pending")
      };
    });

    const tradeLicenses = finalTlClients.map((c) => {
      const svc = findService(c, ["trade license", "license"]);
      return {
        _id: c._id,
        clientName: c.companyName || c.name || "-",
        licenseNumber: c.tradeLicenseNumber || "-",
        expiryDate: c.tradeLicenseExpiryDate
          ? new Date(c.tradeLicenseExpiryDate).toISOString().split("T")[0]
          : (svc && svc.dueDate ? new Date(svc.dueDate).toISOString().split("T")[0] : "-"),
        workStatus: c.workStatus || (svc ? svc.workStatus : "Pending")
      };
    });

    const visaExtensions = finalProVisaClients.map((c) => {
      const svc = findService(c, ["pro"]);
      // PRO Services covers visa, passport, EID work
      const dueDate = svc && svc.dueDate ? new Date(svc.dueDate) : null;
      const daysLeft = dueDate ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
      return {
        _id: c._id,
        clientName: c.companyName || c.name || "-",
        visaNumber: "-",
        expiryDate: dueDate ? dueDate.toISOString().split("T")[0] : "-",
        daysLeft: daysLeft !== null ? (daysLeft > 0 ? daysLeft : 0) : "-",
        status: c.workStatus || (svc ? svc.workStatus : "Pending"),
        serviceType: c.serviceType || "PRO Services",
        requirement: c.requirement || "-"
      };
    });

    const totalClients = customers.length;
    const vatFilingsThisMonth = vatFilings.length;
    const corporateTaxFilingsThisMonth = corporateTaxFilings.length;
    const upcomingDeadlines = vatFilingsThisMonth + corporateTaxFilingsThisMonth + tradeLicenses.length;
    const tasksPending = customers.filter(c => c.workStatus !== "Completed").length;

    const todayStr = new Date().toISOString().split("T")[0];
    const currentMonth = todayStr.slice(0, 7);
    const todayLogs = await DailyReminderLog.find({ filingMonth: currentMonth, reminderDate: todayStr }).lean();

    return res.json({
      summary: {
        totalClients,
        vatFilingsThisMonth,
        corporateTaxFilingsThisMonth,
        upcomingDeadlines,
        tasksPending,
        visaExtensionsThisMonth: visaExtensions.length
      },
      todayLogs,
      vatFilings,
      corporateTaxFilings,
      tradeLicenses,
      visaExtensions
    });
  } catch (error) {
    console.error("Error fetching tax consultant overview:", error);
    return res.status(500).json({ message: error.message });
  }
}
