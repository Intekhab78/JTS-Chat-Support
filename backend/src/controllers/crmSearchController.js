import { Company } from "../models/Company.js";
import { Contact } from "../models/Contact.js";
import { Customer } from "../models/Customer.js";
import { Deal } from "../models/Deal.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";
import AppError from "../utils/AppError.js";

export const globalSearch = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { q, websiteId } = req.query;

  if (!q || q.length < 2) {
    return res.json([]);
  }

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access to website scope", 403);
  }

  const regex = new RegExp(q, "i");
  const websiteQuery = { websiteId: resolvedWebsiteId, isDeleted: { $ne: true } };

  const [companies, contacts, customers, deals] = await Promise.all([
    Company.find({ ...websiteQuery, $or: [{ companyName: regex }, { industry: regex }, { tags: regex }] }).limit(5).lean(),
    Contact.find({ ...websiteQuery, $or: [{ firstName: regex }, { lastName: regex }, { displayName: regex }, { email: regex }] }).limit(5).lean(),
    Customer.find({ websiteId: resolvedWebsiteId, archivedAt: null, $or: [{ name: regex }, { email: regex }, { phone: regex }, { crn: regex }] }).limit(5).lean(),
    Deal.find({ ...websiteQuery, $or: [{ dealName: regex }, { stage: regex }] }).limit(5).lean()
  ]);

  const results = [];

  companies.forEach(c => {
    results.push({
      _id: c._id,
      name: c.companyName,
      email: c.companyEmail || "N/A",
      crn: "COMPANY",
      pipelineStage: c.status || "active",
      type: "company"
    });
  });

  contacts.forEach(c => {
    results.push({
      _id: c._id,
      name: c.displayName || `${c.firstName} ${c.lastName}`,
      email: c.email || "N/A",
      crn: "CONTACT",
      pipelineStage: c.status || "active",
      type: "contact"
    });
  });

  customers.forEach(c => {
    results.push({
      _id: c._id,
      name: c.name,
      email: c.email || "N/A",
      crn: c.crn,
      pipelineStage: c.pipelineStage || c.leadStatus || "lead",
      type: c.recordType || "lead"
    });
  });

  deals.forEach(d => {
    results.push({
      _id: d._id,
      name: d.dealName,
      email: "N/A",
      crn: "OPPORTUNITY",
      pipelineStage: d.stage || "qualified",
      type: "opportunity"
    });
  });

  res.json(results);
});
