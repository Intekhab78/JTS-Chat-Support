import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { FollowUpTask } from "../models/FollowUpTask.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";

/**
 * Get sales-focused analytics for the current user (if sales) or team (if manager/admin)
 */
export const getSalesPerformanceStats = asyncHandler(async (req, res) => {
  const isSales = req.user.role === "sales";
  const { websiteId } = req.query;
  const rawWebsiteIds = websiteId ? [websiteId] : await getOwnedWebsiteIds(req.user);
  
  // Build ObjectId + string list for Mongo matching
  const websiteFilterList = [];
  rawWebsiteIds.forEach(id => {
    if (!id) return;
    websiteFilterList.push(id.toString());
    if (mongoose.Types.ObjectId.isValid(id)) {
      websiteFilterList.push(new mongoose.Types.ObjectId(id));
    }
  });

  // Base filter for leads
  const filter = { 
    websiteId: { $in: websiteFilterList },
    archivedAt: null 
  };
  
  // If sales, try matching ownerId or owner email
  if (isSales && req.user?._id) {
    const ownerList = [req.user._id.toString()];
    if (mongoose.Types.ObjectId.isValid(req.user._id)) {
      ownerList.push(new mongoose.Types.ObjectId(req.user._id));
    }
    filter.$or = [
      { ownerId: { $in: ownerList } },
      { "owner.email": req.user.email }
    ];
  }

  // 1. Pipeline Breakdown & Total Value
  let pipelineStats = await Customer.aggregate([
    { $match: filter },
    { $group: {
        _id: "$pipelineStage",
        count: { $sum: 1 },
        totalValue: { $sum: "$leadValue" }
      }
    }
  ]);

  // Fallback: If sales filter produced 0 leads, load website-wide leads
  if (isSales && pipelineStats.length === 0) {
    delete filter.$or;
    pipelineStats = await Customer.aggregate([
      { $match: filter },
      { $group: {
          _id: "$pipelineStage",
          count: { $sum: 1 },
          totalValue: { $sum: "$leadValue" }
        }
      }
    ]);
  }

  // 2. Activity Volume (Last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const interactionStats = await Customer.aggregate([
    { $match: filter },
    { $unwind: "$internalNotes" },
    { $match: { 
        "internalNotes.createdAt": { $gte: thirtyDaysAgo },
        "internalNotes.type": { $in: ["call", "meeting", "manual_email"] }
      } 
    },
    { $group: {
        _id: "$internalNotes.type",
        count: { $sum: 1 }
      }
    }
  ]);

  // 3. Lead Source Breakdown
  const sourceStats = await Customer.aggregate([
    { $match: filter },
    { $group: {
        _id: "$leadSource",
        count: { $sum: 1 },
        totalValue: { $sum: "$leadValue" }
      }
    },
    { $sort: { totalValue: -1 } },
    { $limit: 5 }
  ]);

  // 4. Task Productivity
  const taskStats = await FollowUpTask.aggregate([
    { $match: { 
        customerId: { $in: await Customer.find(filter).distinct("_id") },
        status: { $in: ["open", "in_progress", "completed"] }
      } 
    },
    { $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  // 5. High Value Leads (Top 5)
  const topLeads = await Customer.find(filter)
    .sort({ leadValue: -1 })
    .limit(5)
    .select("name companyName leadValue pipelineStage priority");

  // Summary Totals
  const totalLeads = pipelineStats.reduce((sum, s) => sum + s.count, 0);
  const totalPipelineValue = pipelineStats.reduce((sum, s) => sum + s.totalValue, 0);
  const wonStats = pipelineStats.find(s => s._id === "won");
  const wonRevenue = wonStats ? wonStats.totalValue : 0;
  const lostReasonStats = await Customer.aggregate([
    { $match: { ...filter, pipelineStage: "lost", lostReason: { $nin: ["", null] } } },
    { $group: { _id: "$lostReason", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  
  res.json({
    summary: {
      totalLeads,
      totalPipelineValue,
      wonRevenue,
      averageDealSize: totalLeads > 0 ? Math.round(totalPipelineValue / totalLeads) : 0,
      conversionRate: totalLeads > 0 ? Number(((wonStats?.count || 0) / totalLeads * 100).toFixed(1)) : 0
    },
    pipeline: pipelineStats,
    interactions: interactionStats,
    sources: sourceStats,
    tasks: taskStats,
    lostReasons: lostReasonStats,
    topLeads
  });
});
