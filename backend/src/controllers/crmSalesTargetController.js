import { SalesTarget } from "../models/SalesTarget.js";
import { Customer } from "../models/Customer.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

// List all sales targets for a website (overall & individual agent ones) with calculated actual progress
export const listTargets = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const { websiteId, year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

  if (!websiteId) {
    throw new AppError("websiteId query parameter is required", 400);
  }

  // Fetch targets for this website, year, and month
  const targets = await SalesTarget.find({
    websiteId,
    year: Number(year),
    month: Number(month)
  }).populate("ownerId", "name email role");

  const startOfMonth = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

  // Compute live achievements for each target
  const enrichedTargets = await Promise.all(
    targets.map(async (target) => {
      const matchQuery = {
        websiteId,
        pipelineStage: "won",
        updatedAt: { $gte: startOfMonth, $lte: endOfMonth },
        archivedAt: null
      };

      if (target.ownerId) {
        matchQuery.ownerId = target.ownerId._id || target.ownerId;
      }

      const wonCustomers = await Customer.find(matchQuery).select("leadValue");
      const achievedValue = wonCustomers.reduce((sum, c) => sum + (c.leadValue || 0), 0);
      const achievedCount = wonCustomers.length;

      const doc = target.toObject();
      doc.achievedValue = achievedValue;
      doc.achievedCount = achievedCount;
      return doc;
    })
  );

  // Also calculate overall website actual value (even if website target is not set yet)
  const websiteMatchQuery = {
    websiteId,
    pipelineStage: "won",
    updatedAt: { $gte: startOfMonth, $lte: endOfMonth },
    archivedAt: null
  };
  const allWonCustomers = await Customer.find(websiteMatchQuery).select("leadValue");
  const overallAchievedValue = allWonCustomers.reduce((sum, c) => sum + (c.leadValue || 0), 0);
  const overallAchievedCount = allWonCustomers.length;

  res.json({
    targets: enrichedTargets,
    overall: {
      achievedValue: overallAchievedValue,
      achievedCount: overallAchievedCount
    }
  });
});

// Create or update a sales target (admin/manager restriction can be enforced)
export const saveTarget = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  
  const { websiteId, ownerId = null, targetValue, targetCount = 0, period = "monthly", month, year } = req.body;

  if (!websiteId || !month || !year || targetValue === undefined) {
    throw new AppError("websiteId, month, year, and targetValue are required fields", 400);
  }

  // Find or create sales target
  const filter = {
    websiteId,
    ownerId: ownerId || null,
    period,
    month: Number(month),
    year: Number(year)
  };

  const update = {
    targetValue: Number(targetValue),
    targetCount: Number(targetCount),
    createdBy: req.user._id
  };

  const target = await SalesTarget.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true,
    runValidators: true
  }).populate("ownerId", "name email role");

  res.json({
    success: true,
    target
  });
});

// Delete a sales target configuration
export const deleteTarget = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { id } = req.params;

  const target = await SalesTarget.findByIdAndDelete(id);
  if (!target) {
    throw new AppError("Sales target configuration not found", 404);
  }

  res.json({
    success: true,
    message: "Sales target deleted successfully"
  });
});
