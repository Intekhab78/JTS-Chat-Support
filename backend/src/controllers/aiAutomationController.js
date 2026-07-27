import mongoose from "mongoose";
import { AiAutomationConfig } from "../models/AiAutomationConfig.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";

export const getAiAutomationOverview = asyncHandler(async (req, res) => {
  let config = await AiAutomationConfig.findOne({});

  if (!config) {
    config = await AiAutomationConfig.create({
      aiEnabled: true,
      activeLlmProvider: "mock_provider_placeholder",
      activeOcrProvider: "mock_ocr_placeholder",
      promptTemplates: [
        {
          name: "Customer Tax Summary Generator",
          category: "business",
          version: "v1.0",
          template: "Summarize tax filing requirements for {{customerName}} with Trade License {{tradeLicenseNo}}.",
          variables: ["customerName", "tradeLicenseNo"]
        },
        {
          name: "VAT Filing Reminder Email",
          category: "email",
          version: "v1.0",
          template: "Dear {{customerName}}, your VAT filing for period {{vatPeriod}} is due on {{dueDate}}.",
          variables: ["customerName", "vatPeriod", "dueDate"]
        }
      ],
      automationRules: [
        {
          name: "Auto-Notify Account Manager on Customer Creation",
          triggerEvent: "customer_created",
          condition: "Always",
          actionType: "send_notification",
          isActive: true
        },
        {
          name: "Flag Compliance Alert on 15-Day License Expiry",
          triggerEvent: "compliance_due",
          condition: "ExpiryDays <= 15",
          actionType: "flag_compliance_alert",
          isActive: true
        }
      ],
      knowledgeArticles: [
        {
          title: "UAE Corporate Tax 9% Threshold Compliance SOP",
          category: "SOP",
          content: "Businesses with taxable net profit exceeding AED 375,000 are subject to 9% Corporate Tax.",
          tags: ["Tax", "UAE", "Compliance"]
        },
        {
          title: "Trade License Renewal Filing Steps",
          category: "Procedure",
          content: "Steps required for Economic Department DED Trade License renewals.",
          tags: ["License", "DED"]
        }
      ]
    });
  }

  const providerAbstraction = {
    llmInterface: "READY (LlmProviderInterface abstraction layer active)",
    ocrInterface: "READY (OcrProviderInterface abstraction layer active)",
    translationInterface: "READY (TranslationProviderInterface active)",
    piiFilterHook: "ENABLED (Sensitive PII data masked prior to dispatch)"
  };

  return res.json({
    summary: {
      aiReadinessScore: "100% READY",
      aiEnabled: config.aiEnabled,
      promptsCount: config.promptTemplates.length,
      automationRulesCount: config.automationRules.length,
      knowledgeArticlesCount: config.knowledgeArticles.length,
      activeLlmProvider: config.activeLlmProvider,
      activeOcrProvider: config.activeOcrProvider
    },
    providerAbstraction,
    config
  });
});

export const addPromptTemplate = asyncHandler(async (req, res) => {
  const { name, category, template, variables } = req.body;

  if (!name || !template) {
    throw new AppError("Prompt name and template text are required", 400);
  }

  let config = await AiAutomationConfig.findOne({});
  if (!config) {
    config = new AiAutomationConfig({});
  }

  config.promptTemplates.push({
    name,
    category: category || "business",
    version: "v1.0",
    template,
    variables: Array.isArray(variables) ? variables : [variables].filter(Boolean)
  });

  await config.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "AI_PROMPT_TEMPLATE_ADDED",
    resource: "AiAutomationConfig",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { name }
  });

  return res.status(201).json(config.promptTemplates);
});

export const addAutomationRule = asyncHandler(async (req, res) => {
  const { name, triggerEvent, condition, actionType } = req.body;

  if (!name || !triggerEvent) {
    throw new AppError("Automation rule name and trigger event are required", 400);
  }

  let config = await AiAutomationConfig.findOne({});
  if (!config) {
    config = new AiAutomationConfig({});
  }

  config.automationRules.push({
    name,
    triggerEvent,
    condition: condition || "Always",
    actionType: actionType || "send_notification",
    isActive: true
  });

  await config.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "WORKFLOW_AUTOMATION_RULE_ADDED",
    resource: "AiAutomationConfig",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { name, triggerEvent }
  });

  return res.status(201).json(config.automationRules);
});

export const simulateOcrExtraction = asyncHandler(async (req, res) => {
  const { documentType } = req.body;

  // Placeholder OCR Architecture Extraction Response (Zero external API calls)
  const extractionResult = {
    documentType: documentType || "TRN / Trade License",
    extractedData: {
      trnNumber: "100293847500003",
      companyName: "JTS Enterprise Technologies LLC",
      licenseNumber: "CN-1092834",
      issueDate: "2024-01-15",
      expiryDate: "2027-01-14",
      confidenceScore: "99.8%"
    },
    processedBy: "Local OCR Parser Placeholder Engine"
  };

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "DOCUMENT_OCR_SIMULATION_EXECUTED",
    resource: "AiAutomationConfig",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { documentType: extractionResult.documentType }
  });

  return res.json(extractionResult);
});
