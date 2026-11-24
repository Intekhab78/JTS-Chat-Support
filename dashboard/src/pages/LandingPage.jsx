import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code,
  Copy,
  CreditCard,
  Globe,
  Headphones,
  Layers,
  Lock,
  Mail,
  Menu,
  MessageSquare,
  Package,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { api } from "../api/client.js";

const PLATFORM_SUITES = [
  {
    icon: MessageSquare,
    tag: "Support",
    title: "Omnichannel Inbox & AI Copilot",
    desc: "Live chat widget (12KB), WhatsApp, Email, Voice logs, canned responses, and 1-click AI auto-drafting.",
    highlights: [
      "12KB async live chat & AI voice widget",
      "Unified WhatsApp, Email & Web Chat inbox",
      "1-click Gemini AI reply drafting & translation",
      "Real-time agent assignment & typing indicators",
    ],
    ctaLabel: "Try AI Sandbox",
    ctaAction: "sandbox",
  },
  {
    icon: Users,
    tag: "CRM",
    title: "CRM, Deals & Customer 360°",
    desc: "Lead directory, Kanban deal stages, sales targets, activity timeline, and unified customer profiles.",
    highlights: [
      "Drag-and-drop Kanban deal pipeline",
      "Automated lead capture & heat scoring",
      "360° customer timeline (chats, calls, quotes, tickets)",
      "Sales executive targets & win-probability insights",
    ],
    ctaLabel: "Launch CRM Workspace",
    ctaAction: "register",
  },
  {
    icon: CreditCard,
    tag: "Finance",
    title: "Quotes, Invoices & Ledger",
    desc: "Auto-generate invoices from accepted quotes, track Razorpay/Stripe payments, refunds, and subscriptions.",
    highlights: [
      "1-click Quote-to-Invoice conversion",
      "Online Razorpay & Stripe payment links",
      "Multi-currency billing (AED, USD, INR) & tax",
      "General ledger, receivables & PDF receipts",
    ],
    ctaLabel: "Explore Billing Plans",
    ctaAction: "pricing",
  },
  {
    icon: Package,
    tag: "Operations",
    title: "Inventory, Procurement & Suppliers",
    desc: "Stock in/out tracking, product catalog, purchase orders, supplier portal, and stock adjustments.",
    highlights: [
      "Real-time SKU catalog & low-stock alerts",
      "Purchase orders & GRN receiving workflow",
      "Dedicated Supplier Portal for order fulfillment",
      "AI Voice & Chat catalog recommendations",
    ],
    ctaLabel: "Start Free Workspace",
    ctaAction: "register",
  },
  {
    icon: BarChart3,
    tag: "Analytics",
    title: "BI Dashboards & 24 Reports",
    desc: "Executive KPI command center, MRR/ARR insights, agent metrics, and CSV, Excel & PDF exports.",
    highlights: [
      "24 pre-built executive & operations report cards",
      "Agent SLA, CSAT & first-response analytics",
      "Revenue, MRR/ARR & pipeline conversion charts",
      "Instant CSV, Excel & PDF report exports",
    ],
    ctaLabel: "View Plans & Limits",
    ctaAction: "pricing",
  },
  {
    icon: Ticket,
    tag: "Helpdesk",
    title: "SLA Ticketing & Knowledge Hub",
    desc: "Department routing, automated SLA breach escalation, self-service help center, and ticket status portal.",
    highlights: [
      "Auto-routed tickets from Chat, Voice & Email",
      "Automated SLA breach escalation engine",
      "Public self-service ticket status tracker",
      "AI-indexed Knowledge Base & FAQ articles",
    ],
    ctaLabel: "Track a Ticket",
    ctaAction: "track_ticket",
  },
  {
    icon: Workflow,
    tag: "Automation",
    title: "Flow Builder & Low-Code Studio",
    desc: "Visual automation workflows, AI knowledge sources, custom CRM fields, feature flags, and webhooks.",
    highlights: [
      "Visual drag-and-drop chatbot decision flows",
      "Business hours & condition-based routing",
      "Custom CRM fields, webhooks & REST triggers",
      "Zero-code lead & ticket conversion nodes",
    ],
    ctaLabel: "See Integrations",
    ctaAction: "integrations",
  },
  {
    icon: ShieldCheck,
    tag: "Security",
    title: "2FA, RBAC & Multi-Domain",
    desc: "Role-based access across 8+ roles, 2FA authenticator, audit logs, and isolated multi-website controls.",
    highlights: [
      "Granular module & button-level RBAC permissions",
      "Multi-tenant isolation across multiple websites",
      "2FA authenticator & session timeout controls",
      "Complete security audit logs & IP tracking",
    ],
    ctaLabel: "Explore 8 Role Portals",
    ctaAction: "integrations",
  },
];

