import mongoose from "mongoose";
import { MultiOrganization } from "../models/MultiOrganization.js";
import { Customer } from "../models/Customer.js";
import { Invoice } from "../models/Invoice.js";
import { Deal } from "../models/Deal.js";
import { Ticket } from "../models/Ticket.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";

const DEFAULT_ORGS = [
  {
    orgName: "JTS Enterprise Holdings Group LLC",
    orgCode: "JTS_HOLDING_HQ",
    orgType: "holding_company",
    country: "United Arab Emirates",
    currency: "AED",
    trnNumber: "100908129900003",
    centralBillingEnabled: true
  },
  {
    orgName: "JTS Tax & Compliance Consultancy FZ-LLC",
    orgCode: "JTS_TAX_UAE",
    orgType: "subsidiary",
    country: "United Arab Emirates",
    currency: "AED",
    trnNumber: "100908129900004",
    centralBillingEnabled: true
  },
  {
    orgName: "JTS Global Technology Solutions Ltd",
    orgCode: "JTS_TECH_UK",
    orgType: "subsidiary",
    country: "United Kingdom",
    currency: "GBP",
    trnNumber: "GB990123812",
    centralBillingEnabled: true
  }
];

export const getOrganizationOverview = asyncHandler(async (req, res) => {
  let count = await MultiOrganization.countDocuments({});

  if (count === 0) {
    await MultiOrganization.insertMany(DEFAULT_ORGS.map(o => ({ ...o, createdBy: req.user._id })));
  }

  const orgs = await MultiOrganization.find({}).sort({ orgType: 1, orgName: 1 });

  // Compute live linked entity counts per organization node
  const [customerCounts, invoiceCounts, dealCounts, ticketCounts] = await Promise.all([
    Customer.aggregate([{ $group: { _id: "$organizationId", count: { $sum: 1 } } }]),
    Invoice.aggregate([{ $group: { _id: "$organizationId", count: { $sum: 1 }, totalRevenue: { $sum: "$paidAmount" } } }]),
    Deal.aggregate([{ $group: { _id: "$organizationId", count: { $sum: 1 }, totalValue: { $sum: "$dealValue" } } }]),
    Ticket.aggregate([{ $group: { _id: "$organizationId", count: { $sum: 1 } } }])
  ]);

  const customerMap = Object.fromEntries(customerCounts.map(c => [String(c._id || "unassigned"), c.count]));
  const invoiceMap = Object.fromEntries(invoiceCounts.map(i => [String(i._id || "unassigned"), { count: i.count, revenue: i.totalRevenue || 0 }]));
  const dealMap = Object.fromEntries(dealCounts.map(d => [String(d._id || "unassigned"), { count: d.count, value: d.totalValue || 0 }]));
  const ticketMap = Object.fromEntries(ticketCounts.map(t => [String(t._id || "unassigned"), t.count]));

  const enrichedOrgs = orgs.map(org => {
    const orgIdStr = String(org._id);
    const orgObj = org.toObject();
    orgObj.metrics = {
      customerCount: customerMap[orgIdStr] || 0,
      invoiceCount: invoiceMap[orgIdStr]?.count || 0,
      revenueGenerated: invoiceMap[orgIdStr]?.revenue || 0,
      dealCount: dealMap[orgIdStr]?.count || 0,
      pipelineValue: dealMap[orgIdStr]?.value || 0,
      openTickets: ticketMap[orgIdStr] || 0
    };
    return orgObj;
  });

  const holding = enrichedOrgs.find(o => o.orgType === "holding_company") || enrichedOrgs[0];
  const subsidiaries = enrichedOrgs.filter(o => o.orgType === "subsidiary");
  const branches = enrichedOrgs.filter(o => o.orgType === "branch");

  return res.json({
    summary: {
      totalOrganizations: orgs.length,
      holdingCompany: holding ? holding.orgName : "JTS Enterprise Holdings Group LLC",
      subsidiariesCount: subsidiaries.length,
      branchesCount: branches.length,
      crossReportingEnabled: true,
      isolationMode: "MULTI_ORG_ENTERPRISE_ACTIVE",
      totalConsolidatedCustomers: Object.values(customerMap).reduce((a, b) => a + b, 0),
      totalConsolidatedDeals: Object.values(dealMap).reduce((a, b) => a + b.count, 0)
    },
    orgs: enrichedOrgs
  });
});

