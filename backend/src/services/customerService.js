import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import { Customer } from "../models/Customer.js";
import { incrementCustomers } from "./analyticsService.js";
import { User } from "../models/User.js";

// Safely cast a value to ObjectId; returns null if invalid
const toObjectId = (id) => {
  if (!id) return null;
  try { return new mongoose.Types.ObjectId(id.toString()); } catch { return null; }
};

/**
 * Generates a unique CRN in the format CRN-YYYY-XXXX
 * @returns {Promise<string>} The generated CRN
 */
export const generateCRN = async () => {
  const year = new Date().getFullYear();
  // Generate a random 6 character alphanumeric string
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CRN-${year}-${randomStr}`;
};

/**
 * Locates an existing customer by email/phone/visitorId or creates a new one.
 * @param {Object} data - Customer data { name, email, phone, websiteId, visitorId }
 * @returns {Promise<Object>} The Customer document
 */
export const getOrCreateCustomer = async (data) => {
  const { name, email, phone, websiteId } = data;

  const rawName = String(name || "").trim();
  const cleanName = ["anonymous visitor", "visitor", "anonymous", "unknown"].includes(rawName.toLowerCase())
    ? ""
    : rawName;

  const rawEmail = String(email || "").trim().toLowerCase();
  const cleanEmail = (!rawEmail || rawEmail.endsWith("@visitor.local") || rawEmail.endsWith("@anonymous.local") || rawEmail.startsWith("anon-"))
    ? ""
    : rawEmail;

  const cleanPhone = String(phone || "").trim();

  // Do not create anonymous CRM customer records when neither email nor phone is provided
  if (!cleanEmail && !cleanPhone) return null;

  const resolvedEmail = cleanEmail || "";

  const query = { websiteId };
  if (resolvedEmail && cleanPhone) {
    query.$or = [{ email: resolvedEmail }, { phone: cleanPhone }];
  } else if (resolvedEmail) {
    query.email = resolvedEmail;
  } else {
    query.phone = cleanPhone;
  }

  let customer = await Customer.findOne(query);

  if (!customer) {
    const crn = await generateCRN();
    customer = new Customer({
      crn,
      name: cleanName || (cleanPhone ? `Visitor (${cleanPhone})` : cleanEmail),
      email: resolvedEmail,
      phone: cleanPhone || null,
      websiteId,
      leadSource: data.leadSource || "Manual",
      ownerId: toObjectId(data.ownerId),   // always ObjectId, never string
      archivedAt: null,          // explicit null so CRM archived filter works correctly
      lastInteraction: new Date(),
      lastActivity: new Date(),
      trn: data.trn || "",
      tradeLicenseNumber: data.tradeLicenseNumber || "",
      tradeLicenseExpiryDate: data.tradeLicenseExpiryDate || null,
      serviceType: data.serviceType || "Corporate Tax Registration",
      workStatus: data.workStatus || "Pending",
      paymentStatus: data.paymentStatus || "Pending",
      vatFilingPeriod: data.vatFilingPeriod || "",
      vatFilingDueDate: data.vatFilingDueDate || null,
      corporateTaxDueDate: data.corporateTaxDueDate || null,
      lastFollowUpActivityAt: data.lastFollowUpActivityAt || new Date()
    });
    await customer.save();
    await incrementCustomers(websiteId);
    logger.log(`[CRN_SYSTEM]: Created customer ${crn} for ${name || "anonymous visitor"}`);
  } else {
    // Update last interaction and fill missing identity details
    customer.lastInteraction = new Date();
    if (name && (!customer.name || customer.name === "Anonymous Visitor")) {
      customer.name = name;
    }
    // If visitor now provides real email but had placeholder, upgrade it
    if (email && customer.email?.endsWith("@visitor.local")) {
      customer.email = email;
    }
    if (phone && !customer.phone) {
      customer.phone = phone;
    }
    if (data.trn) customer.trn = data.trn;
    if (data.tradeLicenseNumber) customer.tradeLicenseNumber = data.tradeLicenseNumber;
    if (data.tradeLicenseExpiryDate) customer.tradeLicenseExpiryDate = data.tradeLicenseExpiryDate;
    if (data.serviceType) customer.serviceType = data.serviceType;
    if (data.workStatus) customer.workStatus = data.workStatus;
    if (data.paymentStatus) customer.paymentStatus = data.paymentStatus;
    if (data.vatFilingDueDate) customer.vatFilingDueDate = data.vatFilingDueDate;
    if (data.corporateTaxDueDate) customer.corporateTaxDueDate = data.corporateTaxDueDate;

    // Set ownerId if not set and one is provided — always store as ObjectId
    if (data.ownerId && !customer.ownerId) {
      customer.ownerId = toObjectId(data.ownerId);
      customer.ownerAssignedAt = new Date();
    }
    await customer.save();
  }

  return customer;
};

export async function findDefaultCrmOwner({ websiteId, managerId }) {
  const onlineQuery = {
    managerId,
    isOnline: true,
    isAvailable: true,
    role: { $in: ["sales", "manager"] },
    $or: [
      { websiteIds: websiteId },
      { websiteIds: { $exists: false } },
      { websiteIds: { $size: 0 } }
    ]
  };

  let owner = await User.findOne(onlineQuery).sort({ lastActiveAt: -1, createdAt: 1 }).select("_id");
  if (!owner) {
    owner = await User.findOne({
      managerId,
      role: { $in: ["sales", "manager"] },
      $or: [
        { websiteIds: websiteId },
        { websiteIds: { $exists: false } },
        { websiteIds: { $size: 0 } }
      ]
    }).sort({ createdAt: 1 }).select("_id");
  }

  return owner?._id || null;
}
