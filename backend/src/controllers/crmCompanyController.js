import * as companyService from "../services/companyService.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

export const listCompanies = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { search, websiteId, page = 1, limit = 20 } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json({ companies: [], pagination: { total: 0, page: 1, pages: 0 } });
  }

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access to this website's data", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (search) {
    query.companyName = new RegExp(search, "i");
  }

  const result = await companyService.getCompaniesList(query, {
    page: parseInt(page),
    limit: parseInt(limit)
  });

  res.json(result);
});

export const getCompanyDetails = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const company = await companyService.getCompany(req.params.id);

  if (!ownedWebsiteIds.map(id => id.toString()).includes(company.websiteId.toString())) {
    throw new AppError("Unauthorized access to this company's data", 403);
  }

  res.json(company);
});

export const createCompany = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const company = await companyService.createCompany(
    { ...req.body, websiteId: resolvedWebsiteId },
    req.user._id
  );

  res.status(201).json(company);
});

export const updateCompany = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const company = await companyService.getCompany(req.params.id);

  if (!ownedWebsiteIds.map(id => id.toString()).includes(company.websiteId.toString())) {
    throw new AppError("Unauthorized access to this company's data", 403);
  }

  const updated = await companyService.updateCompany(req.params.id, req.body, req.user._id);
  res.json(updated);
});

export const deleteCompany = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const company = await companyService.getCompany(req.params.id);

  if (!ownedWebsiteIds.map(id => id.toString()).includes(company.websiteId.toString())) {
    throw new AppError("Unauthorized access to this company's data", 403);
  }

  const response = await companyService.deleteCompany(req.params.id, req.user._id);
  res.json(response);
});
