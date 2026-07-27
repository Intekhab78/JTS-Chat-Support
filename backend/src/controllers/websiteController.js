import { Website } from "../models/Website.js";
import { getOwnedWebsiteIds, normalizeRole } from "../utils/roleUtils.js";
import { generateApiKey } from "../utils/generateKey.js";
import { ensureAnalytics } from "../services/analyticsService.js";
import { env } from "../config/env.js";
import { logAuditEvent } from "../services/auditService.js";
import { User } from "../models/User.js";
import { resolveSubscriptionForUser } from "../utils/planUtils.js";
import { autoSeedWebsiteData } from "../services/websiteSetupService.js";
import { getSocketServer } from "../sockets/index.js";
import { broadcastDataChange } from "../services/dataSyncService.js";

function buildEmbedScript(apiKey) {
  return `<script>\n  (function(){\n    var s = document.createElement("script");\n    s.src = "${env.widgetPublicUrl}";\n    s.setAttribute("data-api-key", "${apiKey}");\n    document.body.appendChild(s);\n  })();\n</script>`;
}

export async function createWebsite(req, res) {
  const tenantId = req.user.role === "client" ? req.user._id : req.user.managerId;
  const tenant = req.user.role === "client" ? req.user : await User.findById(tenantId).select("subscription");
  const subscription = resolveSubscriptionForUser(tenant);
  const websiteCount = await Website.countDocuments({ managerId: tenantId });
  if (websiteCount >= (subscription.limits?.websites || 0)) {
    return res.status(403).json({ message: `Your ${subscription.plan} plan allows up to ${subscription.limits?.websites || 0} websites.` });
  }

  const website = await Website.create({
    websiteName: req.body.websiteName,
    domain: req.body.domain,
    managerId: tenantId,
    apiKey: generateApiKey(),
    primaryColor: req.body.primaryColor,
    accentColor: req.body.accentColor,
    launcherIcon: req.body.launcherIcon,
    welcomeMessage: req.body.welcomeMessage,
    awayMessage: req.body.awayMessage,
    position: req.body.position,
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    enableChat: req.body.enableChat !== undefined ? req.body.enableChat : true,
    enableLeadGeneration: req.body.enableLeadGeneration !== undefined ? req.body.enableLeadGeneration : true,
    enableTicketing: req.body.enableTicketing !== undefined ? req.body.enableTicketing : true,
    enableKnowledgeBase: req.body.enableKnowledgeBase !== undefined ? req.body.enableKnowledgeBase : true,
    enableLiveAgent: req.body.enableLiveAgent !== undefined ? req.body.enableLiveAgent : true,
    enableAutomation: req.body.enableAutomation !== undefined ? req.body.enableAutomation : true,
    businessHours: req.body.businessHours,
    webhooks: req.body.webhooks,
    ...(Array.isArray(req.body.pipelineStages) ? { pipelineStages: req.body.pipelineStages } : {}),
    ...(req.body.currencySettings ? { currencySettings: req.body.currencySettings } : {})
  });

  await ensureAnalytics(website._id);
  
  // Auto-seed default flow, categories, departments, and services
  try {
    await autoSeedWebsiteData(website._id, tenantId);
  } catch (err) {
    console.error(`Failed to auto-seed website ${website._id}`, err);
  }
  await logAuditEvent({
    actor: req.user,
    action: "website.created",
    entityType: "website",
    entityId: website._id,
    websiteId: website._id,
    metadata: { websiteName: website.websiteName, domain: website.domain },
    ipAddress: req.ip
  });
  broadcastDataChange({ entity: "website", action: "created", websiteId: website._id, data: { id: website._id } });
  const enriched = { ...website.toObject(), embedScript: buildEmbedScript(website.apiKey) };
  return res.status(201).json(enriched);
}

export async function updateWebsite(req, res) {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const role = normalizeRole(req.user.role);
  if (role !== "admin" && !ownedWebsiteIds.map(id => id.toString()).includes(req.params.id)) {
    return res.status(403).json({ message: "Access denied" });
  }
  const updateData = {};
  const fields = [
    "websiteName", "domain", "primaryColor", "accentColor", "launcherIcon",
    "welcomeMessage", "awayMessage", "position", "businessHours", "webhooks",
    "isActive", "enableChat", "enableLeadGeneration", "enableTicketing",
    "enableKnowledgeBase", "enableLiveAgent", "enableAutomation", "currencySettings"
  ];
  
  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  if (Array.isArray(req.body.pipelineStages)) {
    updateData.pipelineStages = req.body.pipelineStages;
  }

  const filter = { _id: req.params.id };
  const website = await Website.findOneAndUpdate(
    filter,
    updateData,
    { new: true }
  );

  if (!website) return res.status(404).json({ message: "Website not found" });
  await logAuditEvent({
    actor: req.user,
    action: "website.updated",
    entityType: "website",
    entityId: website._id,
    websiteId: website._id,
    metadata: {
      websiteName: website.websiteName,
      updatedFields: Object.keys(req.body || {})
    },
    ipAddress: req.ip
  });
  broadcastDataChange({ entity: "website", action: "updated", websiteId: website._id, data: { id: website._id } });
  return res.json({ ...website.toObject(), embedScript: buildEmbedScript(website.apiKey) });
}

export async function listWebsites(req, res) {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const role = normalizeRole(req.user.role);
  const filter = role === "admin" ? {} : { _id: { $in: ownedWebsiteIds } };
  // Populate activeFlowId with full node tree so Flow Builder can read nodes directly
  const websites = await Website.find(filter)
    .populate("managerId", "name email")
    .populate("activeFlowId")        // ← THIS was missing: Flow Builder needs full nodes
    .sort({ createdAt: -1 });
  return res.json(websites.map((website) => ({ ...website.toObject(), embedScript: buildEmbedScript(website.apiKey) })));
}

export async function getWebsite(req, res) {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const role = normalizeRole(req.user.role);
  if (role !== "admin" && !ownedWebsiteIds.map(id => id.toString()).includes(req.params.id)) {
    return res.status(403).json({ message: "Access denied" });
  }
  const website = await Website.findById(req.params.id)
    .populate("managerId", "name email")
    .populate("activeFlowId"); // Full flow with all nodes
  if (!website) return res.status(404).json({ message: "Website not found" });
  return res.json({ ...website.toObject(), embedScript: buildEmbedScript(website.apiKey) });
}

export async function deleteWebsite(req, res) {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const role = normalizeRole(req.user.role);
  if (role !== "admin" && !ownedWebsiteIds.map(id => id.toString()).includes(req.params.id)) {
    return res.status(403).json({ message: "Access denied" });
  }
  const website = await Website.findByIdAndDelete(req.params.id);
  if (!website) return res.status(404).json({ message: "Website not found" });

  await logAuditEvent({
    actor: req.user,
    action: "website.deleted",
    entityType: "website",
    entityId: website._id,
    websiteId: website._id,
    metadata: { websiteName: website.websiteName, domain: website.domain },
    ipAddress: req.ip
  });

  broadcastDataChange({ entity: "website", action: "deleted", websiteId: website._id, data: { id: website._id } });
  return res.json({ message: "Website deleted successfully", _id: website._id });
}
