import { Activity } from "../models/Activity.js";
import { Invoice } from "../models/Invoice.js";
import { Payment } from "../models/Payment.js";
import { Quotation } from "../models/Quotation.js";
import { SalesOrder } from "../models/SalesOrder.js";
import { Ticket } from "../models/Ticket.js";
import { ChatSession } from "../models/ChatSession.js";
import { WorkflowExecution } from "../models/WorkflowExecution.js";
import { Customer } from "../models/Customer.js";
import { User } from "../models/User.js";

export const getTimelineForEntity = async (entityId, websiteId) => {
  const customer = await Customer.findById(entityId);
  const companyId = customer?.companyId || null;

  // Build queries using customerId, companyId or contactId
  const matchCustomer = { customerId: entityId };
  
  // 1. Fetch activities (calls, meetings, tasks, visits, notes)
  const activities = await Activity.find({
    ...matchCustomer,
    isDeleted: { $ne: true }
  }).populate("ownerId", "name email role").lean();

  const formattedActivities = activities.map(act => ({
    _id: act._id,
    title: act.title || `${act.type.toUpperCase()} Activity`,
    description: act.description || `Priority: ${act.priority}. Status: ${act.status}`,
    activityAt: act.dueDate || act.activityAt || act.createdAt,
    type: act.type,
    meta: { status: act.status, priority: act.priority }
  }));

  // 2. Fetch Invoices
  const invoices = await Invoice.find(matchCustomer).lean();
  const formattedInvoices = invoices.map(inv => ({
    _id: inv._id,
    title: `Invoice Generated: ${inv.invoiceId}`,
    description: `Status: ${inv.status}. Total: ${inv.total} ${inv.currency || "INR"}`,
    activityAt: inv.createdAt,
    type: "invoice",
    meta: { status: inv.status, total: inv.total }
  }));

  // 3. Fetch Payments
  const payments = await Payment.find(matchCustomer).lean();
  const formattedPayments = payments.map(pay => ({
    _id: pay._id,
    title: `Payment Recorded: ${pay.paymentNumber || "PAY"}`,
    description: `Amount: ${pay.amount}. Method: ${pay.paymentMethod}. Reference: ${pay.transactionReference || "None"}`,
    activityAt: pay.paymentDate || pay.createdAt,
    type: "payment",
    meta: { amount: pay.amount, method: pay.paymentMethod }
  }));

  // 4. Fetch Quotations
  const quotations = await Quotation.find(matchCustomer).lean();
  const formattedQuotes = quotations.map(q => ({
    _id: q._id,
    title: `Quotation Created: ${q.quotationId}`,
    description: `Status: ${q.status}. Version: V${q.version}. Grand Total: ${q.grandTotal}`,
    activityAt: q.createdAt,
    type: "quote",
    meta: { status: q.status, grandTotal: q.grandTotal }
  }));

  // 5. Fetch Sales Orders
  const salesOrders = await SalesOrder.find(matchCustomer).lean();
  const formattedOrders = salesOrders.map(o => ({
    _id: o._id,
    title: `Sales Order Confirmed: ${o.orderNumber}`,
    description: `Status: ${o.status}. Total Amount: ${o.totalAmount}`,
    activityAt: o.createdAt,
    type: "order",
    meta: { status: o.status, totalAmount: o.totalAmount }
  }));

  // 6. Fetch Tickets
  const tickets = await Ticket.find(matchCustomer).lean();
  const formattedTickets = tickets.map(t => ({
    _id: t._id,
    title: `Support Ticket: ${t.ticketNumber}`,
    description: `Subject: ${t.subject}. Priority: ${t.priority}. Status: ${t.status}`,
    activityAt: t.createdAt,
    type: "ticket",
    meta: { status: t.status, priority: t.priority }
  }));

  // 7. Fetch Chats
  const chats = await ChatSession.find(matchCustomer).lean();
  const formattedChats = chats.map(c => ({
    _id: c._id,
    title: `Chat Session Initiated: ${c.sessionId || c._id}`,
    description: `Status: ${c.status}. Customer: ${c.visitorId?.name || "Visitor"}`,
    activityAt: c.createdAt,
    type: "chat",
    meta: { status: c.status }
  }));

  // 8. Fetch Workflow Executions
  const workflowExecutions = await WorkflowExecution.find(matchCustomer).lean();
  const formattedWorkflows = workflowExecutions.map(w => ({
    _id: w._id,
    title: `Workflow Executed: ${w.workflowId?.name || "CRM Rule Automation"}`,
    description: `Execution status: ${w.status}`,
    activityAt: w.createdAt,
    type: "workflow_execution",
    meta: { status: w.status }
  }));

  // 9. Fetch Internal Notes from Customer document
  let formattedNotes = [];
  if (customer && Array.isArray(customer.internalNotes)) {
    formattedNotes = customer.internalNotes.map(n => ({
      _id: n._id,
      title: `Internal Note Added by ${n.authorName || "User"}`,
      description: n.text,
      activityAt: n.createdAt,
      type: "note",
      meta: { author: n.authorName }
    }));
  }

  // Combine and sort chronologically (newest first)
  const timeline = [
    ...formattedActivities,
    ...formattedInvoices,
    ...formattedPayments,
    ...formattedQuotes,
    ...formattedOrders,
    ...formattedTickets,
    ...formattedChats,
    ...formattedWorkflows,
    ...formattedNotes
  ].sort((a, b) => new Date(b.activityAt) - new Date(a.activityAt));

  return timeline;
};