export const getCrossSubsidiaryAnalytics = asyncHandler(async (req, res) => {
  const orgs = await MultiOrganization.find({});
  const orgMap = Object.fromEntries(orgs.map(o => [String(o._id), o]));

  const [invoicesAgg, dealsAgg, customersAgg, ticketsAgg] = await Promise.all([
    Invoice.aggregate([
      {
        $group: {
          _id: "$organizationId",
          totalInvoiced: { $sum: "$total" },
          totalPaid: { $sum: "$paidAmount" },
          invoiceCount: { $sum: 1 },
          paidInvoices: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } }
        }
      }
    ]),
    Deal.aggregate([
      {
        $group: {
          _id: "$organizationId",
          pipelineValue: { $sum: "$dealValue" },
          dealCount: { $sum: 1 },
          wonDeals: { $sum: { $cond: [{ $eq: ["$stage", "won"] }, 1, 0] } }
        }
      }
    ]),
    Customer.aggregate([
      {
        $group: {
          _id: "$organizationId",
          totalCustomers: { $sum: 1 },
          hotLeads: { $sum: { $cond: [{ $eq: ["$interestLevel", "hot"] }, 1, 0] } }
        }
      }
    ]),
    Ticket.aggregate([
      {
        $group: {
          _id: "$organizationId",
          totalTickets: { $sum: 1 },
          openTickets: { $sum: { $cond: [{ $in: ["$status", ["open", "in_progress", "waiting"]] }, 1, 0] } },
          escalatedTickets: { $sum: { $cond: [{ $gt: ["$escalationLevel", 0] }, 1, 0] } }
        }
      }
    ])
  ]);

  const subsidiaryBreakdown = orgs.map(org => {
    const orgIdStr = String(org._id);
    const inv = invoicesAgg.find(i => String(i._id) === orgIdStr) || { totalInvoiced: 0, totalPaid: 0, invoiceCount: 0 };
    const deal = dealsAgg.find(d => String(d._id) === orgIdStr) || { pipelineValue: 0, dealCount: 0, wonDeals: 0 };
    const cust = customersAgg.find(c => String(c._id) === orgIdStr) || { totalCustomers: 0, hotLeads: 0 };
    const tkt = ticketsAgg.find(t => String(t._id) === orgIdStr) || { totalTickets: 0, openTickets: 0, escalatedTickets: 0 };

    return {
      organizationId: org._id,
      orgName: org.orgName,
      orgCode: org.orgCode,
      orgType: org.orgType,
      currency: org.currency,
      metrics: {
        totalRevenue: inv.totalPaid,
        totalInvoiced: inv.totalInvoiced,
        pipelineValue: deal.pipelineValue,
        activeDeals: deal.dealCount,
        customerCount: cust.totalCustomers,
        hotLeads: cust.hotLeads,
        openTickets: tkt.openTickets,
        escalatedTickets: tkt.escalatedTickets
      }
    };
  });

  const totalConsolidatedRevenue = invoicesAgg.reduce((acc, curr) => acc + (curr.totalPaid || 0), 0);
  const totalPipelineValue = dealsAgg.reduce((acc, curr) => acc + (curr.pipelineValue || 0), 0);
  const totalConsolidatedCustomers = customersAgg.reduce((acc, curr) => acc + (curr.totalCustomers || 0), 0);
  const totalOpenTickets = ticketsAgg.reduce((acc, curr) => acc + (curr.openTickets || 0), 0);

  return res.json({
    consolidatedSummary: {
      totalConsolidatedRevenue,
      totalPipelineValue,
      totalConsolidatedCustomers,
      totalOpenTickets,
      activeSubsidiaries: orgs.filter(o => o.orgType === "subsidiary").length,
      centralBillingActive: true,
      lastCalculatedAt: new Date().toISOString()
    },
    subsidiaryBreakdown
  });
});

