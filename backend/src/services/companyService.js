import * as companyRepository from "../repositories/companyRepository.js";
import { logCrmActivity } from "./activityLoggerService.js";
import AppError from "../utils/AppError.js";

export const getCompaniesList = async (query, { page = 1, limit = 20, populate = ["ownerId"] } = {}) => {
  const skip = (page - 1) * limit;
  const companies = await companyRepository.find(query, { skip, limit, populate });
  const total = await companyRepository.count(query);
  return {
    companies,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  };
};

export const getCompany = async (id, populate = ["ownerId"]) => {
  const company = await companyRepository.findById(id, populate);
  if (!company) {
    throw new AppError("Company not found", 404);
  }
  return company;
};

export const createCompany = async (data, actorId) => {
  if (!data.companyName) {
    throw new AppError("Company name is required", 400);
  }
  const company = await companyRepository.create({
    ...data,
    ownerId: data.ownerId || actorId
  });

  await logCrmActivity({
    websiteId: company.websiteId,
    type: "note",
    title: "Company Registered",
    description: `Company "${company.companyName}" was created.`,
    companyId: company._id,
    ownerId: actorId
  });

  return company;
};

export const updateCompany = async (id, data, actorId) => {
  const company = await companyRepository.findById(id);
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  const updated = await companyRepository.update(id, data);

  await logCrmActivity({
    websiteId: updated.websiteId,
    type: "note",
    title: "Company Updated",
    description: `Company details for "${updated.companyName}" were updated.`,
    companyId: updated._id,
    ownerId: actorId
  });

  return updated;
};

export const deleteCompany = async (id, actorId) => {
  const company = await companyRepository.findById(id);
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  await companyRepository.softDelete(id);

  await logCrmActivity({
    websiteId: company.websiteId,
    type: "note",
    title: "Company Archived",
    description: `Company "${company.companyName}" was archived (soft-deleted).`,
    companyId: company._id,
    ownerId: actorId
  });

  return { message: "Company deleted successfully" };
};
