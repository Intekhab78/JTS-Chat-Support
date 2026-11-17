import { DebitNote } from "../models/DebitNote.js";
import { logCrmActivity } from "../services/activityLoggerService.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

export const listDebitNotes = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, customerId } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json([]);
  }

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (customerId) query.customerId = customerId;

  const notes = await DebitNote.find(query)
    .populate("customerId", "name companyName email")
    .populate("invoiceId", "invoiceNumber invoiceId total")
    .sort({ createdAt: -1 });
  res.json(notes);
});

export const createDebitNote = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const debitNoteNumber = `DN-${Date.now().toString().slice(-6)}`;
  const note = await DebitNote.create({
    ...req.body,
    websiteId: resolvedWebsiteId,
    debitNoteNumber
  });

  await logCrmActivity({
    websiteId: resolvedWebsiteId,
    type: "note",
    title: `Debit Note Issued: ${debitNoteNumber}`,
    description: `Debit Note ${debitNoteNumber} issued for ${note.amount}${note.reason ? ` (${note.reason})` : ""}.`,
    customerId: note.customerId,
    ownerId: req.user._id
  }).catch(() => {});

  res.status(201).json(note);
});

export const updateDebitNoteStatus = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const note = await DebitNote.findById(req.params.id);
  if (!note) throw new AppError("Debit note not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(String(note.websiteId))) {
    throw new AppError("Unauthorized access", 403);
  }
  const { status } = req.body;
  if (!["pending", "paid", "cancelled"].includes(status)) {
    throw new AppError("Invalid debit note status", 400);
  }
  note.status = status;
  await note.save();
  res.json(note);
});
