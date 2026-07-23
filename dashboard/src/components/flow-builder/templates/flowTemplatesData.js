/**
 * Pre-built Enterprise Flow Templates for Chatbot Workflows
 */

export const FLOW_TEMPLATES = [
  {
    id: "lead_generation",
    name: "Lead Generation & Qualification",
    category: "Marketing & Sales",
    description: "Capture visitor contact details, qualify budget & timeline, and automatically route qualified leads into your CRM.",
    icon: "Target",
    color: "from-blue-500 to-indigo-600",
    nodes: {
      root: {
        type: "message",
        message: "Welcome! 👋 Are you looking to upgrade your team's software tools today?",
        options: [
          { text: "Yes, get a quote", next: "qualify_form" },
          { text: "Just browsing", next: "browsing_info" }
        ],
        position: { x: 100, y: 150 }
      },
      qualify_form: {
        type: "form",
        message: "Great! Please fill out your details so our sales team can prepare a custom quote.",
        fields: [
          { name: "full_name", type: "text", label: "Full Name", required: true },
          { name: "work_email", type: "email", label: "Work Email", required: true },
          { name: "company_size", type: "dropdown", label: "Company Size", required: true, options: ["1-10 employees", "11-50 employees", "50+ employees"] }
        ],
        next: "crm_lead_action",
        position: { x: 450, y: 150 }
      },
      crm_lead_action: {
        type: "action",
        actionType: "create_lead",
        next: "lead_success",
        position: { x: 800, y: 150 }
      },
      lead_success: {
        type: "message",
        message: "Thank you! 🚀 Your details have been submitted. An account specialist will reach out shortly.",
        isSolution: true,
        position: { x: 1150, y: 150 }
      },
      browsing_info: {
        type: "message",
        message: "No problem! Feel free to explore our product features or reach out if you have any questions.",
        isSolution: true,
        position: { x: 450, y: 400 }
      }
    }
  },
  {
    id: "customer_support",
    name: "Customer Support & Triage",
    category: "Support",
    description: "Intelligent triage flow that checks agent status, offers self-service answers, or escalates to live agents.",
    icon: "Headphones",
    color: "from-purple-500 to-indigo-600",
    nodes: {
      root: {
        type: "message",
        message: "Hi there! 👋 How can our support team assist you today?",
        options: [
          { text: "Technical Issue", next: "tech_check_agent" },
          { text: "Billing & Invoicing", next: "billing_faq" },
          { text: "Speak to Live Agent", next: "escalate_support" }
        ],
        position: { x: 100, y: 150 }
      },
      tech_check_agent: {
        type: "condition",
        conditionType: "agents_online",
        trueNext: "escalate_support",
        falseNext: "tech_offline_form",
        position: { x: 450, y: 100 }
      },
      escalate_support: {
        type: "action",
        actionType: "escalate",
        department: "Technical Support",
        next: "agent_connected",
        position: { x: 800, y: 100 }
      },
      agent_connected: {
        type: "message",
        message: "Connecting you to a support specialist. Average wait time: ~1 minute.",
        isSolution: true,
        position: { x: 1150, y: 100 }
      },
      tech_offline_form: {
        type: "form",
        message: "Our agents are currently offline. Leave your email and description to create a support ticket.",
        fields: [
          { name: "email", type: "email", label: "Email Address", required: true },
          { name: "issue", type: "textarea", label: "Issue Description", required: true }
        ],
        next: "ticket_action",
        position: { x: 800, y: 350 }
      },
      ticket_action: {
        type: "action",
        actionType: "create_ticket",
        next: "ticket_success",
        position: { x: 1150, y: 350 }
      },
      ticket_success: {
        type: "message",
        message: "Ticket created successfully! We will email you a response shortly.",
        isSolution: true,
        position: { x: 1500, y: 350 }
      },
      billing_faq: {
        type: "message",
        message: "You can view and download all invoices under Account Settings > Billing tab.",
        isSolution: true,
        position: { x: 450, y: 450 }
      }
    }
  },
  {
    id: "appointment_booking",
    name: "Appointment & Demo Booking",
    category: "Sales",
    description: "Automated schedule builder for product demos and consultation bookings.",
    icon: "Calendar",
    color: "from-emerald-500 to-teal-600",
    nodes: {
      root: {
        type: "message",
        message: "Ready to see a live 1-on-1 demonstration of our platform?",
        options: [
          { text: "Schedule 15-Min Demo", next: "demo_form" }
        ],
        position: { x: 100, y: 150 }
      },
      demo_form: {
        type: "form",
        message: "Please enter your information to select a time slot.",
        fields: [
          { name: "full_name", type: "text", label: "Your Name", required: true },
          { name: "email", type: "email", label: "Work Email", required: true },
          { name: "preferred_time", type: "dropdown", label: "Preferred Time", required: true, options: ["Morning (9am - 12pm)", "Afternoon (1pm - 5pm)"] }
        ],
        next: "booking_action",
        position: { x: 450, y: 150 }
      },
      booking_action: {
        type: "action",
        actionType: "create_callback_request",
        next: "booking_done",
        position: { x: 800, y: 150 }
      },
      booking_done: {
        type: "message",
        message: "Demo booked! Calendar invitation sent to your email.",
        isSolution: true,
        position: { x: 1150, y: 150 }
      }
    }
  },
  {
    id: "ai_faq_bot",
    name: "AI Knowledge Base FAQ Bot",
    category: "AI & Automation",
    description: "AI-driven bot that answers visitor questions instantly using your trained Knowledge Base.",
    icon: "Bot",
    color: "from-violet-500 to-purple-600",
    nodes: {
      root: {
        type: "message",
        message: "Hi! I am your AI Assistant 🤖. How can I help you today?",
        options: [
          { text: "Ask AI a Question", next: "ai_agent" },
          { text: "Common Questions", next: "faq_list" }
        ],
        position: { x: 100, y: 150 }
      },
      ai_agent: {
        type: "ai_response",
        prompt: "Answer visitor questions politely using company documentation.",
        aiModel: "gpt-4o-mini",
        next: "ai_followup",
        position: { x: 450, y: 100 }
      },
      ai_followup: {
        type: "message",
        message: "Did this answer your question?",
        options: [
          { text: "Yes, thanks!", next: "ai_done" },
          { text: "No, talk to human", next: "escalate_human" }
        ],
        position: { x: 800, y: 100 }
      },
      ai_done: {
        type: "message",
        message: "Glad to help! Have a wonderful day.",
        isSolution: true,
        position: { x: 1150, y: 100 }
      },
      escalate_human: {
        type: "action",
        actionType: "escalate",
        department: "Support",
        position: { x: 1150, y: 300 }
      },
      faq_list: {
        type: "message",
        message: "Here are popular quick links: \n• Pricing & Plans\n• Integration Docs\n• Security Policy",
        isSolution: true,
        position: { x: 450, y: 350 }
      }
    }
  }
];
