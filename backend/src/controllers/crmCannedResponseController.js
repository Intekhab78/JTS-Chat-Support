import { CannedResponse } from "../models/CannedResponse.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

export const listCannedResponses = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, category } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json([]);
  }

  const query = {};
  if (websiteId && websiteId !== "all") {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (category) query.category = category;

  const replies = await CannedResponse.find(query).sort({ shortcut: 1 });
  res.json(replies);
});

export const createCannedResponse = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId && websiteId !== "all" ? websiteId : null;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized website scope", 403);
  }

  const reply = await CannedResponse.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  res.status(201).json(reply);
});

export const updateCannedResponse = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_EDIT);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const reply = await CannedResponse.findById(req.params.id);

  if (!reply) throw new AppError("Canned response not found", 404);
  if (reply.websiteId && !ownedWebsiteIds.map(id => id.toString()).includes(reply.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const { shortcut, text, content, title, category, visibility, tags } = req.body;
  if (shortcut !== undefined) reply.shortcut = shortcut;
  if (text !== undefined) {
    reply.text = text;
    reply.content = text;
  } else if (content !== undefined) {
    reply.content = content;
    reply.text = content;
  }
  if (title !== undefined) reply.title = title;
  if (category !== undefined) reply.category = category;
  if (visibility !== undefined) reply.visibility = visibility;
  if (tags !== undefined) reply.tags = tags;

  await reply.save();
  res.json(reply);
});

export const deleteCannedResponse = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const reply = await CannedResponse.findById(req.params.id);

  if (!reply) throw new AppError("Canned response not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(reply.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  await CannedResponse.findByIdAndDelete(req.params.id);
  res.json({ message: "Canned response deleted successfully" });
});
