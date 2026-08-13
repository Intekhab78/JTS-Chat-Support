import crypto from "crypto";
import { Ticket } from "../models/Ticket.js";
import { Customer } from "../models/Customer.js";
import { User } from "../models/User.js";
import { getOwnedWebsiteIds, normalizeRole } from "../utils/roleUtils.js";

export function normalizeDepartment(value) {
  return String(value || "").trim().toLowerCase() || "general";
}

export function mapTicketCrmStageToPipelineStage(crmStage) {
  const stage = String(crmStage || "").trim().toLowerCase();
  if (!stage || stage === "none") return null;
  if (stage === "lead") return "new";
  if (stage === "contacted") return "contacted";
  if (stage === "qualified") return "qualified";
  if (stage === "opportunity") return "contacted";
  if (stage === "proposal") return "proposal_sent";
  if (stage === "negotiation") return "negotiation";
  if (stage === "won") return "won";
  if (stage === "lost") return "lost";
  return null;
}

export function buildTicketId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `TKT-${timestamp}-${rand}`;
}

export function ticketToCsvRow(ticket) {
  const fields = [
    ticket.ticketId,
    ticket.subject,
    ticket.status,
    ticket.priority,
    ticket.crmStage || "none",
    ticket.websiteId?.websiteName || "",
    ticket.visitorId?.name || "",
    ticket.visitorId?.email || "",
    ticket.assignedAgent?.name || "",
    ticket.assignedAt?.toISOString?.() || "",
    ticket.createdAt?.toISOString?.() || "",
    ticket.updatedAt?.toISOString?.() || ""
  ];
  return fields.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",");
}

export function pushAssignmentHistory(ticket, { assignedAgentId, assignedBy, reason }) {
  if (!ticket.assignmentHistory) ticket.assignmentHistory = [];
  ticket.assignmentHistory.unshift({
    assignedAgent: assignedAgentId || null,
    assignedBy: assignedBy || null,
    reason: reason || "",
    assignedAt: new Date()
  });
  ticket.assignedAt = assignedAgentId ? new Date() : null;
  ticket.assignedBy = assignedBy || null;
  ticket.assignmentReason = reason || "";
}

export async function syncSalesOwnerFromTicket(ticket, actorId, reason = "sales_ticket_assignment") {
  if (!ticket?.assignedAgent) return false;
  const assignee = await User.findById(ticket.assignedAgent).select("_id role");
  if (!assignee || assignee.role !== "sales") return false;

  let customer = null;
  if (ticket.customerId) {
    customer = await Customer.findById(ticket.customerId);
  } else if (ticket.crn) {
    customer = await Customer.findOne({ crn: ticket.crn, websiteId: ticket.websiteId });
  }
  if (!customer) return false;
  if (String(customer.ownerId || "") === String(assignee._id)) return false;

  customer.ownerId = assignee._id;
  customer.ownerAssignedAt = new Date();
  if (!customer.assignmentHistory) customer.assignmentHistory = [];
  customer.assignmentHistory.unshift({
    ownerId: assignee._id,
    assignedBy: actorId || null,
    reason,
    assignedAt: new Date()
  });
  await customer.save();
  return true;
}

export async function buildTicketScopeFilter(user) {
  const role = normalizeRole(user.role);
  if (role === "admin") return {};
  if (["client", "manager", "sales", "purchase", "tax_consultant"].includes(role)) {
    const ownedWebsiteIds = await getOwnedWebsiteIds(user);
    if (ownedWebsiteIds && ownedWebsiteIds.length > 0) {
      return { websiteId: { $in: ownedWebsiteIds } };
    }
  }
  const ownedWebsiteIds = await getOwnedWebsiteIds(user);
  if (ownedWebsiteIds && ownedWebsiteIds.length > 0) {
    return {
      $or: [
        { websiteId: { $in: ownedWebsiteIds } },
        { assignedAgent: user._id },
        { assignedAgent: null }
      ]
    };
  }
  return {
    $or: [
      { assignedAgent: user._id },
      { assignedAgent: null }
    ]
  };
}

export async function buildSessionScopeFilter(user) {
  if (user.role === "admin") return {};
  if (["client", "manager", "sales"].includes(user.role)) {
    const ownedWebsiteIds = await getOwnedWebsiteIds(user);
    return { websiteId: { $in: ownedWebsiteIds } };
  }
  return { assignedAgent: user._id };
}

export async function findScopedTicketById(ticketId, user) {
  const role = normalizeRole(user.role);
  const isMongoId = ticketId && ticketId.length === 24 && /^[0-9a-fA-F]{24}$/.test(ticketId);
  const idQuery = isMongoId ? { $or: [{ _id: ticketId }, { ticketId }] } : { ticketId };

  if (role === "admin" || role === "client" || role === "manager") {
    return Ticket.findOne(idQuery)
      .populate("visitorId", "name email")
      .populate("customerId", "name email crn")
      .populate("assignedAgent", "name email")
      .populate("websiteId", "websiteName domain");
  }

  const scope = await buildTicketScopeFilter(user);
  return Ticket.findOne({ ...idQuery, ...scope })
    .populate("visitorId", "name email")
    .populate("customerId", "name email crn")
    .populate("assignedAgent", "name email")
    .populate("websiteId", "websiteName domain");
}

export async function ensureSessionTicketAccess(session, user) {
  const role = normalizeRole(user.role);
  const sessionWebsiteId = session?.websiteId?._id || session?.websiteId || null;
  if (role === "admin") return true;
  if (!sessionWebsiteId) return String(session.assignedAgent || "") === String(user._id);
  if (["client", "manager"].includes(role)) {
    const ownedWebsiteIds = await getOwnedWebsiteIds(user);
    return ownedWebsiteIds.some((id) => String(id) === String(sessionWebsiteId));
  }
  const ownedWebsiteIds = await getOwnedWebsiteIds(user);
  return ownedWebsiteIds.some((id) => String(id) === String(sessionWebsiteId)) && String(session.assignedAgent || "") === String(user._id);
}
