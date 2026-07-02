import { CustomerSuccess } from "../models/CustomerSuccess.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

export const listSuccessProfiles = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json([]);
  }

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  const profiles = await CustomerSuccess.find(query)
    .populate("customerId", "name email")
    .populate("successManager", "name email")
    .sort({ healthScore: 1 });

  res.json(profiles);
});

export const createOrUpdateSuccessProfile = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized website scope", 403);
  }

  const profile = await CustomerSuccess.findOneAndUpdate(
    { websiteId: resolvedWebsiteId, customerId },
    { ...req.body, websiteId: resolvedWebsiteId },
    { new: true, upsert: true }
  );

  res.status(200).json(profile);
});

export const updateOnboardingChecklist = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { profileId, checklist } = req.body;

  const profile = await CustomerSuccess.findById(profileId);
  if (!profile) throw new AppError("Customer success profile not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(profile.websiteId.toString())) {
    throw new AppError("Unauthorized scope", 403);
  }

  profile.onboardingChecklist = {
    ...profile.onboardingChecklist,
    ...checklist
  };

  // If all checklist items are completed, set onboardingStatus to completed
  const checklistObj = profile.onboardingChecklist;
  const isAllDone = checklistObj.workspaceCreated && checklistObj.adminInvited &&
                    checklistObj.usersAdded && checklistObj.dataImported &&
                    checklistObj.trainingCompleted && checklistObj.goLive;
                    
  if (isAllDone) {
    profile.onboardingStatus = "completed";
  } else {
    profile.onboardingStatus = "in_progress";
  }

  await profile.save();
  res.json(profile);
});
