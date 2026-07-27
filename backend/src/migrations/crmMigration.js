import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { Company } from "../models/Company.js";
import { Contact } from "../models/Contact.js";
import { Pipeline } from "../models/Pipeline.js";
import { Role } from "../models/Role.js";

function splitName(fullName = "") {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] || "Unknown";
  const lastName = parts.slice(1).join(" ") || "Contact";
  return { firstName, lastName };
}

const DEFAULT_ROLES = [
  {
    name: "admin",
    description: "Super Administrator with complete access to all modules, settings, and multi-tenant configurations.",
    permissions: [
      "crm.view", "crm.create", "crm.update", "crm.archive", "crm.delete", "crm.assign", "crm.merge",
      "ticket.view", "ticket.create", "ticket.update", "ticket.delete", "ticket.comment",
      "chat.view", "chat.transfer", "chat.note", "chat.history", "chat.archive",
      "accounts.view", "invoice.manage", "billing.view",
      "reports.view", "audit.view", "settings.manage", "role.manage"
    ]
  },
  {
    name: "manager",
    description: "Full operational manager with CRM, Ticketing, Chat, Accounting, and Reporting access.",
    permissions: [
      "crm.view", "crm.create", "crm.update", "crm.archive", "crm.assign", "crm.merge",
      "ticket.view", "ticket.create", "ticket.update", "ticket.comment",
      "chat.view", "chat.transfer", "chat.note", "chat.history",
      "accounts.view", "invoice.manage", "billing.view", "reports.view", "audit.view"
    ]
  },
  {
    name: "tax_consultant",
    description: "Tax Consultant handling assigned clients for VAT, Corporate Tax, and Trade License compliance.",
    permissions: [
      "crm.view", "crm.create", "crm.update", "crm.assign",
      "ticket.view", "ticket.create", "ticket.comment",
      "chat.view", "chat.note", "reports.view"
    ]
  },
  {
    name: "sales",
    description: "Responsible for managing leads, creating prospects, and updating CRM sales records.",
    permissions: [
      "crm.view", "crm.create", "crm.update", "crm.assign", "crm.merge",
      "ticket.view", "ticket.create", "chat.view", "chat.note"
    ]
  },
  {
    name: "agent",
    description: "Frontline support agent for managing tickets and communicating with customers via live chat.",
    permissions: [
      "ticket.view", "ticket.create", "ticket.update", "ticket.comment",
      "chat.view", "chat.transfer", "chat.note", "chat.history", "crm.view"
    ]
  },
  {
    name: "accounts",
    description: "Handles accounting, invoicing, billing dashboards, and ledger review.",
    permissions: [
      "accounts.view", "invoice.manage", "billing.view", "crm.view", "reports.view"
    ]
  },
  {
    name: "purchase",
    description: "Manages purchase requests, tracks ticketing pipelines, and vendor status.",
    permissions: [
      "ticket.view", "ticket.create", "accounts.view", "billing.view"
    ]
  },
  {
    name: "management",
    description: "Executive management with company-wide read-only visibility into reports, dashboards, and audit logs.",
    permissions: [
      "crm.view", "ticket.view", "chat.view", "accounts.view", "reports.view", "audit.view"
    ]
  },
  {
    name: "user",
    description: "End client self-service portal user for document downloads, invoice payments, and support inquiries.",
    permissions: [
      "ticket.view", "ticket.create", "ticket.comment", "accounts.view", "billing.view"
    ]
  }
];

