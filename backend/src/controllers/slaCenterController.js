import { SlaPolicy } from "../models/SlaPolicy.js";
import { Customer } from "../models/Customer.js";
import { Ticket } from "../models/Ticket.js";
import { Feedback } from "../models/Feedback.js";
import { User } from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { logAuditEvent } from "../services/auditService.js";
import { computeElapsedSlaHours } from "../utils/slaTimeUtils.js";

export const getSlaOverview = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  const filter = { websiteId: { $in: ownedWebsiteIds } };
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access to website SLA metrics", 403);
    }
    filter.websiteId = websiteId;
  }

  // Fetch active customers, tickets, SLA policies, and CSAT feedback for real SLA/SLO metrics
  const [customers, tickets, policies, csatFeedbacks] = await Promise.all([
    Customer.find({ ...filter, archivedAt: null })
      .select("name companyName services workStatus ownerId createdAt")
      .populate("ownerId", "name email")
      .lean(),
    Ticket.find({ ...filter, archivedAt: null })
      .select("ticketId subject priority status createdAt firstResponseAt resolvedAt slaBreachedAt")
      .lean(),
    SlaPolicy.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 }),
    Feedback.find({ ...filter, type: "csat" })
      .select("score")
      .lean()
  ]);

  const activePolicies = policies.filter(p => p.status === "active");
  const policyByPriority = {};
  for (const p of activePolicies) {
    const key = String(p.priority || "Medium").toLowerCase();
    if (!policyByPriority[key]) policyByPriority[key] = p;
  }

  const firstResponseTargetHours = activePolicies.length > 0
    ? Number((activePolicies.reduce((s, p) => s + (Number(p.responseTimeTargetHours) || 2), 0) / activePolicies.length).toFixed(1))
    : 2;
  const resolutionTargetHours = activePolicies.length > 0
    ? Number((activePolicies.reduce((s, p) => s + (Number(p.resolutionTimeTargetHours) || 24), 0) / activePolicies.length).toFixed(1))
    : 24;
  const sloAvailabilityTarget = activePolicies.length > 0
    ? Number((activePolicies[0].sloAvailabilityTarget || 99.9).toFixed(1))
    : 99.9;
  const sloCsatTarget = activePolicies.length > 0
    ? Number((activePolicies[0].sloCsatTarget || 95.0).toFixed(1))
    : 95.0;

  let totalServices = 0;
  let withinSla = 0;
  let warningSla = 0;
  let breachedSla = 0;
  const atRiskItems = [];

  const now = new Date();

  customers.forEach(c => {
    const services = c.services || [];
    const clientLabel = c.companyName || c.name || "Client";
    if (services.length === 0) {
      totalServices += 1;
      const created = new Date(c.createdAt);
      const daysElapsed = (now - created) / (1000 * 60 * 60 * 24);
      if (c.workStatus === "Completed") withinSla += 1;
      else if (daysElapsed > 30) {
        breachedSla += 1;
        atRiskItems.push({ id: c._id, entityId: c._id, targetTab: "inventory-customer", type: "Account", ref: clientLabel, title: c.workStatus || "Open Account", status: "breached", elapsedLabel: `${Math.round(daysElapsed)}d open` });
      } else if (daysElapsed > 20) {
        warningSla += 1;
        atRiskItems.push({ id: c._id, entityId: c._id, targetTab: "inventory-customer", type: "Account", ref: clientLabel, title: c.workStatus || "Open Account", status: "warning", elapsedLabel: `${Math.round(daysElapsed)}d open` });
      } else {
        withinSla += 1;
      }
    } else {
      services.forEach((s, idx) => {
        totalServices += 1;
        if (s.workStatus === "Completed") {
          withinSla += 1;
        } else if (s.dueDate && new Date(s.dueDate) < now) {
          breachedSla += 1;
          const overdueDays = Math.max(1, Math.round((now - new Date(s.dueDate)) / (1000 * 60 * 60 * 24)));
          atRiskItems.push({ id: `${c._id}-${idx}`, entityId: c._id, targetTab: "inventory-customer", type: "Service", ref: clientLabel, title: s.serviceName || "Service Task", status: "breached", elapsedLabel: `${overdueDays}d overdue` });
        } else if (s.dueDate && (new Date(s.dueDate) - now) / (1000 * 60 * 60 * 24) <= 7) {
          warningSla += 1;
          const leftDays = Math.max(0, Math.ceil((new Date(s.dueDate) - now) / (1000 * 60 * 60 * 24)));
          atRiskItems.push({ id: `${c._id}-${idx}`, entityId: c._id, targetTab: "inventory-customer", type: "Service", ref: clientLabel, title: s.serviceName || "Service Task", status: "warning", elapsedLabel: `${leftDays}d left` });
        } else {
          withinSla += 1;
        }
      });
    }
  });

  const priorityMap = { urgent: "critical", high: "high", medium: "medium", low: "low" };
  tickets.forEach(t => {
    totalServices += 1;
    const mappedPriority = priorityMap[String(t.priority || "medium").toLowerCase()] || "medium";
    const policy = policyByPriority[mappedPriority];
    const targetHrs = Number(policy?.resolutionTimeTargetHours) || resolutionTargetHours;
    const warnPct = Number(policy?.warningThresholdPercent) || 75;
    const useBizHours = Boolean(policy?.businessHoursOnly);
    const isDone = t.status === "resolved" || t.status === "closed";

    if (t.slaBreachedAt) {
      breachedSla += 1;
      if (!isDone) {
        const hrs = Math.round(computeElapsedSlaHours(t.createdAt, now, useBizHours));
        atRiskItems.push({ id: t._id, entityId: t._id, targetTab: "tickets", type: "Ticket", ref: t.ticketId || "Ticket", title: t.subject || "Support Ticket", priority: t.priority, status: "breached", elapsedLabel: `${hrs}h / ${targetHrs}h${useBizHours ? " (BH)" : ""}` });
      }
      return;
    }

    if (isDone) {
      withinSla += 1;
      return;
    }

    const elapsedHrs = computeElapsedSlaHours(t.createdAt, now, useBizHours);
    if (elapsedHrs > targetHrs) {
      breachedSla += 1;
      atRiskItems.push({ id: t._id, entityId: t._id, targetTab: "tickets", type: "Ticket", ref: t.ticketId || "Ticket", title: t.subject || "Support Ticket", priority: t.priority, status: "breached", elapsedLabel: `${Math.round(elapsedHrs)}h / ${targetHrs}h${useBizHours ? " (BH)" : ""}` });
    } else if (elapsedHrs >= targetHrs * (warnPct / 100)) {
      warningSla += 1;
      atRiskItems.push({ id: t._id, entityId: t._id, targetTab: "tickets", type: "Ticket", ref: t.ticketId || "Ticket", title: t.subject || "Support Ticket", priority: t.priority, status: "warning", elapsedLabel: `${Math.round(elapsedHrs)}h / ${targetHrs}h${useBizHours ? " (BH)" : ""}` });
    } else {
      withinSla += 1;
    }
  });

  atRiskItems.sort((a, b) => (a.status === b.status ? 0 : a.status === "breached" ? -1 : 1));

  const slaCompliancePercent = totalServices > 0 ? Number((((withinSla + warningSla) / totalServices) * 100).toFixed(1)) : 100;
  const breachPercent = totalServices > 0 ? Number(((breachedSla / totalServices) * 100).toFixed(1)) : 0;
  const sloAvailabilityAchieved = totalServices > 0 ? Number((((totalServices - breachedSla) / totalServices) * 100).toFixed(2)) : 100;

  const respondedTickets = tickets.filter(t => t.firstResponseAt && t.createdAt);
  const avgFirstResponseTimeHours = respondedTickets.length > 0
    ? Number((respondedTickets.reduce((acc, t) => acc + Math.max(0, (new Date(t.firstResponseAt) - new Date(t.createdAt)) / 3600000), 0) / respondedTickets.length).toFixed(2))
    : 0;
  const resolvedTickets = tickets.filter(t => t.resolvedAt && t.createdAt);
  const avgResolutionTimeHours = resolvedTickets.length > 0
    ? Number((resolvedTickets.reduce((acc, t) => acc + Math.max(0, (new Date(t.resolvedAt) - new Date(t.createdAt)) / 3600000), 0) / resolvedTickets.length).toFixed(2))
    : 0;

  const csatFeedbackCount = csatFeedbacks.length;
  const satisfiedCsatCount = csatFeedbacks.filter(f => Number(f.score) >= 4).length;
  const liveCsatPercent = csatFeedbackCount > 0
    ? Number(((satisfiedCsatCount / csatFeedbackCount) * 100).toFixed(1))
    : null;

  return res.json({
    summary: {
      totalServices,
      withinSla,
      warningSla,
      breachedSla,
      slaCompliancePercent,
      breachPercent,
      avgFirstResponseTimeHours,
      avgResolutionTimeHours,
      firstResponseTargetHours,
      resolutionTargetHours,
      sloAvailabilityTarget,
      sloCsatTarget,
      sloAvailabilityAchieved,
      sloCsatAchieved: liveCsatPercent,
      liveCsatPercent,
      csatFeedbackCount
    },
    atRiskItems: atRiskItems.slice(0, 50),
    policies
  });
});

