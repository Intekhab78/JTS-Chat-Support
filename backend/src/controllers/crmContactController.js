import { Contact } from "../models/Contact.js";
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
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access to this website's data", 403);
    }
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

  const contacts = await Contact.find(query)
    .populate("companyId", "companyName")
    .populate("ownerId", "name email role")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Contact.countDocuments(query);

  res.json({
    contacts,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

export const getContactDetails = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const contact = await Contact.findById(req.params.id)
    .populate("companyId", "companyName")
    .populate("ownerId", "name email role");

  if (!contact) throw new AppError("Contact not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(contact.websiteId.toString())) {
    throw new AppError("Unauthorized access to this contact's data", 403);
  }

  res.json(contact);
});

export const createContact = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, firstName, lastName } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const contact = await Contact.create({
    ...req.body,
    websiteId: resolvedWebsiteId,
    ownerId: req.body.ownerId || req.user._id
  });

  res.status(201).json(contact);
});

export const updateContact = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const contact = await Contact.findById(req.params.id);

  if (!contact) throw new AppError("Contact not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(contact.websiteId.toString())) {
    throw new AppError("Unauthorized access to this contact's data", 403);
  }

  const updated = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

export const deleteContact = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const contact = await Contact.findById(req.params.id);

  if (!contact) throw new AppError("Contact not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(contact.websiteId.toString())) {
    throw new AppError("Unauthorized access to this contact's data", 403);
  }

  await Contact.findByIdAndDelete(req.params.id);
  res.json({ message: "Contact deleted successfully" });
});
