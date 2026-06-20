import { Flow } from "../models/Flow.js";
import { Department } from "../models/Department.js";
import { Category } from "../models/Category.js";
import { CannedResponse } from "../models/CannedResponse.js";
import { Service } from "../models/Service.js";
import { FlowTemplate } from "../models/FlowTemplate.js";
import { Website } from "../models/Website.js";

// Helper to auto-create the master flow structure
const generateDefaultMasterFlow = (websiteId) => {
  return {
    websiteId,
    name: "Master Support & Sales Flow",
    description: "Default automated flow for all visitors.",
    isPublished: true,
    nodes: {
      root: {
        type: "message",
        message: "👋 Welcome! How can we help you today?",
        options: [
          { text: "Buy Services", next: "buy_services" },
          { text: "Sales Inquiry", next: "sales_inquiry" },
          { text: "Technical Support", next: "tech_support" },
          { text: "Billing Support", next: "billing_support" },
          { text: "Raise a Ticket", next: "raise_ticket" },
          { text: "Talk to an Agent", next: "live_agent" }
        ]
      },
      // --- BUY SERVICES ---
      buy_services: {
        type: "button_group",
        message: "Which service are you interested in?",
        options: [
          { text: "Website Development", next: "buy_form" },
          { text: "Mobile App Development", next: "buy_form" },
          { text: "CRM Development", next: "buy_form" },
          { text: "ERP Development", next: "buy_form" },
          { text: "AI Solutions", next: "buy_form" },
          { text: "Digital Marketing", next: "buy_form" },
          { text: "SEO Services", next: "buy_form" },
          { text: "Cloud Hosting", next: "buy_form" }
        ]
      },
      buy_form: {
        type: "form",
        message: "Please provide your details, and our sales team will contact you.",
        fields: [
          { name: "name", type: "text", label: "Full Name", required: true },
          { name: "email", type: "email", label: "Email Address", required: true },
          { name: "phone", type: "text", label: "Phone Number", required: true },
          { name: "budget", type: "dropdown", label: "Estimated Budget", options: ["Under $1k", "$1k - $5k", "$5k - $10k", "$10k+"], required: true },
          { name: "requirements", type: "text", label: "Brief Requirements", required: true }
        ],
        next: "buy_action"
      },
      buy_action: {
        type: "action",
        actionType: "create_lead",
        assignTo: "sales_team",
        notify: "sales_department",
        next: "buy_success"
      },
      buy_success: {
        type: "message",
        message: "Thank you! Your inquiry has been received. Our sales team will be in touch shortly.",
        isSolution: true
      },

      // --- TECHNICAL SUPPORT ---
      tech_support: {
        type: "button_group",
        message: "What technical issue are you facing?",
        options: [
          { text: "Login Issues", next: "tech_login" },
          { text: "Website Issues", next: "tech_website" },
          { text: "Hosting Issues", next: "tech_hosting" },
          { text: "API Issues", next: "tech_api" },
          { text: "Performance Issues", next: "tech_performance" }
        ]
      },
      tech_login: {
        type: "message",
        message: "Try resetting your password via the 'Forgot Password' link. Did this solve your issue?",
        options: [
          { text: "Yes", next: "tech_solved" },
          { text: "No", next: "tech_escalate" }
        ]
      },
      tech_website: {
        type: "message",
        message: "Please clear your browser cache and try again. Did this solve your issue?",
        options: [
          { text: "Yes", next: "tech_solved" },
          { text: "No", next: "tech_escalate" }
        ]
      },
      tech_hosting: {
        type: "message",
        message: "Check our status page for any ongoing hosting maintenance. Did this solve your issue?",
        options: [
          { text: "Yes", next: "tech_solved" },
          { text: "No", next: "tech_escalate" }
        ]
      },
      tech_api: {
        type: "message",
        message: "Please verify your API key is correct and not expired. Did this solve your issue?",
        options: [
          { text: "Yes", next: "tech_solved" },
          { text: "No", next: "tech_escalate" }
        ]
      },
      tech_performance: {
        type: "message",
        message: "Try disabling browser extensions that might interfere with performance. Did this solve your issue?",
        options: [
          { text: "Yes", next: "tech_solved" },
          { text: "No", next: "tech_escalate" }
        ]
      },
      tech_solved: {
        type: "message",
        message: "Great! Let us know if you need anything else.",
        isSolution: true
      },
      tech_escalate: {
        type: "action",
        actionType: "create_ticket",
        department: "Technical Support",
        priority: "High",
        next: "tech_ticket_success"
      },
      tech_ticket_success: {
        type: "message",
        message: "We've created a technical support ticket for you. Our engineers will review it shortly.",
        isSolution: true
      },

      // --- BILLING SUPPORT ---
      billing_support: {
        type: "button_group",
        message: "What billing assistance do you need?",
        options: [
          { text: "Invoice Request", next: "billing_escalate" },
          { text: "Payment Failed", next: "billing_escalate" },
          { text: "Subscription Issues", next: "billing_escalate" },
          { text: "Refund Request", next: "billing_escalate" }
        ]
      },
      billing_escalate: {
        type: "action",
        actionType: "create_ticket",
        department: "Billing Support",
        priority: "Medium",
        next: "billing_success"
      },
      billing_success: {
        type: "message",
        message: "We've created a billing support ticket for you. Our finance team will get back to you.",
        isSolution: true
      },

      // --- SALES INQUIRY ---
      sales_inquiry: {
        type: "form",
        message: "We'd love to hear about your project!",
        fields: [
          { name: "name", type: "text", label: "Full Name", required: true },
          { name: "email", type: "email", label: "Email Address", required: true },
          { name: "phone", type: "text", label: "Phone Number", required: true },
          { name: "company", type: "text", label: "Company Name", required: false },
          { name: "service_interest", type: "text", label: "Service of Interest", required: true }
        ],
        next: "sales_action"
      },
      sales_action: {
        type: "action",
        actionType: "create_lead",
        assignTo: "sales_agent",
        next: "sales_success"
      },
      sales_success: {
        type: "message",
        message: "Thanks! A sales representative will contact you shortly.",
        isSolution: true
      },

      // --- RAISE TICKET ---
      raise_ticket: {
        type: "form",
        message: "Please describe your issue in detail:",
        fields: [
          { name: "subject", type: "text", label: "Subject", required: true },
          { name: "category", type: "dropdown", label: "Category", options: ["Technical", "Billing", "General"], required: true },
          { name: "priority", type: "dropdown", label: "Priority", options: ["Low", "Medium", "High", "Urgent"], required: true },
          { name: "description", type: "text", label: "Description", required: true }
        ],
        next: "ticket_action"
      },
      ticket_action: {
        type: "action",
        actionType: "create_ticket_form",
        next: "ticket_success"
      },
      ticket_success: {
        type: "message",
        message: "Your ticket has been submitted. You will receive an email confirmation with your ticket number.",
        isSolution: true
      },

      // --- LIVE AGENT ---
      live_agent: {
        type: "condition",
        conditionType: "agents_online",
        trueNext: "live_connect",
        falseNext: "live_offline"
      },
      live_connect: {
        type: "action",
        actionType: "escalate",
        message: "Connecting you to the next available agent..."
      },
      live_offline: {
        type: "form",
        message: "Our agents are currently offline. Please leave your details and we will call you back.",
        fields: [
          { name: "name", type: "text", label: "Name", required: true },
          { name: "phone", type: "text", label: "Phone Number", required: true }
        ],
        next: "callback_action"
      },
      callback_action: {
        type: "action",
        actionType: "create_callback_request",
        next: "callback_success"
      },
      callback_success: {
        type: "message",
        message: "We've received your callback request. An agent will contact you as soon as they are online.",
        isSolution: true
      }
    }
  };
};

