import { Customer } from "../models/Customer.js";
import { Invoice } from "../models/Invoice.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";

export const getCrmReports = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, startDate, endDate } = req.query;
  const match = { websiteId: { $in: ownedWebsiteIds }, pipelineStage: "won" };
  if (websiteId) match.websiteId = websiteId;
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
  start.setDate(start.getDate() - days);

  const agg = await Invoice.aggregate([
    { $match: { websiteId: websiteId || { $in: ownedWebsiteIds }, status: "paid", issuedAt: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$issuedAt" } }, revenue: { $sum: "$total" } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ series: agg });
});
