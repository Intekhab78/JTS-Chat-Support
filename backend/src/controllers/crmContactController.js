import * as contactService from "../services/contactService.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

export const listContacts = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { search, websiteId, companyId, page = 1, limit = 20 } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json({ contacts: [], pagination: { total: 0, page: 1, pages: 0 } });
  }

  const query = {};
  if (websiteId && ownedWebsiteIds.map(id => id.toString()).includes(websiteId.toString())) {
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (companyId) {
    query.companyId = companyId;
  }

  if (search) {
    query.$or = [
      { firstName: new RegExp(search, "i") },
      { lastName: new RegExp(search, "i") },
      { displayName: new RegExp(search, "i") },
      { email: new RegExp(search, "i") }
    ];
  }

  const result = await contactService.getContactsList(query, {
    page: parseInt(page),
    limit: parseInt(limit)
  });

  res.json(result);
});

export const getContactDetails = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const contact = await contactService.getContact(req.params.id);

  if (!ownedWebsiteIds.map(id => id.toString()).includes(contact.websiteId.toString())) {
    throw new AppError("Unauthorized access to this contact's data", 403);
  }

  res.json(contact);
});

export const createContact = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const contact = await contactService.createContact(
    { ...req.body, websiteId: resolvedWebsiteId },
    req.user._id
  );

  res.status(201).json(contact);
});

export const updateContact = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const contact = await contactService.getContact(req.params.id);

  if (!ownedWebsiteIds.map(id => id.toString()).includes(contact.websiteId.toString())) {
    throw new AppError("Unauthorized access to this contact's data", 403);
  }

  const updated = await contactService.updateContact(req.params.id, req.body, req.user._id);
  res.json(updated);
});

export const deleteContact = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const contact = await contactService.getContact(req.params.id);

  if (!ownedWebsiteIds.map(id => id.toString()).includes(contact.websiteId.toString())) {
    throw new AppError("Unauthorized access to this contact's data", 403);
  }

  const response = await contactService.deleteContact(req.params.id, req.user._id);
  res.json(response);
});