export const autoSeedWebsiteData = async (websiteId, managerId) => {
  console.log(`[AutoSeed] Starting auto-seed for new website: ${websiteId}`);
  try {
    // 1. Create Default Departments
    const deptNames = ["Sales", "Technical Support", "Billing", "Account Management", "General Inquiry"];
    const depts = [];
    for (const name of deptNames) {
      depts.push(await Department.create({ websiteId, managerId, name, description: `Default ${name} department` }));
    }

    // 2. Create Default Categories (Knowledge Base & Tickets)
    const catNames = ["Getting Started", "Billing", "Technical Support", "Account Management", "FAQs", "Product Features", "Integrations", "Security", "Policies", "Troubleshooting"];
    for (const name of catNames) {
      await Category.create({ websiteId, managerId, name, type: "Both", description: `Category for ${name}` });
    }

    // 3. Create Default Services
    const serviceNames = [
      "Website Development", "Mobile App Development", "CRM Development", 
      "ERP Development", "AI Solutions", "Digital Marketing", 
      "SEO Services", "Cloud Hosting", "API Integration", "UI/UX Design"
    ];
    for (const name of serviceNames) {
      await Service.create({ websiteId, managerId, name, description: `Professional ${name} services.`, price: 0 });
    }

    // 4. Create 20 Sample FAQs (Canned Responses/KB)
    for (let i = 1; i <= 20; i++) {
      await CannedResponse.create({
        websiteId,
        managerId,
        title: `Sample FAQ ${i}`,
        shortcut: `/faq${i}`,
        content: `This is the detailed answer to sample frequently asked question ${i}. It is auto-generated to help you get started building your knowledge base.`,
        tags: ["FAQ", "General"]
      });
    }

    // 5. Create Default Master Flow
    const flowData = generateDefaultMasterFlow(websiteId);
    const defaultFlow = await Flow.create(flowData);

    // 6. Update Website with Default Flow
    await Website.findByIdAndUpdate(websiteId, { 
      activeFlowId: defaultFlow._id,
      botEnabled: true,
      enableChat: true,
      enableLeadGeneration: true,
      enableTicketing: true,
      enableKnowledgeBase: true,
      enableLiveAgent: true,
      enableAutomation: true
    });

    console.log(`[AutoSeed] Completed auto-seed for new website: ${websiteId}`);
  } catch (err) {
    console.error(`[AutoSeed] Failed auto-seed for website: ${websiteId}`, err);
  }
};
