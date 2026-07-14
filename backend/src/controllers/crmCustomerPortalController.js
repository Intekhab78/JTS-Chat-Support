import { Ticket } from "../models/Ticket.js";
import { Quotation } from "../models/Quotation.js";
import { SalesOrder } from "../models/SalesOrder.js";
import { Invoice } from "../models/Invoice.js";
import { Customer } from "../models/Customer.js";
import { Company } from "../models/Company.js";
import { Contact } from "../models/Contact.js";
import { Notification } from "../models/Notification.js";
import { ChatSession } from "../models/ChatSession.js";
import { Activity } from "../models/Activity.js";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";
import { advancePurchaseWorkflow } from "../services/purchaseWorkflowService.js";
import bcrypt from "bcryptjs";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { logCrmActivity } from "../services/activityLoggerService.js";

// Utility to verify customer isolation matches
const checkCustomerIsolation = (user, customerId) => {
  if (String(user.customerId) !== String(customerId)) {
    throw new AppError("Access denied. Multi-tenant isolation boundary violated.", 403);
  }
};

// 1. Dashboard View
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const customerId = req.user.customerId;

  const [tickets, quotes, orders, invoices, notifications, meetings] = await Promise.all([
    Ticket.find({ customerId }).sort({ updatedAt: -1 }),
    Quotation.find({ customerId }).sort({ updatedAt: -1 }),
    SalesOrder.find({ customerId }).sort({ updatedAt: -1 }),
    Invoice.find({ customerId }).sort({ updatedAt: -1 }),
    Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10),
    Activity.find({ customerId, type: "meeting" }).sort({ dueDate: 1 }).limit(5)
  ]);

  res.json({
    summary: {
      openTickets: tickets.filter(t => t.status !== "closed").length,
      activeQuotes: quotes.filter(q => q.status === "sent" || q.status === "negotiation").length,
      totalOrders: orders.length,
      unpaidInvoices: invoices.filter(i => i.paymentStatus !== "paid").length
    },
    tickets: tickets.slice(0, 5),
    quotes: quotes.slice(0, 5),
    orders: orders.slice(0, 5),
    invoices: invoices.slice(0, 5),
    notifications,
    meetings
  });
});

// 2. Quotations list and actions
export const getQuotations = asyncHandler(async (req, res) => {
  const quotes = await Quotation.find({ customerId: req.user.customerId }).sort({ createdAt: -1 });
  res.json(quotes);
});

export const updateQuotationStatus = asyncHandler(async (req, res) => {
  const { action } = req.body; // accept or reject
  const quote = await Quotation.findById(req.params.id);
  if (!quote) throw new AppError("Quotation not found", 404);
  checkCustomerIsolation(req.user, quote.customerId);

  if (action === "accept") {
    quote.status = "accepted";
  } else if (action === "reject") {
    quote.status = "rejected";
  } else {
    throw new AppError("Invalid action", 400);
  }

  await quote.save();

  // Log activity
  await logCrmActivity({
    websiteId: quote.websiteId,
    type: "note",
    title: `Quotation ${action.toUpperCase()} by Customer`,
    description: `Customer ${req.user.name} has ${action}ed quotation #${quote.quoteNumber || quote._id}`,
    customerId: req.user.customerId
  });

  res.json(quote);
});

// 3. Orders List
export const getOrders = asyncHandler(async (req, res) => {
  const orders = await SalesOrder.find({ customerId: req.user.customerId }).sort({ createdAt: -1 });
  res.json(orders);
});

// 4. Invoices List
export const getInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ customerId: req.user.customerId }).sort({ createdAt: -1 });
  res.json(invoices);
});

// 5. Support Tickets list, create, and reply
export const getTickets = asyncHandler(async (req, res) => {
  const tickets = await Ticket.find({ customerId: req.user.customerId }).sort({ createdAt: -1 });
  res.json(tickets);
});

export const createTicket = asyncHandler(async (req, res) => {
  const { subject, description, priority = "medium", category } = req.body;
  if (!subject || !description) {
    throw new AppError("Subject and description are required", 400);
  }

  const customer = await Customer.findById(req.user.customerId);
  if (!customer) throw new AppError("Customer profile not found", 404);

  const ticketId = `TCK-${Date.now().toString().slice(-6)}`;

  const ticket = await Ticket.create({
    ticketId,
    websiteId: customer.websiteId,
    customerId: customer._id,
    subject,
    description,
    priority,
    category: category || "general",
    status: "open",
    source: "portal",
    assignedAgent: customer.ownerId || undefined,
    assignedAt: customer.ownerId ? new Date() : null,
    assignmentHistory: customer.ownerId ? [{
      assignedAgent: customer.ownerId,
      assignedBy: null,
      reason: "Auto-assigned to Account Manager / Customer Owner",
      assignedAt: new Date()
    }] : []
  });

  // Log activity
  await logCrmActivity({
    websiteId: customer.websiteId,
    type: "task",
    title: "Support Ticket Logged",
    description: `Ticket #${ticket._id} created by Customer: ${subject}`,
    customerId: customer._id
  });

  res.status(201).json(ticket);
});