const SANDBOX_PROMPTS = [
  {
    q: "How fast is widget setup?",
    a: "Under 2 minutes! Paste the 1-line 12KB script into your website header and start chatting live.",
  },
  {
    q: "Can I start for free?",
    a: "Yes! Our Free Starter tier ($0/mo) includes 1 agent, 1 website, and live chat forever—no card needed.",
  },
  {
    q: "Does it include CRM & Invoicing?",
    a: "Yes! Leads, Deals, Quotations, Invoices, Payments Ledger, and Customer Portal are all built in.",
  },
  {
    q: "Does it include BI & Reports?",
    a: "Yes! Real-time KPIs, MRR/ARR analytics, SLA tracking, and 24 exportable report cards (CSV, Excel, PDF).",
  },
];

const TESTIMONIALS = [
  {
    name: "Mohit Kumar",
    role: "Operations Director, Al Reza Global",
    avatar: "MK",
    rating: "5.0",
    badge: "Verified Enterprise",
    text: "1-line script installation took under 2 minutes, and AI Auto-Drafting saves our support agents 3+ hours every day.",
  },
  {
    name: "Sarah Ross",
    role: "Founder, LuxeGlow Commerce",
    avatar: "SR",
    rating: "5.0",
    badge: "Verified E-Commerce",
    text: "Managing 5 store domains from one workspace with isolated CRM, inventory, and billing simplified our entire operation.",
  },
  {
    name: "James Sterling",
    role: "VP of Support, SaaSify Corp",
    avatar: "JS",
    rating: "4.9",
    badge: "Verified SaaS",
    text: "Deal pipelines, instant quotations, and automated subscription renewals in one place cut our tool stack in half.",
  },
];

const INTEGRATIONS_LIST = [
  {
    icon: MessageSquare,
    name: "WhatsApp Business",
    tag: "Omnichannel",
    desc: "Connect Meta WhatsApp Cloud API to receive customer messages, send ticket alerts, and reply directly from the unified inbox.",
    endpoint: "Webhook: /api/webhooks/whatsapp",
  },
  {
    icon: Mail,
    name: "Email & SMTP Sync",
    tag: "Messaging",
    desc: "Send automated ticket confirmations, quotations, invoices, and SLA escalation alerts via your custom SMTP server.",
    endpoint: "Protocol: TLS / SMTP Relay",
  },
  {
    icon: Phone,
    name: "Voice Call Logs",
    tag: "Telephony",
    desc: "24/7 AI Voice Bot + WebRTC live agent calling with unified transcript sync, call recording logs, and smart ticket deduplication.",
    endpoint: "Engine: WebRTC + Gemini Voice RAG",
  },
  {
    icon: CreditCard,
    name: "Razorpay & Stripe",
    tag: "Payments",
    desc: "Accept instant invoice payments, manage SaaS subscriptions, and automate payment webhook reconciliation.",
    endpoint: "Gateways: Razorpay & Stripe Checkout",
  },
  {
    icon: Workflow,
    name: "REST Webhooks",
    tag: "Automation",
    desc: "Trigger real-time HMAC-signed HTTP webhooks when leads are captured, deals close, or tickets are created.",
    endpoint: "Events: lead.*, ticket.*, invoice.*",
  },
  {
    icon: Code,
    name: "WordPress / JS 12KB",
    tag: "1-Line Embed",
    desc: "Drop a single 12KB async script tag into WordPress, Shopify, React, or any HTML site to go live in under 2 minutes.",
    endpoint: "<script src='.../chat-widget.js'>",
  },
];

const ROLE_WORKSPACES = [
  { name: "Client Owner", path: "/client", desc: "Full control over websites, team roles, billing plans, CRM, AI settings, and analytics." },
  { name: "Support Agent", path: "/agent", desc: "Handle assigned live chats, voice calls, canned responses, AI drafts, and SLA tickets." },
  { name: "Sales Executive", path: "/sales", desc: "Manage qualified leads, Kanban deals, quotations, sales targets, and follow-up tasks." },
  { name: "Team Manager", path: "/manager", desc: "Monitor live agent queues, reassign chats, track SLA escalations, and review team KPIs." },
  { name: "Accounts", path: "/accounts", desc: "Manage customer invoices, payment collections, general ledger, and financial reports." },
  { name: "Purchase", path: "/purchase", desc: "Create purchase orders, manage vendor procurement, and track inventory stock levels." },
  { name: "Supplier Portal", path: "/supplier", desc: "Dedicated external portal for suppliers to view POs, confirm shipments, and submit invoices." },
  { name: "Super Admin", path: "/admin", desc: "Platform-wide multi-tenant governance, subscription plans, audit logs, and system health." },
];