export const assignEntityToOrganization = asyncHandler(async (req, res) => {
  const { entityType, entityId, organizationId } = req.body;

  if (!entityType || !entityId || !organizationId) {
    throw new AppError("entityType, entityId, and organizationId are required", 400);
  }

  const org = await MultiOrganization.findById(organizationId);
  if (!org) throw new AppError("Target organization not found", 404);

  let updatedDoc = null;
  switch (entityType.toLowerCase()) {
    case "customer":
      updatedDoc = await Customer.findByIdAndUpdate(entityId, { organizationId: org._id }, { new: true });
      break;
    case "invoice":
      updatedDoc = await Invoice.findByIdAndUpdate(entityId, { organizationId: org._id }, { new: true });
      break;
    case "deal":
      updatedDoc = await Deal.findByIdAndUpdate(entityId, { organizationId: org._id }, { new: true });
      break;
    case "ticket":
      updatedDoc = await Ticket.findByIdAndUpdate(entityId, { organizationId: org._id }, { new: true });
      break;
    default:
      throw new AppError(`Unsupported entityType: ${entityType}. Allowed: customer, invoice, deal, ticket`, 400);
  }

  if (!updatedDoc) throw new AppError(`${entityType} with id ${entityId} not found`, 404);

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "ENTITY_ASSIGNED_TO_ORGANIZATION",
    resource: entityType,
    resourceId: entityId,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { organizationId: org._id, orgName: org.orgName, entityType }
  });

  return res.json({
    success: true,
    message: `${entityType} assigned to organization ${org.orgName}`,
    entity: updatedDoc
  });
});


export const createOrganizationNode = asyncHandler(async (req, res) => {
  const { orgName, orgCode, orgType, parentOrgId, country, currency, trnNumber } = req.body;

  if (!orgName || !orgCode) {
    throw new AppError("Organization name and unique organization code are required", 400);
  }

  const existing = await MultiOrganization.findOne({ orgCode: orgCode.toUpperCase() });
  if (existing) throw new AppError("Organization code already in use", 400);

  const newOrg = await MultiOrganization.create({
    orgName,
    orgCode: orgCode.toUpperCase(),
    orgType: orgType || "subsidiary",
    parentOrgId: parentOrgId || null,
    country: country || "United Arab Emirates",
    currency: currency || "AED",
    trnNumber: trnNumber || "",
    centralBillingEnabled: true,
    createdBy: req.user._id
  });

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "MULTI_ORGANIZATION_NODE_CREATED",
    resource: "MultiOrganization",
    resourceId: newOrg._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { orgName: newOrg.orgName, orgCode: newOrg.orgCode, orgType: newOrg.orgType }
  });

  return res.status(201).json(newOrg);
});

export const updateOrgPolicies = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { allowCrossReporting, enforceMfa, ipWhitelist } = req.body;

  const org = await MultiOrganization.findById(id);
  if (!org) throw new AppError("Organization not found", 404);

  if (allowCrossReporting !== undefined) org.orgPolicies.allowCrossReporting = allowCrossReporting;
  if (enforceMfa !== undefined) org.orgPolicies.enforceMfa = enforceMfa;
  if (Array.isArray(ipWhitelist)) org.orgPolicies.ipWhitelist = ipWhitelist;

  await org.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "MULTI_ORGANIZATION_POLICIES_UPDATED",
    resource: "MultiOrganization",
    resourceId: org._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { orgName: org.orgName, orgPolicies: org.orgPolicies }
  });

  return res.json(org);
});