export const replyToTicket = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) throw new AppError("Reply message is required", 400);

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) throw new AppError("Ticket not found", 404);
  checkCustomerIsolation(req.user, ticket.customerId);

  ticket.notes.push({
    content: message,
    addedBy: req.user._id,
    isPublic: true,
    createdAt: new Date()
  });
  ticket.status = "open"; // reset status to open if customer replies

  await ticket.save();
  res.json(ticket);
});

// 6. Profile & Password edits
export const getProfile = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user.customerId);
  if (!customer) throw new AppError("Customer profile not found", 404);

  // Find associated company details if any
  let company = null;
  if (customer.companyName) {
    company = await Company.findOne({
      websiteId: customer.websiteId,
      $or: [{ name: customer.companyName }, { name: new RegExp(customer.companyName, "i") }]
    });
  }

  res.json({
    user: {
      name: req.user.name,
      email: req.user.email
    },
    customer,
    company
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const customer = await Customer.findById(req.user.customerId);
  if (!customer) throw new AppError("Customer profile not found", 404);

  if (name) {
    customer.name = name;
    req.user.name = name;
  }
  if (phone) customer.phone = phone;

  await Promise.all([customer.save(), req.user.save()]);
  res.json({ customer, user: { name: req.user.name, email: req.user.email } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new AppError("Current and new passwords are required", 400);
  }

  const user = await User.findById(req.user._id);
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw new AppError("Incorrect current password", 401);
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  res.json({ success: true, message: "Password updated successfully" });
});

// 7. Pay Invoice (Simulation from Customer Portal)
export const payInvoice = asyncHandler(async (req, res) => {
  const { paymentMethod = "credit_card", amount } = req.body;
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new AppError("Invoice not found", 404);
  checkCustomerIsolation(req.user, invoice.customerId);

  if (invoice.status === "cancelled" || invoice.status === "void") {
    throw new AppError("Cannot pay cancelled or void invoices", 400);
  }

  const payAmount = Number(amount || invoice.total || invoice.totalAmount || 0);
  if (payAmount <= 0) {
    throw new AppError("Invalid payment amount", 400);
  }

  const paymentNumber = `PAY-PORTAL-${Date.now().toString().slice(-6)}`;

  // Create payment record
  const payment = await Payment.create({
    websiteId: invoice.websiteId,
    paymentNumber,
    invoiceId: invoice._id,
    customerId: invoice.customerId,
    amount: payAmount,
    gateway: "portal_stripe_mock",
    paymentMethod,
    referenceNumber: `REF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
    status: "completed",
    paymentDate: new Date()
  });

  // Update invoice paid balance
  invoice.paidAmount = (invoice.paidAmount || 0) + payAmount;
  if (invoice.paidAmount >= (invoice.total || invoice.totalAmount)) {
    invoice.status = "paid";
    invoice.paymentStatus = "paid";
  } else {
    invoice.status = "partially_paid";
    invoice.paymentStatus = "partially_paid";
  }
  await invoice.save();

  // Trigger post-payment workflows and lead transitions
  try {
    // 1. Log activity
    await logCrmActivity({
      websiteId: invoice.websiteId,
      type: "meeting",
      title: "Invoice Paid Online",
      description: `Invoice #${invoice.invoiceNumber || invoice._id} paid online via Customer Portal for $${payAmount}. Reference: ${payment.referenceNumber}`,
      customerId: invoice.customerId
    });

    // 2. Advance Purchase Workflow & transition lead if fully paid
    if (invoice.status === "paid") {
      await advancePurchaseWorkflow(invoice._id, "completed", "Invoice paid in full");
      
      const customer = await Customer.findById(invoice.customerId);
      if (customer) {
        customer.pipelineStage = "won";
        await customer.save();
      }
    }
  } catch (err) {
    console.error("Failed to run post-payment updates in portal:", err);
  }

  res.json({ success: true, message: "Payment processed successfully", payment });
});
