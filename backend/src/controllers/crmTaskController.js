import { FollowUpTask } from "../models/FollowUpTask.js";
import { Customer } from "../models/Customer.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { emitCustomerActivity, createAndEmitCrmNotification } from "../utils/crmUtils.js";

export const createFollowUpTask = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_MANAGE_TASKS);
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("Customer not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(String).includes(String(customer.websiteId))) {
    throw new AppError("Access denied", 403);
  }

  const task = await FollowUpTask.create({
    customerId: customer._id, websiteId: customer.websiteId,
    ownerId: req.body.ownerId || req.user._id, createdBy: req.user._id,
    type: req.body.type, title: req.body.title, dueAt: new Date(req.body.dueAt)
  });

  await emitCustomerActivity({
    actor: req.user, websiteId: customer.websiteId, customerId: customer._id,
    type: "task_created", summary: `Task created: ${task.title}`
  });

  res.status(201).json(task);
});

export const getMyFollowUpTasks = asyncHandler(async (req, res) => {
  const query = {};

  // Website scoping
  if (req.query.websiteId) {
    query.websiteId = req.query.websiteId;
  } else {
    // Scope to websites the user owns/belongs to
    const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
    if (ownedWebsiteIds.length > 0) {
      query.websiteId = { $in: ownedWebsiteIds };
    }
  }

  if (req.query.customerId) {
    query.customerId = req.query.customerId;
  } else {
    const isRestricted = ["sales", "agent"].includes(req.user.role);
    if (isRestricted && req.query.all !== "true") {
      query.ownerId = req.user._id;
    } else if (req.query.ownerId) {
      query.ownerId = req.query.ownerId;
    }
  }

  if (req.query.status) {
    query.status = req.query.status;
  }

  const tasks = await FollowUpTask.find(query)
    .populate("customerId", "name email crn status websiteId companyName")
    .populate("ownerId", "name email role")
    .populate("createdBy", "name")
    .sort({ dueAt: 1 });
  res.json(tasks);
});

export const updateFollowUpTask = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_MANAGE_TASKS);
  const task = await FollowUpTask.findById(req.params.taskId);
  if (!task) throw new AppError("Task not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(String).includes(String(task.websiteId))) {
    throw new AppError("Access denied", 403);
  }

  if (req.body.title) task.title = req.body.title;
  if (req.body.type) task.type = req.body.type;
  if (req.body.dueAt) task.dueAt = new Date(req.body.dueAt);
  if (req.body.ownerId) task.ownerId = req.body.ownerId;
  if (req.body.status) {
    task.status = req.body.status;
    if (req.body.status === "completed") {
      task.completedAt = new Date();
      task.completedBy = req.user._id;
    }
  }
  await task.save();
  res.json(task);
});

export const deleteFollowUpTask = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_MANAGE_TASKS);
  const task = await FollowUpTask.findById(req.params.taskId);
  if (!task) throw new AppError("Task not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(String).includes(String(task.websiteId))) {
    throw new AppError("Access denied", 403);
  }

  await task.deleteOne();
  res.json({ success: true });
});
