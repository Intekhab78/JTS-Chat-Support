import * as contactRepository from "../repositories/contactRepository.js";
import { logCrmActivity } from "./activityLoggerService.js";
import AppError from "../utils/AppError.js";

export const getContactsList = async (query, { page = 1, limit = 20, populate = ["companyId", "ownerId"] } = {}) => {
  const skip = (page - 1) * limit;
  const contacts = await contactRepository.find(query, { skip, limit, populate });
  const total = await contactRepository.count(query);
  return {
    contacts,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  };
};

export const getContact = async (id, populate = ["companyId", "ownerId"]) => {
  const contact = await contactRepository.findById(id, populate);
  if (!contact) {
    throw new AppError("Contact not found", 404);
  }
  return contact;
};

export const createContact = async (data, actorId) => {
  if (!data.firstName || !data.lastName) {
    throw new AppError("First name and Last name are required", 400);
  }

  // Backward compatibility: sync single email field with emails[0]
  let emailValue = data.email || "";
  let emailsArray = data.emails || [];
  if (emailsArray.length > 0 && !emailValue) {
    emailValue = emailsArray[0];
  } else if (emailValue && emailsArray.length === 0) {
    emailsArray = [emailValue];
  }

  // Manage primary contact: if this contact is marked primary, unset others in the same company
  if (data.isPrimary && data.companyId) {
    const existingPrimary = await contactRepository.find({ companyId: data.companyId, isPrimary: true });
    for (const p of existingPrimary) {
      await contactRepository.update(p._id, { isPrimary: false });
    }
  }

  const contact = await contactRepository.create({
    ...data,
    email: emailValue,
    emails: emailsArray,
    ownerId: data.ownerId || actorId
  });

  await logCrmActivity({
    websiteId: contact.websiteId,
    type: "note",
    title: "Contact Created",
    description: `Contact "${contact.displayName || `${contact.firstName} ${contact.lastName}`}" was registered.`,
    contactId: contact._id,
    companyId: contact.companyId || null,
    ownerId: actorId
  });

  return contact;
};

export const updateContact = async (id, data, actorId) => {
  const contact = await contactRepository.findById(id);
  if (!contact) {
    throw new AppError("Contact not found", 404);
  }

  // Sync single email field with emails[0] if emails is provided
  if (data.emails && Array.isArray(data.emails)) {
    data.email = data.emails[0] || "";
  } else if (data.email) {
    data.emails = [data.email];
  }

  // Manage primary contact: if this contact is marked primary, unset others in the same company
  if (data.isPrimary && (data.companyId || contact.companyId)) {
    const targetCompanyId = data.companyId || contact.companyId;
    const existingPrimary = await contactRepository.find({ companyId: targetCompanyId, isPrimary: true });
    for (const p of existingPrimary) {
      if (String(p._id) !== String(id)) {
        await contactRepository.update(p._id, { isPrimary: false });
      }
    }
  }

  const updated = await contactRepository.update(id, data);

  await logCrmActivity({
    websiteId: updated.websiteId,
    type: "note",
    title: "Contact Updated",
    description: `Contact details for "${updated.displayName}" were updated.`,
    contactId: updated._id,
    companyId: updated.companyId || null,
    ownerId: actorId
  });

  return updated;
};

export const deleteContact = async (id, actorId) => {
  const contact = await contactRepository.findById(id);
  if (!contact) {
    throw new AppError("Contact not found", 404);
  }

  await contactRepository.softDelete(id);

  await logCrmActivity({
    websiteId: contact.websiteId,
    type: "note",
    title: "Contact Archived",
    description: `Contact "${contact.displayName}" was archived (soft-deleted).`,
    contactId: contact._id,
    companyId: contact.companyId || null,
    ownerId: actorId
  });

  return { message: "Contact deleted successfully" };
};
