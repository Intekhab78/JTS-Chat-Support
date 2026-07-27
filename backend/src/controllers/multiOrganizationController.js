import mongoose from "mongoose";
import { MultiOrganization } from "../models/MultiOrganization.js";
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

  const holding = orgs.find(o => o.orgType === "holding_company") || orgs[0];
  const subsidiaries = orgs.filter(o => o.orgType === "subsidiary");
  const branches = orgs.filter(o => o.orgType === "branch");

  return res.json({
    summary: {
      totalOrganizations: orgs.length,
      holdingCompany: holding ? holding.orgName : "JTS Group",
      subsidiariesCount: subsidiaries.length,
      branchesCount: branches.length,
      crossReportingEnabled: true,
      isolationMode: "MULTI_ORG_ENTERPRISE_ACTIVE"
    },
    orgs
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
