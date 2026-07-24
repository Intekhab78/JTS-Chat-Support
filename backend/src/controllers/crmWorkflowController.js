import { Customer } from "../models/Customer.js";
import { FollowUpTask } from "../models/FollowUpTask.js";
import { Workflow } from "../models/Workflow.js";
import { WorkflowExecution } from "../models/WorkflowExecution.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { incrementCustomers, addWonRevenue, recordConversionTime } from "../services/analyticsService.js";
import { sendCrmLifecycleEmail, autoAssignLeadOwner } from "../services/automationService.js";
import { executeWorkflowBackground } from "../services/workflowExecutor.js";
import {
  createAndEmitCrmNotification,
  emitCustomerActivity,
  getPurchaseRecipientsForWebsite,
  buildCustomerPayload
} from "../utils/crmUtils.js";
import { logAuditEvent } from "../services/auditService.js";
import { PURCHASE_WORKFLOW_STEPS, advancePurchaseWorkflow } from "../services/purchaseWorkflowService.js";

export const postWin = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const id = req.params.id;
  const customer = await Customer.findById(id);
  if (!customer) throw new AppError("CRM record not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(String).includes(String(customer.websiteId))) {
    throw new AppError("Access denied", 403);
  }

  if (customer.pipelineStage === "won") return res.json(await buildCustomerPayload(customer._id));

  const previousStage = customer.pipelineStage;
  customer.pipelineStage = "won";
  customer.status = "won";
  customer.dealStage = "won";
  customer.recordType = "customer";
  customer.probability = 100;
  customer.stageEnteredAt = new Date();
  await customer.save();

  await sendCrmStageChangeEmail(customer, previousStage, "won");

  // Create onboarding follow-up tasks
  const onboardingTitles = ["Send welcome email", "Schedule onboarding call", "Create customer account"];
  for (const title of onboardingTitles) {
    await FollowUpTask.create({
      websiteId: customer.websiteId, customerId: customer._id, ownerId: customer.ownerId || req.user._id,
      title, priority: "high", dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), type: "follow_up"
    });
  }

  await incrementCustomers(customer.websiteId);
  await addWonRevenue(customer.websiteId, customer.leadValue || 0);
  
  res.json(await buildCustomerPayload(customer._id));
});

export const unlockLead = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("Customer not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(String).includes(String(customer.websiteId))) {
    throw new AppError("Access denied", 403);
  }

  // Reset lock and purchase workflow
  customer.isLocked = false;
  customer.generatedCode = null;
  customer.purchaseWorkflowStatus = null;
  customer.purchaseRequestedAt = null;

  // Move back to negotiation so they can choose next step
  customer.pipelineStage = "negotiation";
  customer.status = "negotiation";
  customer.dealStage = "negotiation";
  customer.recordType = "lead";
  customer.probability = 75;
  customer.stageEnteredAt = new Date();

  await customer.save();

  await logAuditEvent({
    websiteId: customer.websiteId,
    actor: req.user._id,
    action: "lead_unlocked",
    resource: "Customer",
    resourceId: customer._id,
    details: { message: "Lead unlocked and moved back to Negotiation stage." }
  });

  res.json(await buildCustomerPayload(customer._id));
});

import { Quotation } from "../models/Quotation.js";

export const generateLeadCode = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("Customer not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(String).includes(String(customer.websiteId))) {
    throw new AppError("Access denied", 403);
  }

  if (customer.isLocked) return res.json(customer);

  // Require at least 1 digital quotation before code generation
  const quoteCount = await Quotation.countDocuments({ customerId: customer._id });
  if (quoteCount === 0) {
    throw new AppError("A Digital Quotation must be created before generating code for this deal.", 400);
  }

  const code = `WON-${customer.crn}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  customer.isLocked = true;
  customer.generatedCode = code;
  customer.purchaseWorkflowStatus = "new";
  customer.purchaseRequestedAt = new Date();
  await customer.save();

  const purchaseRecipients = await getPurchaseRecipientsForWebsite(customer.websiteId, req.user.managerId);
  await Promise.all(purchaseRecipients.map(recipient => createAndEmitCrmNotification({
    recipient, type: "purchase_request_created", title: "New purchase request",
    message: `${customer.name} is ready for purchase.`, link: `/purchase?tab=requests`
  })));

  res.json(customer);
});

export const autoAssignCustomer = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_AUTO_ASSIGN);
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("Customer not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(String).includes(String(customer.websiteId))) {
    throw new AppError("Access denied", 403);
  }

  const autoOwner = await autoAssignLeadOwner(customer, { assignedBy: req.user._id, reason: "manual_auto_assign" });
  if (autoOwner) customer.ownerId = autoOwner._id;
  await customer.save();
  res.json(customer);
});

export const updatePurchaseWorkflowStatus = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { status } = req.body;
  if (!PURCHASE_WORKFLOW_STEPS.includes(status)) {
    throw new AppError("Invalid purchase workflow status.", 400);
  }

  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new AppError("CRM record not found", 404);

  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  if (!ownedWebsiteIds.map(String).includes(String(customer.websiteId))) {
    throw new AppError("Access denied", 403);
  }

  const updated = await advancePurchaseWorkflow({
    customerId: customer._id,
    status,
    actor: req.user,
    reason: "manual_update"
  });
  res.json(updated);
});

// Automation Workflows List CRUD APIs
export const listWorkflows = asyncHandler(async (req, res) => {
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

  const workflows = await Workflow.find(query).sort({ createdAt: -1 });
  res.json(workflows);
});

export const createWorkflow = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized website scope", 403);
  }

  const workflow = await Workflow.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  res.status(201).json(workflow);
});

export const updateWorkflow = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const workflow = await Workflow.findById(req.params.id);

  if (!workflow) throw new AppError("Workflow not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(workflow.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const updated = await Workflow.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

export const deleteWorkflow = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const workflow = await Workflow.findById(req.params.id);

  if (!workflow) throw new AppError("Workflow not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(workflow.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  await Workflow.findByIdAndDelete(req.params.id);
  res.json({ message: "Workflow deleted successfully" });
});

export const listExecutions = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, workflowId } = req.query;

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (workflowId) query.workflowId = workflowId;

  const executions = await WorkflowExecution.find(query)
    .populate("workflowId", "name trigger")
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(executions);
});

export const triggerWorkflowManually = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const workflow = await Workflow.findById(req.params.id);

  if (!workflow) throw new AppError("Workflow not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(workflow.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  // Launch execution thread in the background
  executeWorkflowBackground(workflow, req.body.payload || {}).catch(console.error);

  res.json({ success: true, message: "Manual workflow trigger initialized." });
});
