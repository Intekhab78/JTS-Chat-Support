import mongoose from "mongoose";
import { ComplianceGovernance } from "../models/ComplianceGovernance.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";

export const getComplianceOverview = asyncHandler(async (req, res) => {
  let doc = await ComplianceGovernance.findOne({});

  if (!doc) {
    doc = await ComplianceGovernance.create({
      complianceScores: {
        gdprPercent: 96.4,
        pdplPercent: 98.2,
        soc2Percent: 94.5,
        iso27001Percent: 95.8,
        iso27701Percent: 92.1
      },
      dsarRequests: [
        {
          requestType: "export",
          subjectEmail: "client.privacy@enterprise.ae",
          details: "Export all VAT and Corporate Tax historical filings data",
          status: "completed",
          requestedAt: new Date(Date.now() - 86400000 * 2),
          completedAt: new Date(Date.now() - 86400000)
        },
        {
          requestType: "erasure",
          subjectEmail: "ex-employee@partner.com",
          details: "Delete personal contact details from inactive lead list",
          status: "pending",
          requestedAt: new Date()
        }
      ],
      retentionPolicies: [
        { dataCategory: "Financial Invoices & VAT Filings", retentionYears: 7, autoArchive: true, autoDelete: false },
        { dataCategory: "Audit & Security Logs", retentionYears: 3, autoArchive: true, autoDelete: false },
        { dataCategory: "Customer PII & Contacts", retentionYears: 5, autoArchive: true, autoDelete: false },
        { dataCategory: "Session Cookies & Telemetry", retentionYears: 1, autoArchive: false, autoDelete: true }
      ]
    });
  }

  const securityPolicies = {
    encryptionAtRest: "AES-256 (Mongoose Field-Level & Disk Encryption)",
    encryptionInTransit: "TLS v1.3 (HSTS Enabled)",
    passwordPolicy: "Min 12 Chars, Special Symbols, Number, Uppercase Required",
    keyRotation: "Automated 90-Day Rotation Schedule Active",
    privacyPolicyVersion: "v2.1 (UAE PDPL & EU GDPR Aligned)"
  };

  return res.json({
    summary: {
      overallCompliance: "96.2% COMPLIANT",
      gdpr: `${doc.complianceScores.gdprPercent}%`,
      pdpl: `${doc.complianceScores.pdplPercent}%`,
      soc2: `${doc.complianceScores.soc2Percent}%`,
      iso27001: `${doc.complianceScores.iso27001Percent}%`,
      totalDsarRequests: doc.dsarRequests.length,
      pendingDsar: doc.dsarRequests.filter(r => r.status === "pending").length
    },
    securityPolicies,
    doc
  });
});

export const submitDsarRequest = asyncHandler(async (req, res) => {
  const { requestType, subjectEmail, details } = req.body;

  if (!requestType || !subjectEmail) {
    throw new AppError("Request type and data subject email are required", 400);
  }

  let doc = await ComplianceGovernance.findOne({});
  if (!doc) doc = new ComplianceGovernance({});

  doc.dsarRequests.push({
    requestType,
    subjectEmail,
    details: details || "",
    status: "pending",
    requestedAt: new Date()
  });

  await doc.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "DSAR_DATA_SUBJECT_REQUEST_SUBMITTED",
    resource: "ComplianceGovernance",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { requestType, subjectEmail }
  });

  return res.status(201).json(doc.dsarRequests);
});

export const updateDsarStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  let doc = await ComplianceGovernance.findOne({});
  if (!doc) throw new AppError("Compliance record not found", 404);

  const reqItem = doc.dsarRequests.id(id);
  if (!reqItem) throw new AppError("DSAR request not found", 404);

  reqItem.status = status;
  if (status === "completed") reqItem.completedAt = new Date();

  await doc.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: `DSAR_REQUEST_${status.toUpperCase()}`,
    resource: "ComplianceGovernance",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { subjectEmail: reqItem.subjectEmail, status }
  });

  return res.json(doc.dsarRequests);
});
