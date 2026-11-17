import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { Invoice } from "../models/Invoice.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";

function resolveScopedWebsiteMatch(ownedWebsiteIds, websiteId) {
  const ownedIds = (ownedWebsiteIds || []).map((id) => new mongoose.Types.ObjectId(id));
  if (!websiteId) return { $in: ownedIds };
  if (!mongoose.Types.ObjectId.isValid(String(websiteId))) {
    throw new AppError("Invalid websiteId.", 400);
  }
  const allowed = ownedIds.some((id) => id.toString() === String(websiteId));
  if (!allowed) {
    throw new AppError("Unauthorized access to this website's analytics.", 403);
  }
  return new mongoose.Types.ObjectId(websiteId);
}

export const getCrmSummary = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = req.ownedWebsiteIds?.length
    ? req.ownedWebsiteIds
    : await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;
  const scopedWebsite = resolveScopedWebsiteMatch(ownedWebsiteIds, websiteId);

  const [agg] = await Customer.aggregate([
    {
      $match: {
        websiteId: scopedWebsite,
        isAnonymous: { $ne: true },
        name: { $nin: ["Anonymous Visitor", "Anonymous", "Visitor"] }
      }
    },
    {
      $group: {
        _id: null,
        totalLeads: { $sum: 1 },
        pipelineValue: {
          $sum: {
            $cond: [{ $ne: ["$pipelineStage", "lost"] }, { $ifNull: ["$leadValue", 0] }, 0]
          }
        },
        wonDeals: {
          $sum: { $cond: [{ $eq: ["$pipelineStage", "won"] }, 1, 0] }
        },
        wonValue: {
          $sum: {
            $cond: [{ $eq: ["$pipelineStage", "won"] }, { $ifNull: ["$leadValue", 0] }, 0]
          }
        }
      }
    }
  ]);

  res.json({
    pipelineValue: agg?.pipelineValue || 0,
    totalLeads: agg?.totalLeads || 0,
    wonDeals: agg?.wonDeals || 0,
    wonValue: agg?.wonValue || 0
  });
});

export const getCrmReports = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, startDate, endDate } = req.query;
  const match = {
    websiteId: resolveScopedWebsiteMatch(ownedWebsiteIds, websiteId),
    pipelineStage: "won"
  };
  if (startDate || endDate) match.updatedAt = { $gte: new Date(startDate || 0), $lte: new Date(endDate || Date.now()) };

  const agg = await Customer.aggregate([
    { $match: match },
    { $group: { _id: null, totalRevenue: { $sum: "$leadValue" }, deals: { $sum: 1 } } }
  ]);
  res.json(agg[0] || { totalRevenue: 0, deals: 0 });
});

export const getWonRevenueTimeseries = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, days = 30 } = req.query;
  const start = new Date();
  start.setDate(start.getDate() - Number(days || 30));

  const agg = await Invoice.aggregate([
    {
      $match: {
        websiteId: resolveScopedWebsiteMatch(ownedWebsiteIds, websiteId),
        status: "paid",
        issuedAt: { $gte: start }
      }
    },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$issuedAt" } }, revenue: { $sum: "$total" } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ series: agg });
});