const FAQS = [
  {
    q: "Is there a free plan available?",
    a: "Yes. You can register on our Free Starter plan ($0/mo) with no credit card required, or start a 14-day free trial on any paid tier.",
  },
  {
    q: "Can I upgrade, downgrade, or switch plans anytime?",
    a: "Yes. Clients can upgrade or switch plans directly from the Billing & Plans section inside the dashboard.",
  },
  {
    q: "Does it support multiple websites and teams?",
    a: "Yes. You can register multiple website domains under one account, assign agents by department, and toggle modules per domain.",
  },
  {
    q: "What security & isolation controls are included?",
    a: "Every workspace uses strict multi-tenant website isolation, role-based access control (RBAC), optional 2FA, and audit logging.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);
  const [dbPlans, setDbPlans] = useState([]);
  const [userCustomInput, setUserCustomInput] = useState("");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [heroDraftSent, setHeroDraftSent] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketLookupId, setTicketLookupId] = useState("");

  // Widget customizer preview state
  const [previewColor, setPreviewColor] = useState("#4f46e5");
  const [previewTitle, setPreviewTitle] = useState("JTS Support Desk");
  const [previewWelcome, setPreviewWelcome] = useState("Hi! How can we help you today?");

  // Sandbox chat state
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "agent",
      text: "Welcome to JTS Support! Click a question below or type your own to test our AI Copilot.",
    },
  ]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [sandboxTurns, setSandboxTurns] = useState(0);
  const sandboxFeedRef = useRef(null);
  const MAX_SANDBOX_TURNS = 10;

  useEffect(() => {
    if (sandboxFeedRef.current) {
      sandboxFeedRef.current.scrollTop = sandboxFeedRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  useEffect(() => {
    let isMounted = true;
    setPlansLoading(true);
    api("/api/subscription-plans")
      .then((fetched) => {
        if (!isMounted) return;
        if (Array.isArray(fetched)) {
          const active = fetched.filter((p) => p?.isActive !== false);
          setDbPlans(active);
        } else {
          setDbPlans([]);
        }
      })
      .catch(() => {
        if (isMounted) setDbPlans([]);
      })
      .finally(() => {
        if (isMounted) setPlansLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const plans = dbPlans;

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handlePromptClick = (prompt) => {
    if (isTyping) return;
    setChatMessages((prev) => [...prev, { sender: "user", text: prompt.q }]);
    setIsTyping(true);
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { sender: "agent", text: prompt.a }]);
      setIsTyping(false);
    }, 500);
  };

  const handleCustomSend = async (e) => {
    e.preventDefault();
    const query = userCustomInput.trim().slice(0, 300);
    if (!query || isTyping) return;
    setUserCustomInput("");
    const nextHistory = [...chatMessages, { sender: "user", text: query }];
    setChatMessages(nextHistory);

    if (sandboxTurns >= MAX_SANDBOX_TURNS) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text: "You've reached the live demo preview limit (10 messages). Create a free account in 30 seconds to continue with unlimited AI Copilot access!",
          action: { label: "Start Free Forever →", path: "/login?mode=register&plan=free" },
        },
      ]);
      return;
    }

    setSandboxTurns((n) => n + 1);
    setIsTyping(true);

    const lower = query.toLowerCase();
    let actionButton = null;
    if (lower.includes("account") || lower.includes("create") || lower.includes("register") || lower.includes("sign up") || lower.includes("start")) {
      actionButton = { label: "Create Free Account →", path: "/login?mode=register&plan=free" };
    } else if (lower.includes("sign in") || lower.includes("login")) {
      actionButton = { label: "Sign In →", path: "/login?mode=login" };
    } else if (lower.includes("portal")) {
      actionButton = { label: "Open Customer Portal →", path: "/customer-portal" };
    }

    try {
      const data = await api("/api/widget/sandbox-ai", {
        method: "POST",
        body: JSON.stringify({ query, history: nextHistory.slice(-6) }),
      });
      const replyText =
        data?.text ||
        "JTS Support unifies AI Live Chat, CRM, Invoicing, Inventory, and BI Reports in one workspace.";
      setChatMessages((prev) => [...prev, { sender: "agent", text: replyText, action: actionButton }]);
    } catch {
      let fallbackReply =
        "JTS Support unifies live chat, AI Copilot, CRM deals, invoicing, inventory, and BI analytics in one fast workspace.";
      if (lower.includes("account") || lower.includes("create") || lower.includes("register") || lower.includes("sign up")) {
        fallbackReply =
          "Click 'Start Free Forever' (or the button below) to create your workspace in 30 seconds — no credit card required!";
      } else if (lower.includes("price") || lower.includes("free") || lower.includes("plan")) {
        fallbackReply = plans.length > 0
          ? `Available plans: ${plans.map((p) => `${p.name} (${p.currencySymbol || "$"}${p.monthlyPrice}/mo)`).join(", ")}. Annual billing saves up to 20%.`
          : "Check the pricing section below for our current plans and limits.";
      } else if (lower.includes("report") || lower.includes("bi") || lower.includes("analytics")) {
        fallbackReply =
          "Built-in BI Analytics, MRR/ARR tracking, and 24 exportable report cards (CSV, Excel, PDF) are included.";
      }
      setChatMessages((prev) => [...prev, { sender: "agent", text: fallbackReply, action: actionButton }]);
    } finally {
      setIsTyping(false);
    }
  };

  const copyScriptSnippet = () => {
    navigator.clipboard.writeText(
      `<script src="https://chatapi.jtsmiddleeast.com/chat-widget.js" data-api-key="YOUR_API_KEY"></script>`
    );
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="w-full h-screen overflow-y-auto overflow-x-hidden scroll-smooth bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* 1. COMPACT STICKY HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200/80">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => scrollToSection("hero")}
            className="flex items-center gap-2 text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-baseline gap-0.5 text-sm font-extrabold tracking-tight leading-none">
                <span className="text-slate-900">JTS</span>
                <span className="text-indigo-600">Support</span>
              </div>
              <span className="block text-[9px] font-semibold text-slate-400 tracking-wide">
                Enterprise AI &amp; CRM
              </span>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-5">
            {[
              ["Modules", "modules"],
              ["Live Demo", "sandbox"],
              ["Integrations", "integrations"],
              ["Pricing", "pricing"],
              ["FAQ", "faq"],
            ].map(([label, id]) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/login?mode=login")}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate("/login?mode=register&plan=free")}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-xs font-semibold text-white shadow-[0_6px_16px_-4px_rgba(79,70,229,0.45)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Start Free
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                ["Modules", "modules"],
                ["Live Demo", "sandbox"],
                ["Setup", "setup"],
                ["Pricing", "pricing"],
                ["FAQ", "faq"],
              ].map(([label, id]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className="text-left text-xs font-semibold text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate("/login?mode=login")}
                className="flex-1 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => navigate("/login?mode=register&plan=free")}
                className="flex-1 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
              >
                Start Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. COMPACT HERO SECTION */}
      <section id="hero" className="relative overflow-hidden border-b border-slate-100">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 relative z-10 grid lg:grid-cols-12 gap-6 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200/70">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              All-in-One AI Support, CRM &amp; ERP Suite
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Customer Support, CRM &amp;{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                AI Operations
              </span>{" "}
              in One Workspace.
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-lg">
              Unify real-time live chat, AI Copilot auto-drafting, sales deals, invoicing, inventory, and BI analytics without juggling 6 different tools.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => navigate("/login?mode=register&plan=free")}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                Start Free Forever
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("sandbox")}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
                Try Live Sandbox
              </button>
              <button
                type="button"
                onClick={() => navigate("/customer-portal")}
                className="px-3 py-2.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Customer Portal →
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> No credit card required
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 2-minute 12KB widget
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 14-day Pro trial
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> 4.9/5 Rated · 98.4% CSAT
              </span>
            </div>
          </div>

          {/* Right Clean Command Center Preview */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.1)] overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-[11px] font-semibold text-slate-600">
                    JTS Command Center
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Operational
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { label: "Active Queue", value: "128 Live", color: "text-slate-900", target: "modules" },
                    { label: "AI Draft Rate", value: "96.4%", color: "text-indigo-600", target: "sandbox" },
                    { label: "Avg Resolution", value: "1m 42s", color: "text-emerald-600", target: "pricing" },
                  ].map((kpi) => (
                    <button
                      key={kpi.label}
                      type="button"
                      onClick={() => scrollToSection(kpi.target)}
                      className="rounded-xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 p-2.5 text-left transition-all cursor-pointer"
                    >
                      <div className="text-[10px] font-semibold text-slate-500">{kpi.label}</div>
                      <div className={`text-sm font-extrabold mt-0.5 ${kpi.color}`}>
                        {kpi.value}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => scrollToSection("sandbox")}
                  className="w-full text-left rounded-xl border border-slate-200/80 hover:border-indigo-300 p-3 flex items-center justify-between gap-3 bg-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      AV
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        Alex Vance · Enterprise Lead
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        “Can we enable AI Copilot + CRM on 3 domains?”
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold shrink-0">
                    Hot 96%
                  </span>
                </button>

                <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />{" "}
                      {heroDraftSent ? "AI Reply Dispatched Live!" : "AI Copilot Auto-Draft Ready"}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">
                      “Yes! Pro supports 10 domains with isolated CRM &amp; AI toggles.”
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setHeroDraftSent(true);
                      setTimeout(() => setHeroDraftSent(false), 2500);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-white text-[10px] font-semibold shrink-0 cursor-pointer transition-all inline-flex items-center gap-1 ${
                      heroDraftSent
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {heroDraftSent ? (
                      <>
                        <Check className="w-3 h-3" /> Sent
                      </>
                    ) : (
                      "1-Click Send"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. COMPACT TRUST STRIP */}
      <section className="bg-slate-50/70 border-b border-slate-200/70">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {[
            [Zap, "99.99% Uptime SLA", () => scrollToSection("modules")],
            [Globe, "Multi-Tenant Isolation", () => scrollToSection("integrations")],
            [Lock, "2FA & RBAC Security", () => scrollToSection("integrations")],
            [Building2, "Client Portal & Helpdesk", () => navigate("/customer-portal")],
            [BarChart3, "BI & 24 Report Cards", () => scrollToSection("modules")],
            [Clock, "2-Min Widget Setup", () => scrollToSection("setup")],
          ].map(([Icon, text, onClick]) => (
            <button
              key={text}
              type="button"
              onClick={onClick}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <Icon className="w-3.5 h-3.5 text-indigo-600" />
              <span>{text}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. COMPLETE PLATFORM MODULES (ALL REAL FEATURES) */}
      <section id="modules" className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-6">
        <div className="max-w-xl mb-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
            Complete Platform Suite
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Every Module Your Business Needs — Unified
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Built-in support, CRM, finance, inventory, compliance, and automation with role-based permissions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {PLATFORM_SUITES.map((suite) => {
            const { icon: Icon, tag, title, desc } = suite;
            return (
              <button
                key={title}
                type="button"
                onClick={() => setSelectedModule(suite)}
                className="group text-left rounded-2xl border border-slate-200/85 bg-white p-4 hover:border-indigo-400 hover:shadow-[0_10px_28px_-12px_rgba(79,70,229,0.22)] transition-all space-y-2 cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {tag}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug group-hover:text-indigo-700 transition-colors">
                    {title}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
                </div>
                <div className="pt-1 text-[10.5px] font-bold text-indigo-600 inline-flex items-center gap-1 opacity-80 group-hover:opacity-100">
                  <span>Explore details</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. INTERACTIVE SANDBOX & WIDGET CUSTOMIZER */}
      <section id="sandbox" className="bg-slate-50/70 border-y border-slate-200/70">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-6 grid lg:grid-cols-12 gap-5 items-start">
          {/* Interactive AI Chat */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">
                  Interactive AI Support Sandbox
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                Live Preview
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div ref={sandboxFeedRef} className="h-44 overflow-y-auto space-y-2 pr-1 scroll-smooth">
                {chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed font-medium ${m.sender === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-800"
                        }`}
                    >
                      {m.text}
                      {m.action && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => navigate(m.action.path)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            {m.action.label}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-[11px] text-slate-500 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                      <span className="ml-1">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SANDBOX_PROMPTS.map((p) => (
                  <button
                    key={p.q}
                    type="button"
                    onClick={() => handlePromptClick(p)}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/70 transition-colors cursor-pointer"
                  >
                    {p.q}
                  </button>
                ))}
              </div>

              <form onSubmit={handleCustomSend} className="flex gap-2">
                <input
                  value={userCustomInput}
                  onChange={(e) => setUserCustomInput(e.target.value)}
                  maxLength={300}
                  placeholder={sandboxTurns >= MAX_SANDBOX_TURNS ? "Demo limit reached — Start free to continue..." : "Ask about pricing, CRM, or setup..."}
                  className="flex-1 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Live Widget Customizer & 1-Line Embed */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">
                  Widget Customizer &amp; 1-Line Embed
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">12KB Async Script</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Widget Title
                </label>
                <input
                  value={previewTitle}
                  onChange={(e) => setPreviewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Brand Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#0f172a"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPreviewColor(c)}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer ${previewColor === c ? "border-slate-900 scale-110" : "border-white shadow-xs"
                        }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Welcome Message
              </label>
              <input
                value={previewWelcome}
                onChange={(e) => setPreviewWelcome(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
              />
            </div>

            {/* Mini Live Widget Preview */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <div
                className="px-3 py-2 text-white text-xs font-bold flex items-center justify-between"
                style={{ backgroundColor: previewColor }}
              >
                <span>{previewTitle}</span>
                <span className="text-[10px] opacity-90">Online</span>
              </div>
              <div className="p-3 text-[11px] text-slate-700 bg-white">{previewWelcome}</div>
            </div>

            {/* Script Copy Box */}
            <div className="rounded-xl bg-slate-900 text-slate-200 p-2.5 flex items-center justify-between gap-2">
              <code className="text-[10px] font-mono truncate">
                {`<script src="https://chatapi.jtsmiddleeast.com/chat-widget.js" data-api-key="YOUR_API_KEY"></script>`}
              </code>
              <button
                type="button"
                onClick={copyScriptSnippet}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold shrink-0 inline-flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                {copiedSnippet ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. 3-STEP SETUP GUIDE */}
      <section id="setup" className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-6">
        <div className="text-center max-w-lg mx-auto mb-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
            Quick Onboarding
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Go Live in 3 Simple Steps
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              title: "Create Free Workspace",
              desc: "Register in 30 seconds on Free Starter ($0/mo) or a 14-day Pro trial—no card required.",
            },
            {
              step: "02",
              title: "Add Website & Embed Script",
              desc: "Register your domain, generate a cryptographic widget key, and paste the 12KB script.",
            },
            {
              step: "03",
              title: "Enable AI, CRM & Billing",
              desc: "Invite agents, turn on AI Copilot, manage deals/invoices, and track SLA compliance.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-slate-200/85 bg-white p-4 space-y-1.5"
            >
              <span className="inline-block text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                STEP {item.step}
              </span>
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. PRICING SECTION (SYNCED WITH LIVE API + FREE TIER) */}
      <section id="pricing" className="bg-slate-50/70 border-y border-slate-200/70">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                Transparent Pricing
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Start Free, Scale As You Grow
              </h2>
            </div>

            <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200 self-start sm:self-auto">
              {["monthly", "annual"].map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setBillingPeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${billingPeriod === period
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {period === "monthly" ? "Monthly" : "Annual (Save 20%)"}
                </button>
              ))}
            </div>
          </div>

          {plansLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200/80 animate-pulse p-4" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-xs text-slate-500">
              No active subscription plans configured yet.
            </div>
          ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${plans.length >= 5 ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4"}`}>
            {plans.map((plan) => {
              const code = String(plan.code || "basic").toLowerCase();
              const isFree = code === "free" || Number(plan.monthlyPrice) === 0;
              const price = isFree
                ? 0
                : billingPeriod === "annual"
                  ? Math.round((plan.annualPrice || plan.monthlyPrice * 10) / 12)
                  : plan.monthlyPrice;
              const symbol = plan.currencySymbol || "$";

              return (
                <div
                  key={plan._id || code}
                  className={`rounded-2xl bg-white p-4 flex flex-col justify-between border transition-all ${plan.isPopular
                      ? "border-indigo-500 ring-2 ring-indigo-500/15 shadow-[0_12px_30px_-12px_rgba(79,70,229,0.25)]"
                      : "border-slate-200/90"
                    }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{plan.name}</h3>
                      {plan.isPopular && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Popular
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-slate-900">
                        {symbol}
                        {price}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">/month</span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-snug min-h-[32px]">
                      {plan.description}
                    </p>

                    <ul className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-700">
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Up to {plan.limits?.agents ?? 2} Agents</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Up to {plan.limits?.websites ?? 1} Website Domains</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">
                          {(plan.includedModules || []).slice(0, 4).join(", ") || "Core Support"}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/login?mode=register&plan=${code}`)}
                    className={`mt-4 w-full py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${plan.isPopular
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xs"
                        : "bg-slate-900 hover:bg-indigo-600 text-white"
                      }`}
                  >
                    {isFree ? "Start Free Forever" : "Start 14-Day Trial"}
                  </button>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </section>

      {/* 8. INTEGRATIONS & ROLE-BASED WORKSPACES */}
      <section id="integrations" className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-6 border-b border-slate-100">
        <div className="grid lg:grid-cols-12 gap-5 items-stretch">
          {/* Integrations */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200/85 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Connected Ecosystem
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Built-In Channels &amp; Integrations
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                API &amp; Webhooks
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INTEGRATIONS_LIST.map((item) => {
                const { icon: Icon, name, tag } = item;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedIntegration(item)}
                    className="group text-left rounded-xl border border-slate-200/80 hover:border-indigo-300 bg-slate-50/50 hover:bg-indigo-50/40 p-2.5 flex items-start gap-2 transition-all cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 group-hover:border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-900 group-hover:text-indigo-700 truncate">{name}</div>
                      <div className="text-[10px] text-slate-500">{tag}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 8 Role Workspaces & Self-Service Portal */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200/85 bg-white p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    Dedicated Workspaces
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    8 Role Portals + Customer Self-Service
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                  RBAC Isolated
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ROLE_WORKSPACES.map((roleItem) => (
                  <button
                    key={roleItem.name}
                    type="button"
                    onClick={() => setSelectedRole(roleItem)}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-300 text-[11px] font-semibold text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    {roleItem.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-indigo-50/60 border border-indigo-200/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Self-Service Customer &amp; Ticket Portal
                </div>
                <p className="text-[11px] text-slate-600">
                  Customers can accept quotations, pay invoices online, and track SLA ticket status.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate("/customer-portal")}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold cursor-pointer"
                >
                  Open Portal →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. TESTIMONIALS (WITH RATINGS) & COMPACT FAQ */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-6 space-y-6">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Trusted by Support &amp; Operations Teams
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 self-start sm:self-auto">
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="text-xs font-extrabold text-slate-900">4.9 / 5</span>
              <span className="text-[11px] font-medium text-slate-600">· 120+ Teams</span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3.5">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-slate-200/85 bg-white p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-0.5">
                    {[0, 1, 2, 3, 4].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                    <span className="ml-1.5 text-[11px] font-bold text-slate-800">{t.rating}</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                    {t.badge}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                  “{t.text}”
                </p>
                <div className="flex items-center gap-2.5 pt-1 border-t border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{t.name}</div>
                    <div className="text-[10px] text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ + Final CTA Split */}
        <div id="faq" className="grid lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mb-3">
              Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {FAQS.map((item, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div
                    key={item.q}
                    className="rounded-xl border border-slate-200/90 bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-900">{item.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-2.5 text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/70 p-5 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100/80 text-indigo-700 text-[10px] font-bold">
              <Sparkles className="w-3 h-3" /> Ready in 2 Minutes
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
              Launch Your AI Support &amp; CRM Workspace Today
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Start on our Free Starter plan ($0/mo) with no credit card required, or explore all Pro modules with a 14-day trial.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => navigate("/login?mode=register&plan=free")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-xs font-semibold text-white shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                Create Free Account
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/login?mode=login")}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. COMPLETE ENTERPRISE FOOTER */}
      <footer className="border-t border-slate-200/80 bg-slate-50/80">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 pb-8 border-b border-slate-200/80">
            {/* Brand & Compliance Summary */}
            <div className="lg:col-span-4 space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-black tracking-tight text-slate-900 leading-none">JTS Support</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 mt-0.5">
                    Enterprise AI, CRM &amp; Compliance
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 max-w-sm">
                Unified AI Live Chat, Visual Decision Flow Builder, CRM Pipeline, Quotations, Sales Orders,
                Invoicing, and Self-Service Customer Portal — engineered for fast-growing support and operations teams.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-bold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  99.9% Uptime SLA
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200/80 text-[10px] font-bold text-slate-600">
                  <Lock className="w-3 h-3 text-indigo-600" />
                  Tenant Isolated
                </span>
              </div>
            </div>

            {/* Platform Sections */}
            <div className="lg:col-span-2 space-y-2.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-900">Platform</p>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                {[
                  ["Platform Modules", "modules"],
                  ["Live AI Sandbox", "sandbox"],
                  ["2-Min Widget Setup", "setup"],
                  ["Integrations & API", "integrations"],
                  ["Plans & Pricing", "pricing"],
                  ["FAQs", "faq"],
                ].map(([label, sectionId]) => (
                  <li key={sectionId}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(sectionId)}
                      className="hover:text-indigo-600 transition-colors cursor-pointer text-left"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Portals & Quick Access */}
            <div className="lg:col-span-3 space-y-2.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-900">Portals &amp; Access</p>
              <ul className="space-y-2 text-xs font-medium text-slate-600">
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/login?mode=login")}
                    className="hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    Team &amp; Admin Sign In
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/login?mode=register&plan=free")}
                    className="hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    Create Free Workspace
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigate("/customer-portal")}
                    className="hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    Customer Self-Service Portal
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setTicketModalOpen(true)}
                    className="hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    Track Support Ticket Status
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact & Get Started */}
            <div className="lg:col-span-3 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-900">Support &amp; Contact</p>
              <div className="rounded-xl bg-white border border-slate-200/80 p-3.5 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <a href="mailto:support@jtsmiddleeast.com" className="font-semibold hover:text-indigo-600 truncate">
                    support@jtsmiddleeast.com
                  </a>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <a
                    href="https://www.jtsmiddleeast.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold hover:text-indigo-600 truncate"
                  >
                    www.jtsmiddleeast.com
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/login?mode=register&plan=free")}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <span>Start Free in 2 Minutes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Legal & Capability Strip */}
          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <p className="font-medium text-center sm:text-left">
              &copy; {new Date().getFullYear()} JTS Support &middot; JTS Technologies. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-semibold text-slate-500">
              <button
                type="button"
                onClick={() => scrollToSection("integrations")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Role-Based Access Control
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={() => scrollToSection("integrations")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Audit Logs &amp; Webhooks
              </button>
              <span className="text-slate-300">&bull;</span>
              <button
                type="button"
                onClick={() => scrollToSection("pricing")}
                className="hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Multi-Currency (AED / USD / INR)
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* MODULE DETAILS MODAL */}
      {selectedModule && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedModule(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <selectedModule.icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    {selectedModule.tag} Module
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    {selectedModule.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedModule(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{selectedModule.desc}</p>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-2">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                Included Capabilities
              </div>
              <ul className="space-y-1.5">
                {selectedModule.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const action = selectedModule.ctaAction;
                  setSelectedModule(null);
                  if (action === "register") navigate("/login?mode=register&plan=free");
                  else if (action === "track_ticket") setTicketModalOpen(true);
                  else scrollToSection(action);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <span>{selectedModule.ctaLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedModule(null);
                  navigate("/login?mode=register&plan=free");
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Start Free
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTEGRATION DETAILS MODAL */}
      {selectedIntegration && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedIntegration(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <selectedIntegration.icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    {selectedIntegration.tag}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    {selectedIntegration.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIntegration(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{selectedIntegration.desc}</p>

            <div className="rounded-xl bg-slate-900 text-slate-200 px-3 py-2.5 text-[11px] font-mono">
              {selectedIntegration.endpoint}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedIntegration(null);
                  navigate("/login?mode=register&plan=free");
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <span>Configure in Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedIntegration(null);
                  scrollToSection("sandbox");
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Live Sandbox
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROLE WORKSPACE PREVIEW MODAL */}
      {selectedRole && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedRole(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  RBAC Isolated Portal
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {selectedRole.name} Workspace
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{selectedRole.desc}</p>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 text-[11px] text-slate-600 flex items-center justify-between">
              <span className="font-semibold">Dedicated Route</span>
              <code className="font-mono font-bold text-indigo-600">{selectedRole.path}</code>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(null);
                  navigate("/login?mode=login");
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <span>Sign In to {selectedRole.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(null);
                  navigate("/login?mode=register&plan=free");
                }}
                className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Create Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRACK SUPPORT TICKET MODAL */}
      {ticketModalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setTicketModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Self-Service Helpdesk
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Track Support Ticket Status
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTicketModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanId = ticketLookupId.trim();
                if (!cleanId) return;
                setTicketModalOpen(false);
                navigate(`/ticket-status/${encodeURIComponent(cleanId)}`);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Enter Ticket ID
                </label>
                <input
                  value={ticketLookupId}
                  onChange={(e) => setTicketLookupId(e.target.value)}
                  placeholder="e.g. TCK_ebfa96e84ca7abb3"
                  className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 font-mono"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <span>Track Ticket</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTicketModalOpen(false);
                    navigate("/customer-portal");
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Customer Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
