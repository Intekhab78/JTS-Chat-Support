import { Customer } from "../models/Customer.js";
import { Quotation } from "../models/Quotation.js";
import { FollowUpTask } from "../models/FollowUpTask.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { incrementCustomers, addWonRevenue, recordConversionTime } from "../services/analyticsService.js";
import { sendCrmLifecycleEmail, autoAssignLeadOwner } from "../services/automationService.js";
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

  if (customer.pipelineStage === "won") return res.json(await buildCustomerPayload(customer._id));

  customer.pipelineStage = "won";
  customer.status = "won";
  customer.dealStage = "won";
  customer.recordType = "customer";
  customer.probability = 100;
  customer.stageEnteredAt = new Date();
  await customer.save();

  // Create draft quotation
  await Quotation.create({
    customerId: customer._id, websiteId: customer.websiteId, createdBy: req.user._id,
    status: "draft", amount: Number(customer.leadValue || 0), currency: "INR"
  });

  // Create onboarding tasks
  const onboardingTitles = ["Welcome email", "Schedule onboarding call", "Create account"];
  for (const title of onboardingTitles) {
    await FollowUpTask.create({
      websiteId: customer.websiteId, customerId: customer._id, ownerId: customer.ownerId || req.user._id,
      title, priority: "high", dueAt: new Date(), type: "onboarding"
    });
  }

  await incrementCustomers(customer.websiteId);
  await addWonRevenue(customer.websiteId, customer.leadValue || 0);
  
  res.json(await buildCustomerPayload(customer._id));
});

export const generateLeadCode = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const customer = await Customer.findById(req.params.id);
  if (customer.isLocked) return res.json(customer);

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

  const updated = await advancePurchaseWorkflow({
    customerId: customer._id,
    status,
    actor: req.user,
    reason: "manual_update"
  });
  res.json(updated);
});