export async function runCrmMigration() {
  console.log("[Migration] Starting JTS CRM Enterprise Migration...");

  // Seed default Roles if missing
  for (const defRole of DEFAULT_ROLES) {
    const existing = await Role.findOne({ name: defRole.name });
    if (!existing) {
      console.log(`[Migration] Seeding role: ${defRole.name}`);
      await Role.create(defRole);
    }
  }

  // 1. Ensure Default Pipelines exist for all Websites
  const customers = await Customer.find({});
  const uniqueWebsiteIds = [...new Set(customers.map(c => c.websiteId?.toString()).filter(Boolean))];

  for (const wId of uniqueWebsiteIds) {
    const existingPipeline = await Pipeline.findOne({ websiteId: wId, isDefault: true });
    if (!existingPipeline) {
      console.log(`[Migration] Creating default sales pipeline for website ${wId}`);
      await Pipeline.create({
        websiteId: wId,
        name: "Standard Sales Pipeline",
        isDefault: true,
        stages: [
          { key: "new", label: "New Lead", probability: 10, order: 0, color: "bg-violet-50 text-violet-600 border-violet-100" },
          { key: "contacted", label: "Contacted", probability: 25, order: 1, color: "bg-sky-50 text-sky-600 border-sky-100" },
          { key: "qualified", label: "Qualified", probability: 50, order: 2, color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
          { key: "proposal", label: "Proposal Sent", probability: 75, order: 3, color: "bg-amber-50 text-amber-600 border-amber-100" },
          { key: "negotiation", label: "Negotiation", probability: 90, order: 4, color: "bg-orange-50 text-orange-600 border-orange-100" },
          { key: "won", label: "Closed Won", probability: 100, order: 5, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
          { key: "lost", label: "Closed Lost", probability: 0, order: 6, color: "bg-red-50 text-red-500 border-red-100" }
        ]
      });
    }
  }

  // 2. Map existing leads to Companies and Contacts
  let companyCount = 0;
  let contactCount = 0;
  let leadCount = 0;

  for (const c of customers) {
    let updated = false;

    // Default enterprise properties
    if (c.leadScore === undefined || c.leadScore === 0) {
      c.leadScore = c.score || 0;
      updated = true;
    }
    if (!c.leadTemperature) {
      c.leadTemperature = c.interestLevel || c.leadCategory || "warm";
      updated = true;
    }
    if (c.expectedRevenue === undefined || c.expectedRevenue === 0) {
      c.expectedRevenue = Math.round((Number(c.leadValue || 0) * Number(c.probability || 10)) / 100);
      updated = true;
    }
    if (!c.qualificationStatus || c.qualificationStatus === "unqualified") {
      if (c.pipelineStage === "disqualified" || c.leadStatus === "disqualified") {
        c.qualificationStatus = "disqualified";
      } else if (c.pipelineStage === "qualified" || c.leadStatus === "qualified") {
        c.qualificationStatus = "qualified";
      } else {
        c.qualificationStatus = "unqualified";
      }
      updated = true;
    }

    // Resolve Company
    let matchedCompanyId = null;
    if (c.companyName && c.companyName.trim()) {
      let company = await Company.findOne({ websiteId: c.websiteId, companyName: c.companyName.trim() });
      if (!company) {
        company = await Company.create({
          websiteId: c.websiteId,
          companyName: c.companyName.trim(),
          ownerId: c.ownerId,
          status: "active"
        });
        companyCount++;
      }
      matchedCompanyId = company._id;
    }

    // Resolve Contact
    if (c.email || c.name) {
      let contact = null;
      if (c.email) {
        contact = await Contact.findOne({ websiteId: c.websiteId, email: c.email.trim().toLowerCase() });
      }
      if (!contact) {
        const { firstName, lastName } = splitName(c.name);
        contact = await Contact.create({
          websiteId: c.websiteId,
          companyId: matchedCompanyId,
          firstName,
          lastName,
          email: c.email ? c.email.trim().toLowerCase() : "",
          phones: c.phone ? [{ phone: c.phone, label: "work" }] : [],
          ownerId: c.ownerId,
          source: c.leadSource || "chat"
        });
        contactCount++;
      }
    }

    if (updated) {
      await c.save();
      leadCount++;
    }
  }

  console.log(`[Migration] JTS CRM Enterprise Migration Complete!`);
  console.log(`[Migration] Stats: ${companyCount} Companies created, ${contactCount} Contacts created, ${leadCount} Leads migrated.`);
  return { companyCount, contactCount, leadCount };
}
