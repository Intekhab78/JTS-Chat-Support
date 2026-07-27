import mongoose from "mongoose";
import { AppMarketplacePlugin } from "../models/AppMarketplacePlugin.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logAuditEvent } from "../services/auditService.js";

const DEFAULT_PLUGINS = [
  {
    pluginKey: "ai_copilot_assistant",
    pluginName: "AI Tax & CRM Copilot",
    description: "Automated document summary, lead scoring, and intelligent follow-up suggestions.",
    category: "ai_plugins",
    version: "v2.4.0",
    author: "JTS AI Research Labs",
    rating: 4.9,
    downloadsCount: 3420,
    isInstalled: true,
    isActive: true,
    manifest: { permissions: ["CRM_READ", "AI_EXECUTE"], apiHooks: ["ON_DOCUMENT_UPLOAD"], uiHooks: ["CUSTOMER_360_PANEL"] }
  },
  {
    pluginKey: "whatsapp_pro_notifier",
    pluginName: "WhatsApp Enterprise Pro",
    description: "Multi-device official WhatsApp Business API integration for VAT reminders and automated notifications.",
    category: "communication",
    version: "v3.1.2",
    author: "JTS Messaging",
    rating: 4.8,
    downloadsCount: 2890,
    isInstalled: true,
    isActive: true,
    manifest: { permissions: ["MESSAGING_SEND"], apiHooks: ["ON_VAT_DUE"], uiHooks: ["ACTION_TOOLBAR"] }
  },
  {
    pluginKey: "stripe_payment_gateway",
    pluginName: "Stripe & Tap Payments Gateway",
    description: "Accept credit card, Apple Pay, and local GCC payments directly inside invoice checkout.",
    category: "payment_plugins",
    version: "v1.8.0",
    author: "Fintech Plugins Ltd",
    rating: 4.9,
    downloadsCount: 1980,
    isInstalled: true,
    isActive: true,
    manifest: { permissions: ["PAYMENTS_PROCESS"], apiHooks: ["ON_INVOICE_CREATE"], uiHooks: ["INVOICE_CHECKOUT"] }
  },
  {
    pluginKey: "power_bi_analytics_widget",
    pluginName: "Power BI Executive Dashboard Widget",
    description: "Embed real-time interactive Power BI analytics directly inside the executive client portal.",
    category: "analytics",
    version: "v1.2.0",
    author: "Microsoft Partner Network",
    rating: 4.7,
    downloadsCount: 1450,
    isInstalled: false,
    isActive: false,
    manifest: { permissions: ["REPORTS_VIEW"], apiHooks: ["ON_ANALYTICS_QUERY"], uiHooks: ["EXECUTIVE_DASHBOARD"] }
  },
  {
    pluginKey: "gdpr_privacy_shield",
    pluginName: "GDPR & PDPL Compliance Shield",
    description: "Automated Data Subject Rights (DSAR) exporter and PII field masking plugin.",
    category: "compliance",
    version: "v2.0.1",
    author: "CyberSec Compliance",
    rating: 5.0,
    downloadsCount: 1120,
    isInstalled: false,
    isActive: false,
    manifest: { permissions: ["PRIVACY_ADMIN"], apiHooks: ["ON_DSAR_SUBMIT"], uiHooks: ["COMPLIANCE_CENTER"] }
  }
];

export const getMarketplaceOverview = asyncHandler(async (req, res) => {
  let count = await AppMarketplacePlugin.countDocuments({});

  if (count === 0) {
    await AppMarketplacePlugin.insertMany(DEFAULT_PLUGINS.map(p => ({ ...p, createdBy: req.user._id })));
  }

  const plugins = await AppMarketplacePlugin.find({}).sort({ isInstalled: -1, rating: -1 });

  const installedCount = plugins.filter(p => p.isInstalled).length;
  const activeCount = plugins.filter(p => p.isInstalled && p.isActive).length;

  return res.json({
    summary: {
      totalAvailablePlugins: plugins.length,
      installedPluginsCount: installedCount,
      activePluginsCount: activeCount,
      availableUpdates: 1,
      pluginEngineHealth: "100% HEALTHY",
      sdkVersion: "v1.0.0-SDK"
    },
    plugins
  });
});

export const installPlugin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plugin = await AppMarketplacePlugin.findById(id);
  if (!plugin) throw new AppError("Plugin not found", 404);

  plugin.isInstalled = true;
  plugin.isActive = true;
  await plugin.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "APP_MARKETPLACE_PLUGIN_INSTALLED",
    resource: "AppMarketplacePlugin",
    resourceId: plugin._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { pluginKey: plugin.pluginKey, pluginName: plugin.pluginName }
  });

  return res.json(plugin);
});

export const togglePluginActive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const plugin = await AppMarketplacePlugin.findById(id);
  if (!plugin) throw new AppError("Plugin not found", 404);

  plugin.isActive = isActive !== undefined ? isActive : !plugin.isActive;
  await plugin.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: `APP_MARKETPLACE_PLUGIN_${plugin.isActive ? "ACTIVATED" : "DEACTIVATED"}`,
    resource: "AppMarketplacePlugin",
    resourceId: plugin._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { pluginKey: plugin.pluginKey, isActive: plugin.isActive }
  });

  return res.json(plugin);
});

export const uninstallPlugin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plugin = await AppMarketplacePlugin.findById(id);
  if (!plugin) throw new AppError("Plugin not found", 404);

  plugin.isInstalled = false;
  plugin.isActive = false;
  await plugin.save();

  await logAuditEvent({
    userId: req.user._id,
    websiteId: null,
    action: "APP_MARKETPLACE_PLUGIN_UNINSTALLED",
    resource: "AppMarketplacePlugin",
    resourceId: plugin._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    changes: { pluginKey: plugin.pluginKey }
  });

  return res.json(plugin);
});
