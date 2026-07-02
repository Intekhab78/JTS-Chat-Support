import { Pipeline } from "../models/Pipeline.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

export const listPipelines = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json([]);
  }

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access to this website's pipelines", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  const pipelines = await Pipeline.find(query).sort({ isDefault: -1, createdAt: -1 });
  res.json(pipelines);
});

export const createPipeline = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.SETTINGS_MANAGE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, name, stages } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  // If set to default, unset other defaults for this website
  if (req.body.isDefault) {
    await Pipeline.updateMany({ websiteId: resolvedWebsiteId }, { isDefault: false });
  }

  const pipeline = await Pipeline.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  res.status(201).json(pipeline);
});

export const updatePipeline = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.SETTINGS_MANAGE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const pipeline = await Pipeline.findById(req.params.id);

  if (!pipeline) throw new AppError("Pipeline not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(pipeline.websiteId.toString())) {
    throw new AppError("Unauthorized access to this pipeline's data", 403);
  }

  if (req.body.isDefault) {
    await Pipeline.updateMany({ websiteId: pipeline.websiteId }, { isDefault: false });
  }

  const updated = await Pipeline.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

export const deletePipeline = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.SETTINGS_MANAGE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const pipeline = await Pipeline.findById(req.params.id);

  if (!pipeline) throw new AppError("Pipeline not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(pipeline.websiteId.toString())) {
    throw new AppError("Unauthorized access to this pipeline's data", 403);
  }

  if (pipeline.isDefault) {
    throw new AppError("Cannot delete the default pipeline", 400);
  }

  await Pipeline.findByIdAndDelete(req.params.id);
  res.json({ message: "Pipeline deleted successfully" });
});
