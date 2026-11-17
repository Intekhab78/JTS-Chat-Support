import { CreditNote } from "../models/CreditNote.js";
import { Invoice } from "../models/Invoice.js";
import { logCrmActivity } from "../services/activityLoggerService.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

export const listCreditNotes = asyncHandler(async (req, res) => {
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

  const notes = await CreditNote.find(query)
    .populate("customerId", "name companyName email")
    .populate("invoiceId", "invoiceNumber invoiceId total")
    .sort({ createdAt: -1 });
  res.json(notes);
});

export const createCreditNote = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to this website's data", 403);
  }

  const creditNoteNumber = `CN-${Date.now().toString().slice(-6)}`;
  const note = await CreditNote.create({
    ...req.body,
    websiteId: resolvedWebsiteId,
    creditNoteNumber
  });

  // Auto-apply credit note against linked invoice balance when status is applied
  if (note.status === "applied" && note.invoiceId && Number(note.amount) > 0) {
    const invoice = await Invoice.findById(note.invoiceId);
    if (invoice && invoice.status !== "cancelled" && invoice.status !== "void") {
      const remaining = Math.max(0, Number(invoice.total || 0) - Number(invoice.paidAmount || 0));
      const creditApplied = Math.min(Number(note.amount), remaining);
      if (creditApplied > 0) {
        invoice.paidAmount = Number(invoice.paidAmount || 0) + creditApplied;
        if (invoice.paidAmount >= Number(invoice.total || 0)) {
          invoice.status = "paid";
        } else if (invoice.paidAmount > 0) {
          invoice.status = "partially_paid";
        }
        await invoice.save();
      }
    }
  }

  await logCrmActivity({
    websiteId: resolvedWebsiteId,
    type: "note",
    title: `Credit Note Issued: ${creditNoteNumber}`,
    description: `Credit Note ${creditNoteNumber} issued for ${note.amount}${note.reason ? ` (${note.reason})` : ""}.`,
    customerId: note.customerId,
    ownerId: req.user._id
  }).catch(() => {});

  res.status(201).json(note);
});

export const updateCreditNoteStatus = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const note = await CreditNote.findById(req.params.id);
  if (!note) throw new AppError("Credit note not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(String(note.websiteId))) {
    throw new AppError("Unauthorized access", 403);
  }
  const { status } = req.body;
  if (!["applied", "refunded", "cancelled"].includes(status)) {
    throw new AppError("Invalid credit note status", 400);
  }
  note.status = status;
  await note.save();
  res.json(note);
});