export const listSlaPolicies = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;
  const filter = { websiteId: { $in: ownedWebsiteIds } };
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access to website SLA policies", 403);
    }
    filter.websiteId = websiteId;
  }
  const policies = await SlaPolicy.find(filter)
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  return res.json(policies);
});

export const createSlaPolicy = asyncHandler(async (req, res) => {
  const { websiteId, name, description, priority, customerType, serviceType, responseTimeTargetHours, resolutionTimeTargetHours, warningThresholdPercent, escalationThresholdPercent, businessHoursOnly, status } = req.body;

  if (!name) {
    throw new AppError("Policy name is required", 400);
  }

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  let targetWebsiteId = websiteId;
  if (!targetWebsiteId) {
    targetWebsiteId = ownedWebsiteIds[0] ? ownedWebsiteIds[0].toString() : null;
  }

  if (!targetWebsiteId) {
    throw new AppError("A valid website scope is required to create SLA policies", 400);
  }

  if (!ownedWebsiteIds.map(id => id.toString()).includes(targetWebsiteId.toString())) {
    throw new AppError("Unauthorized access to website scope", 403);
  }

  const policy = await SlaPolicy.create({
    websiteId: targetWebsiteId,
    name,
    description: description || "",
    priority: priority || "Medium",
    customerType: customerType || "All",
    serviceType: serviceType || "All",
    responseTimeTargetHours: Number(responseTimeTargetHours) || 2,
    resolutionTimeTargetHours: Number(resolutionTimeTargetHours) || 24,
    warningThresholdPercent: Number(warningThresholdPercent) || 75,
    escalationThresholdPercent: Number(escalationThresholdPercent) || 100,
    businessHoursOnly: businessHoursOnly !== undefined ? Boolean(businessHoursOnly) : true,
    status: status || "active",
    createdBy: req.user._id
  });

  await logAuditEvent({
    userId: req.user._id,
    websiteId,
    action: "SLA_POLICY_CREATED",
    resource: "SlaPolicy",
    resourceId: policy._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { name: policy.name, priority: policy.priority }
  });

  return res.status(201).json(policy);
});

