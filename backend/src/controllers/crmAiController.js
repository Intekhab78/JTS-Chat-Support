import { AiPrompt } from "../models/AiPrompt.js";
import { AiModelConfig } from "../models/AiModelConfig.js";
import { AiKnowledgeSource } from "../models/AiKnowledgeSource.js";
import { AiUsageLog } from "../models/AiUsageLog.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { AiProviderManager } from "../services/aiProviderManager.js";
import { executeAgentToolCall } from "../services/aiAgentFramework.js";

// Prompts CRUD
export const listPrompts = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  const prompts = await AiPrompt.find(query).sort({ name: 1 });
  res.json(prompts);
});

export const createPrompt = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized website scope", 403);
  }

  const prompt = await AiPrompt.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  res.status(201).json(prompt);
});

// Model Configs
export const getModelConfig = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  let config = await AiModelConfig.findOne({ websiteId: resolvedWebsiteId });
  if (!config) {
    config = await AiModelConfig.create({ websiteId: resolvedWebsiteId });
  }

  res.json(config);
});

export const saveModelConfig = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  const config = await AiModelConfig.findOneAndUpdate(
    { websiteId: resolvedWebsiteId },
    req.body,
    { new: true, upsert: true }
  );

  res.json(config);
});

// Knowledge indexing (RAG)
export const listKnowledge = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  const sources = await AiKnowledgeSource.find(query).sort({ createdAt: -1 });
  res.json(sources);
});

export const createKnowledge = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, name, content, type } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  // Generate placeholder semantic embedding vector (1536 float elements)
  const provider = AiProviderManager.getProvider("gemini");
  const embeddingVector = await provider.generateEmbedding(content);

  const source = await AiKnowledgeSource.create({
    websiteId: resolvedWebsiteId,
    name,
    content,
    type: type || "document",
    embeddingPlaceholder: embeddingVector
  });

  res.status(201).json(source);
});

// Observability Logs
export const listUsageLogs = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  const logs = await AiUsageLog.find(query).sort({ createdAt: -1 }).limit(100);
  res.json(logs);
});

// Agent execution core
export const runAgentQuery = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const { websiteId, queryText, promptName, executeToolCalls = true } = req.body;
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized scope", 403);
  }

  // Fetch model configs to determine provider drivers
  const config = await AiModelConfig.findOne({ websiteId: resolvedWebsiteId }) || { provider: "gemini", modelName: "gemini-1.5-flash" };
  const driver = AiProviderManager.getProvider(config.provider);

  // Load prompt library templates
  let systemPrompt = "";
  if (promptName) {
    const promptLib = await AiPrompt.findOne({ websiteId: resolvedWebsiteId, name: promptName, isActive: true });
    if (promptLib) systemPrompt = promptLib.promptText;
  }

  const fullPromptText = `${systemPrompt}\nUser Query: ${queryText}`;
  
  // Call LLM completion driver
  const result = await driver.generateCompletion({
    prompt: fullPromptText,
    temperature: config.temperature,
    maxTokens: config.maxTokens
  });

  // Log usage tokens
  await AiUsageLog.create({
    websiteId: resolvedWebsiteId,
    userId: req.user._id,
    promptName: promptName || "agent_chat",
    tokensPrompt: result.tokensPrompt,
    tokensCompletion: result.tokensCompletion,
    cost: result.cost,
    latencyMs: result.latencyMs,
    provider: config.provider
  });

  // Mock function call intent parsing (detect if response wants to create lead/ticket)
  let actionResult = null;
  if (executeToolCalls) {
    if (queryText.toLowerCase().includes("ticket")) {
      actionResult = await executeAgentToolCall(resolvedWebsiteId, "create_ticket", { subject: queryText }, req.user);
    } else if (queryText.toLowerCase().includes("lead") || queryText.toLowerCase().includes("contact")) {
      actionResult = await executeAgentToolCall(resolvedWebsiteId, "create_lead", { name: "AI Inbound Lead" }, req.user);
    }
  }

  res.json({
    text: result.text,
    provider: config.provider,
    cost: result.cost,
    latencyMs: result.latencyMs,
    actionTaken: actionResult
  });
});
