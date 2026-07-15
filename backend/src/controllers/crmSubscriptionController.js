import { Subscription } from "../models/Subscription.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { runSubscriptionBillingCron } from "../services/subscriptionCron.js";

export const listSubscriptions = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId } = req.query;

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

  if (customerId) query.customerId = customerId;

  const subs = await Subscription.find(query)
    .populate("planId", "name price billingCycle")
    .populate("customerId", "name email")
    .sort({ renewalDate: 1 });

  res.json(subs);
});

export const createSubscription = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId, planId, billingCycle, seats, durationMonths = 1 } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + durationMonths);

  const sub = await Subscription.create({
    websiteId: resolvedWebsiteId,
    customerId,
    planId,
    billingCycle: billingCycle || "monthly",
    seats: seats || 1,
    startDate,
    endDate,
    renewalDate: endDate,
    status: "active"
  });

  res.status(201).json(sub);
});

export const triggerBillingCron = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  await runSubscriptionBillingCron();
  res.json({ success: true, message: "Subscription billing cron executed successfully." });
});

export const updateSubscription = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const sub = await Subscription.findById(req.params.id);

  if (!sub) throw new AppError("Subscription not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(sub.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const updateData = { ...req.body };
  if (req.body.durationMonths) {
    const endDate = new Date(sub.startDate || new Date());
    endDate.setMonth(endDate.getMonth() + Number(req.body.durationMonths));
    updateData.endDate = endDate;
    updateData.renewalDate = endDate;
  }

  const updatedSub = await Subscription.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  res.json(updatedSub);
});

export const deleteSubscription = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const sub = await Subscription.findById(req.params.id);

  if (!sub) throw new AppError("Subscription not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(sub.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  await Subscription.findByIdAndDelete(req.params.id);
  res.json({ message: "Subscription deleted successfully" });
});