export const updateSlaPolicy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);

  const policy = await SlaPolicy.findById(id);
  if (!policy) {
    throw new AppError("SLA policy not found", 404);
  }

  if (!ownedWebsiteIds.map(wId => wId.toString()).includes(policy.websiteId.toString())) {
    throw new AppError("Unauthorized access to update this SLA policy", 403);
  }

  const beforeState = policy.toObject();

  const fields = ["name", "description", "priority", "customerType", "serviceType", "responseTimeTargetHours", "resolutionTimeTargetHours", "warningThresholdPercent", "escalationThresholdPercent", "businessHoursOnly", "status"];
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      policy[field] = req.body[field];
    }
  });

  await policy.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: policy.websiteId,
    action: "SLA_POLICY_UPDATED",
    resource: "SlaPolicy",
    resourceId: policy._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { before: beforeState, after: policy.toObject() }
  });

  return res.json(policy);
});

export const deleteSlaPolicy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);

  const policy = await SlaPolicy.findById(id);
  if (!policy) {
    throw new AppError("SLA policy not found", 404);
  }

  if (!ownedWebsiteIds.map(wId => wId.toString()).includes(policy.websiteId.toString())) {
    throw new AppError("Unauthorized access to delete this SLA policy", 403);
  }

  await SlaPolicy.findByIdAndDelete(id);

  await logAuditEvent({
    userId: req.user._id,
    websiteId: policy.websiteId,
    action: "SLA_POLICY_DELETED",
    resource: "SlaPolicy",
    resourceId: policy._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { name: policy.name }
  });

  return res.json({ message: "SLA policy deleted successfully" });
});
