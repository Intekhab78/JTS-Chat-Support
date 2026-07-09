import * as dealRepository from "../repositories/dealRepository.js";
import { logCrmActivity } from "./activityLoggerService.js";
import AppError from "../utils/AppError.js";

export const getDealsList = async (query, { page = 1, limit = 20, populate = ["companyId", "primaryContactId", "ownerId"] } = {}) => {
  const skip = (page - 1) * limit;
  const deals = await dealRepository.find(query, { skip, limit, populate });
  const total = await dealRepository.count(query);
  return {
    deals,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  };
};

export const getDeal = async (id, populate = ["companyId", "primaryContactId", "contacts", "ownerId"]) => {
  const deal = await dealRepository.findById(id, populate);
  if (!deal) {
    throw new AppError("Deal not found", 404);
  }
  return deal;
};

export const createDeal = async (data, actorId) => {
  if (!data.dealName) {
    throw new AppError("Deal name is required", 400);
  }

  // Validate win/loss reasons
  if ((data.stage === "won" && !data.winReason) || (data.stage === "lost" && !data.lostReason)) {
    throw new AppError(`A reason is required when deal is marked as ${data.stage}.`, 400);
  }

  const deal = await dealRepository.create({
    ...data,
    ownerId: data.ownerId || actorId
  });

  await logCrmActivity({
    websiteId: deal.websiteId,
    type: "deal_created",
    title: "Deal Created",
    description: `New standalone sales deal "${deal.dealName}" created with forecast value ${deal.dealValue}.`,
    dealId: deal._id,
    customerId: deal.customerId || null,
    ownerId: actorId
  });

  return deal;
};

export const updateDeal = async (id, data, actorId) => {
  const deal = await dealRepository.findById(id);
  if (!deal) {
    throw new AppError("Deal not found", 404);
  }

  const previousStage = deal.stage;
  const newStage = data.stage || deal.stage;

  // Validate reasons on update
  if ((newStage === "won" && !data.winReason && !deal.winReason) || (newStage === "lost" && !data.lostReason && !deal.lostReason)) {
    throw new AppError(`A reason is required when deal is marked as ${newStage}.`, 400);
  }

  const updated = await dealRepository.update(id, data);

  if (previousStage !== updated.stage) {
    await logCrmActivity({
      websiteId: deal.websiteId,
      type: "stage_changed",
      title: "Deal Stage Progressed",
      description: `Deal "${updated.dealName}" stage changed from "${previousStage}" to "${updated.stage}".`,
      dealId: updated._id,
      ownerId: actorId
    });
  } else {
    await logCrmActivity({
      websiteId: deal.websiteId,
      type: "deal_updated",
      title: "Deal Updated",
      description: `Deal details updated for "${updated.dealName}".`,
      dealId: updated._id,
      ownerId: actorId
    });
  }

  return updated;
};

export const deleteDeal = async (id, actorId) => {
  const deal = await dealRepository.findById(id);
  if (!deal) {
    throw new AppError("Deal not found", 404);
  }

  await dealRepository.softDelete(id);

  await logCrmActivity({
    websiteId: deal.websiteId,
    type: "deal_updated",
    title: "Deal Archived",
    description: `Deal "${deal.dealName}" was archived (soft-deleted).`,
    dealId: deal._id,
    ownerId: actorId
  });

  return { message: "Deal deleted successfully" };
};
