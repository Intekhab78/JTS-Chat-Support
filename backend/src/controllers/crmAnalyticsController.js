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
