import { CustomerDocument } from "../models/CustomerDocument.js";
import { Customer } from "../models/Customer.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { createAndEmitCrmNotification } from "../utils/crmUtils.js";
import { logCrmActivity } from "../services/activityLoggerService.js";

/**
 * 1. List Customer Documents API
 * @route GET /api/crm/customers/:customerId/documents
 */
export const getCustomerDocuments = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const { customerId } = req.params;
  const { category, status, search } = req.query;

  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  const query = {
    customer: customerId,
    archivedAt: null
  };

  if (category) query.category = category;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { documentName: new RegExp(search, "i") },
      { filename: new RegExp(search, "i") },
      { description: new RegExp(search, "i") }
    ];
  }

  const documents = await CustomerDocument.find(query)
    .populate("uploadedBy", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    count: documents.length,
    documents
  });
});

/**
 * 2. Upload Customer Document API
 * @route POST /api/crm/customers/:customerId/documents
 */
export const uploadCustomerDocument = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { customerId } = req.params;
  const { documentName, category, description, fileUrl, filename, fileType, fileSize, serviceId } = req.body;

  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  if (!fileUrl || !filename) {
    throw new AppError("File URL and filename are required", 400);
  }

  const doc = await CustomerDocument.create({
    customer: customerId,
    serviceId: serviceId || null,
    documentName: documentName || filename,
    category: category || "Other",
    description: description || "",
    fileUrl,
    filename,
    fileType: fileType || "",
    fileSize: fileSize || 0,
    versionNumber: 1,
    versionHistory: [{
      versionNumber: 1,
      fileUrl,
      filename,
      fileType: fileType || "",
      fileSize: fileSize || 0,
      uploadedBy: req.user._id,
      changeNotes: "Initial Upload",
      uploadedAt: new Date()
    }],
    status: "Verified",
    uploadedBy: req.user._id,
    websiteId: customer.websiteId
  });

  await logCrmActivity({
    customer: customer._id,
    user: req.user._id,
    userName: req.user.name,
    eventType: "document_uploaded",
    title: `Document Uploaded: ${doc.documentName}`,
    description: `Category: ${doc.category}. Version 1.0 uploaded.`
  });

  res.status(201).json(doc);
});

/**
 * 3. Replace Document Version API
 * @route POST /api/crm/documents/:documentId/version
 */
export const replaceDocumentVersion = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { documentId } = req.params;
  const { fileUrl, filename, fileType, fileSize, changeNotes } = req.body;

  const doc = await CustomerDocument.findById(documentId);
  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  // Preserve previous version in version history
  doc.versionHistory.push({
    versionNumber: doc.versionNumber,
    fileUrl: doc.fileUrl,
    filename: doc.filename,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    uploadedBy: doc.uploadedBy,
    changeNotes: changeNotes || "Version Replacement",
    uploadedAt: new Date()
  });

  doc.versionNumber += 1;
  doc.fileUrl = fileUrl;
  doc.filename = filename;
  doc.fileType = fileType || doc.fileType;
  doc.fileSize = fileSize || doc.fileSize;
  doc.uploadedBy = req.user._id;
  await doc.save();

  res.json(doc);
});

/**
 * 4. Update Document Metadata API
 * @route PATCH /api/crm/documents/:documentId
 */
export const updateDocumentMetadata = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const { documentId } = req.params;
  const { documentName, category, status, description } = req.body;

  const doc = await CustomerDocument.findById(documentId);
  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  if (documentName) doc.documentName = documentName;
  if (category) doc.category = category;
  if (status) doc.status = status;
  if (description !== undefined) doc.description = description;

  await doc.save();
  res.json(doc);
});

/**
 * 5. Delete Customer Document API
 * @route DELETE /api/crm/documents/:documentId
 */
export const deleteCustomerDocument = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const { documentId } = req.params;

  const doc = await CustomerDocument.findById(documentId);
  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  doc.archivedAt = new Date();
  doc.status = "Archived";
  await doc.save();

  res.json({ message: "Document archived cleanly", documentId });
});
