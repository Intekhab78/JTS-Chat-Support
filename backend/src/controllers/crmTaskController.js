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
  const tasks = await FollowUpTask.find({ ownerId: req.user._id })
    .populate("customerId", "name email crn status")
    .sort({ dueAt: 1 });
  res.json(tasks);
});

export const updateFollowUpTask = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_MANAGE_TASKS);
  const task = await FollowUpTask.findById(req.params.taskId);
  if (req.body.status === "completed") {
    task.status = "completed";
    task.completedAt = new Date();
    task.completedBy = req.user._id;
  }
  await task.save();
  res.json(task);
});

export const deleteFollowUpTask = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_MANAGE_TASKS);
  const task = await FollowUpTask.findById(req.params.taskId);
  if (!task) throw new AppError("Task not found", 404);
  await task.deleteOne();
  res.json({ success: true });
});
