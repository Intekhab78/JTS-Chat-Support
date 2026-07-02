import { Ticket } from "../models/Ticket.js";
import { Customer } from "../models/Customer.js";
import { Invoice } from "../models/Invoice.js";
import { logCrmActivity } from "./activityLoggerService.js";

/**
 * AI Tool Function Calling framework
 * Enforces strict websiteId multi-tenant boundary checks.
 */
export const AiAgentTools = {
  create_ticket: async (websiteId, payload, actor) => {
    console.log(`[AI Agent Tool] Invoked create_ticket for website: ${websiteId}`);
    const ticketId = `TKT-${Date.now().toString().slice(-6)}`;
    const ticket = await Ticket.create({
      ticketId,
      websiteId,
      subject: payload.subject || "AI Generated Ticket",
      priority: payload.priority || "medium",
      status: "open",
      channel: "web",
      assignedAgent: actor ? actor._id : null
    });

    await logCrmActivity({
      websiteId,
      type: "ticket_created",
      title: `AI Agent Action: Ticket ${ticketId}`,
      description: `AI Agent successfully created ticket for subject: ${ticket.subject}`,
      ownerId: actor ? actor._id : null
    });

    return { ticketId: ticket.ticketId, status: "created", ticket };
  },

  create_lead: async (websiteId, payload, actor) => {
    console.log(`[AI Agent Tool] Invoked create_lead for website: ${websiteId}`);
    
    // Check duplication email
    if (payload.email) {
      const existing = await Customer.findOne({ websiteId, email: payload.email });
      if (existing) {
        return { status: "duplicate", message: "A customer with this email already exists." };
      }
    }

    const customer = await Customer.create({
      websiteId,
      name: payload.name || "AI Contact Lead",
      email: payload.email || "",
      phone: payload.phone || "",
      recordType: "lead",
      status: "new",
      pipelineStage: "new",
      ownerId: actor ? actor._id : null
    });

    await logCrmActivity({
      websiteId,
      type: "lead_created",
      title: "AI Agent Action: Lead Created",
      description: `AI Agent successfully created lead profile for: ${customer.name}`,
      customerId: customer._id,
      ownerId: actor ? actor._id : null
    });

    return { customerId: customer._id, status: "created", customer };
  },

  generate_invoice: async (websiteId, payload, actor) => {
    console.log(`[AI Agent Tool] Invoked generate_invoice for website: ${websiteId}`);
    const invoiceId = `INV-${Date.now().toString().slice(-6)}`;
    
    const invoice = await Invoice.create({
      invoiceId,
      invoiceNumber: invoiceId,
      customerId: payload.customerId,
      websiteId,
      ownerId: actor ? actor._id : null,
      items: payload.items || [{ description: "Consulting Service", quantity: 1, price: 100, total: 100 }],
      total: payload.total || 100,
      status: "pending"
    });

    await logCrmActivity({
      websiteId,
      type: "invoice_created",
      title: `AI Agent Action: Invoice ${invoiceId}`,
      description: `AI Agent generated billing invoice of $${invoice.total} for customer.`,
      customerId: payload.customerId,
      ownerId: actor ? actor._id : null
    });

    return { invoiceId: invoice.invoiceId, status: "generated", invoice };
  }
};

/**
 * Execute tool intent parsed from LLM agent response
 */
export async function executeAgentToolCall(websiteId, toolName, payload = {}, actor = null) {
  const toolFn = AiAgentTools[toolName];
  if (!toolFn) {
    throw new Error(`AI Tool "${toolName}" is not registered in the agent framework.`);
  }

  // Secure validation checks: ensure actor has permissions for CRM/Helpdesk scope
  if (actor && actor.websiteIds && !actor.websiteIds.map(id => id.toString()).includes(websiteId.toString())) {
    throw new Error("Sovereignty Breach: User does not belong to requested tenant websiteId.");
  }

  return await toolFn(websiteId, payload, actor);
}
