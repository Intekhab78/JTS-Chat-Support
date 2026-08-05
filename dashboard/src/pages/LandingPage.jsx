import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, Cpu, GitBranch, Users, Ticket, Globe, BarChart, 
  Check, Zap, Shield, Crown, ArrowRight, Star, Sparkles, 
  Menu, X, ChevronDown, ChevronUp, Clock, ShieldCheck, Send, CheckCircle2,
  Building2, Layers, Headphones, DollarSign, FileSpreadsheet, Lock,
  Code, Terminal, FileText, CheckCircle, Flame, Activity, Award, Bell,
  Sliders, ArrowUpRight, Copy, CheckSquare, Palette, RefreshCw, Key,
  ShieldAlert, Database, HelpCircle, Mail, Phone, Calendar, PlayCircle,
  Network, Workflow, Command, Monitor, CpuIcon, Compass, Share2, Layers3
} from "lucide-react";
import { api } from "../api/client.js";

const DEFAULT_REAL_PLANS = [
  {
    _id: "basic",
    name: "Starter AI OS",
    code: "basic",
    description: "Essential live chat, AI intent engine, and basic lead capture for growing teams.",
    monthlyPrice: 49,
    annualPrice: 470,
    currencySymbol: "$",
    limits: { agents: 2, websites: 1 },
    includedModules: ["chat", "shortcuts", "security"],
    isPopular: false
  },
  {
    _id: "standard",
    name: "Professional OS",
    code: "standard",
    description: "Complete sales operations, invoicing, payments ledger, and helpdesk SLA ticketing.",
    monthlyPrice: 149,
    annualPrice: 1430,
    currencySymbol: "$",
    limits: { agents: 5, websites: 3 },
    includedModules: ["chat", "tickets", "shortcuts", "reports", "security"],
    isPopular: false
  },
  {
    _id: "pro",
    name: "Enterprise Pro OS",
    code: "pro",
    description: "Full AI OS suite including UAE VAT Compliance, Corporate Tax, AI Workflows & BI Analytics.",
    monthlyPrice: 349,
    annualPrice: 3350,
    currencySymbol: "$",
    limits: { agents: 10, websites: 10 },
    includedModules: ["chat", "tickets", "crm", "shortcuts", "reports", "security", "vat", "tax"],
    isPopular: true
  },
  {
    _id: "enterprise",
    name: "Custom Enterprise",
    code: "enterprise",
    description: "Dedicated infrastructure, security audit trail, custom SLA, and high-capacity domain slots.",
    monthlyPrice: 799,
    annualPrice: 7670,
    currencySymbol: "$",
    limits: { agents: 50, websites: 25 },
    includedModules: ["chat", "tickets", "crm", "shortcuts", "reports", "security", "vat", "tax", "audit"],
    isPopular: false
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [dbPlans, setDbPlans] = useState([]);
  const [userCustomInput, setUserCustomInput] = useState("");
  const [activeTabShowcase, setActiveTabShowcase] = useState("copilot");
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Widget preview interactive customizer
  const [previewColor, setPreviewColor] = useState("#4F8CFF");
  const [previewTitle, setPreviewTitle] = useState("JTS AI Support Desk");
  const [previewWelcome, setPreviewWelcome] = useState("Hello! How can JTS Enterprise AI Platform assist you today?");

  // Fetch real plans dynamically from MongoDB
  useEffect(() => {
    let isMounted = true;
    const loadDynamicPlans = async () => {
      try {
        const fetched = await api("/api/subscription-plans");
        if (isMounted && Array.isArray(fetched) && fetched.length > 0) {
          setDbPlans(fetched);
        } else if (isMounted) {
          setDbPlans(DEFAULT_REAL_PLANS);
        }
      } catch (err) {
        if (isMounted) setDbPlans(DEFAULT_REAL_PLANS);
      }
    };
    loadDynamicPlans();
    return () => { isMounted = false; };
  }, []);

  // Interactive Sandbox Chat State
  const [chatMessages, setChatMessages] = useState([
    { sender: "agent", text: "👋 Welcome to JTS Support! Test our real-time AI Auto-Draft & Intent Engine below." }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const sandboxPrompts = [
    { q: "How fast is widget installation?", a: "Installation takes under 2 minutes! Copy your 1-line cryptographic script snippet into your site HTML header or WordPress footer." },
    { q: "How does AI Auto-Drafting work?", a: "Our AI Copilot analyzes customer intent in real-time, calculates sentiment scores (e.g. 🔥 HOT INTENT 96%), and auto-drafts responses in 1-click." },
    { q: "Does it support UAE VAT & Tax?", a: "Yes! JTS includes built-in UAE VAT Return filing (Form 201), Corporate Tax ledger, Trade License renewal reminders, and FTA PDF exports." },
    { q: "Can we manage multi-site domains?", a: "Yes! A single unified command center lets you monitor, brand, and route live support chats across multiple websites with isolated module entitlements." }
  ];

  const handlePromptClick = (prompt) => {
    if (isTyping) return;
    setChatMessages(prev => [...prev, { sender: "user", text: prompt.q }]);
    setIsTyping(true);

    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: "agent", text: prompt.a }]);
      setIsTyping(false);
    }, 700);
  };

  const handleCustomSend = (e) => {
    e.preventDefault();
    if (!userCustomInput.trim() || isTyping) return;
    const query = userCustomInput.trim();
    setUserCustomInput("");
    setChatMessages(prev => [...prev, { sender: "user", text: query }]);
    setIsTyping(true);

    setTimeout(() => {
      let reply = "Thank you for reaching out! JTS Support combines real-time omnichannel live chat, AI Copilot auto-drafting, CRM lead management, and billing in one unified hub.";
      const lower = query.toLowerCase();
      if (lower.includes("price") || lower.includes("plan") || lower.includes("cost")) {
        reply = "Our growth plans start at $49/mo (Starter AI OS), $149/mo (Professional OS), $349/mo (Enterprise Pro OS ⭐), and $799/mo (Custom Enterprise) with 20% annual discount.";
      } else if (lower.includes("vat") || lower.includes("tax") || lower.includes("uae")) {
        reply = "JTS Support includes full UAE VAT, Corporate Tax & Trade License Compliance Hub with automated FTA audit reports & PDF invoicing!";
      } else if (lower.includes("agent") || lower.includes("team")) {
        reply = "You can invite agents, assign departments (Sales, Accounts, Support), and track real-time SLA metrics and response times.";
      }

      setChatMessages(prev => [...prev, { sender: "agent", text: reply }]);
      setIsTyping(false);
    }, 850);
  };

  const activePlansToRender = dbPlans.length > 0 ? dbPlans : DEFAULT_REAL_PLANS;

  const handleSelectPlan = (planCode) => {
    navigate(`/login?mode=register&plan=${planCode}`);
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const copyScriptSnippet = () => {
    navigator.clipboard.writeText(`<script src="http://localhost:5000/chat-widget.js" data-api-key="YOUR_API_KEY"></script>`);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const trustBadges = [
    { label: "99.99% Uptime SLA", icon: <Zap className="w-4 h-4 text-[#FFC857]" /> },
    { label: "ISO 27001 Ready", icon: <ShieldCheck className="w-4 h-4 text-[#4F8CFF]" /> },
    { label: "GDPR Compliant", icon: <Lock className="w-4 h-4 text-[#00D97E]" /> },
    { label: "UAE VAT & Tax Hub", icon: <Building2 className="w-4 h-4 text-[#00D4FF]" /> },
    { label: "2-Minute Setup", icon: <Clock className="w-4 h-4 text-[#7C5CFF]" /> },
    { label: "Enterprise SLA Desk", icon: <Ticket className="w-4 h-4 text-rose-400" /> },
    { label: "Autonomous AI Copilot", icon: <Cpu className="w-4 h-4 text-[#00D4FF]" /> },
    { label: "Multi-Tenant Isolation", icon: <Globe className="w-4 h-4 text-[#4F8CFF]" /> }
  ];

  const tenReasons = [
    { num: "01", title: "⚡ Subsecond Widget Load Time (12KB Script)", desc: "Lightweight 12KB script snippet loads in under 100ms without hurting your site's PageSpeed SEO ranking.", icon: <Zap className="text-[#FFC857]" /> },
    { num: "02", title: "🔑 Cryptographic Widget Key & Origin Lockdown", desc: "Each website domain is protected by cryptographic API keys and strict CORS origin domain security lockdown.", icon: <Key className="text-[#4F8CFF]" /> },
    { num: "03", title: "🔔 Automated Daily Expiry & Alert Cron Jobs", desc: "Background cron jobs send 7-day, 3-day, and on-expiry reminder emails to clients and admins automatically.", icon: <Bell className="text-rose-400" /> },
    { num: "04", title: "🔒 Granular Role-Based Access Control (RBAC)", desc: "Distinct user roles for Admin, Client, Manager, Agent, Supplier, Accounts, and Tax Consultant with strict permission guards.", icon: <Lock className="text-[#00D97E]" /> },
    { num: "05", title: "✨ AI Copilot & Sentiment Intent Scoring", desc: "Auto-drafts accurate agent responses in 1-click and flags Hot Sales Leads with real-time sentiment intent badges (🔥 96%).", icon: <Cpu className="text-[#00D4FF]" /> },
    { num: "06", title: "🇦🇪 GCC & UAE VAT, Corporate Tax & License Hub", desc: "Automated FTA Compliant VAT Return Form 201 filing, Corporate Tax ledger, and Trade License renewal tracking.", icon: <Building2 className="text-[#FFC857]" /> },
    { num: "07", title: "🎫 Helpdesk SLA Ticketing & Department Routing", desc: "Automatically converts offline inquiries into SLA tickets routed to Sales, Support, or Accounts with overdue escalation.", icon: <Ticket className="text-[#7C5CFF]" /> },
    { num: "08", title: "💼 Customer 360 CRM & Sales Pipelines", desc: "Manage Lead Directory, Deal Stages (Lead ➔ Quotation ➔ Won), sales orders, and automated quote dispatch.", icon: <Users className="text-[#4F8CFF]" /> },
    { num: "09", title: "📊 24 Master Report Cards & Multi-Format Exports", desc: "Financial MRR, SLA breaches, agent stats, and 24 report cards downloadable as CSV, Excel, or PDF.", icon: <BarChart className="text-[#00D97E]" /> },
    { num: "10", title: "🌐 Multi-Website Domain Management", desc: "Manage multiple websites from one account. Toggle specific feature modules (e.g. VAT ON/OFF) per domain.", icon: <Globe className="text-[#4F8CFF]" /> }
  ];

  const testimonials = [
    {
      name: "Mohit Kumar",
      role: "Operations Director, Al Reza Global (UAE)",
      avatar: "MK",
      color: "from-[#4F8CFF] to-[#7C5CFF]",
      text: "JTS Chat transformed our client support operations! The 1-line script installation took less than 2 minutes and AI Auto-Drafting saved our agents 3+ hours daily.",
      badge: "Verified Enterprise"
    },
    {
      name: "Sarah Ross",
      role: "Founder, LuxeGlow Cosmetics",
      avatar: "SR",
      color: "from-purple-400 to-pink-500",
      text: "Managing 5 distinct e-commerce store domains from a single unified workspace with isolated VAT module settings has simplified our business tremendously.",
      badge: "Verified E-Commerce"
    },
    {
      name: "James Sterling",
      role: "VP of Support, SaaSify Corp",
      avatar: "JS",
      color: "from-[#FFC857] to-amber-600",
      text: "The CRM pipelines, automated quotations, and instant Razorpay checkout portal have streamlined our client subscription renewals completely!",
      badge: "Verified SaaS"
    },
    {
      name: "Rashid Al-Maktoum",
      role: "Managing Director, Gulf Horizon Logistics",
      avatar: "RA",
      color: "from-[#00D97E] to-teal-600",
      text: "The UAE VAT Return filing & Corporate Tax compliance hub built directly into JTS Chat saved us thousands in external accounting audit costs.",
      badge: "Verified GCC Client"
    },
    {
      name: "Elena Rostova",
      role: "Head of Customer Care, FinTech Prime",
      avatar: "ER",
      color: "from-[#7C5CFF] to-purple-600",
      text: "The Helpdesk SLA ticketing and automated escalation alerts ensure no client inquiry goes unanswered. Our SLA compliance jumped to 99.4%!",
      badge: "Verified FinTech"
    },
    {
      name: "Vikram Malhotra",
      role: "CTO, CloudTech India",
      avatar: "VM",
      color: "from-[#00D4FF] to-blue-600",
      text: "The subsecond 12KB widget script is lightning fast! Zero impact on our site speed while providing instant live chat & AI auto-replies.",
      badge: "Verified Tech Partner"
    }
  ];

  const faqs = [
    {
      q: "Can I upgrade or downgrade my plan anytime?",
      a: "Yes! You can instantly upgrade, extend validity, or apply discount promo codes directly from your Client Billing Portal with Razorpay or 1-Click Express activation."
    },
    {
      q: "How does the AI Support Copilot work?",
      a: "The AI Copilot analyzes customer sentiment score (e.g. 96% Hot Lead Intent) and automatically generates context-aware draft replies for support agents in 1-click."
    },
    {
      q: "Does it support multiple website domains?",
      a: "Yes! You can register multiple domains under one client account, toggle specific module entitlements per website (e.g. UAE VAT, Finance), and manage everything from a central command center."
    },
    {
      q: "Are email notifications & expiry alerts included?",
      a: "Yes! Daily automated background cron jobs send 7-day, 3-day, and on-expiry reminder emails to clients and admins."
    }
  ];

  const integrationNodes = [
    { name: "WhatsApp Business API", tag: "Messaging", icon: <MessageSquare className="text-[#00D97E]" /> },
    { name: "WordPress & WooCommerce", tag: "E-Commerce", icon: <Globe className="text-[#4F8CFF]" /> },
    { name: "Shopify Storefront", tag: "Retail", icon: <Building2 className="text-[#00D4FF]" /> },
    { name: "REST Webhooks & Zapier", tag: "Automation", icon: <Workflow className="text-[#7C5CFF]" /> },
    { name: "Razorpay Payments", tag: "Checkout", icon: <DollarSign className="text-[#FFC857]" /> },
    { name: "Custom JS Embed Snippet", tag: "1-Line Setup", icon: <Code className="text-[#4F8CFF]" /> }
  ];

  return (
    <div className="w-full h-full overflow-y-auto scroll-smooth bg-[#050816] text-[#FFFFFF] font-sans selection:bg-[#4F8CFF] selection:text-white relative">
      
      {/* AURORA MESH BACKGROUND & SOFT NEON LIGHT ORBS */}
      <div className="fixed top-0 left-1/4 w-[850px] h-[850px] bg-gradient-to-tr from-[#4F8CFF]/15 via-[#7C5CFF]/10 to-[#00D4FF]/15 rounded-full blur-[190px] pointer-events-none" />
      <div className="fixed top-[650px] right-0 w-[750px] h-[750px] bg-gradient-to-br from-[#7C5CFF]/10 via-[#00D97E]/10 to-[#4F8CFF]/10 rounded-full blur-[190px] pointer-events-none" />
      
      {/* FINE SUBTLE GRID LINES PATTERN */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* 1. STICKY NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#050816]/85 border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection("hero")}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#4F8CFF] via-[#7C5CFF] to-[#00D4FF] flex items-center justify-center shadow-lg shadow-[#4F8CFF]/20 border border-white/10">
              <Command className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#4F8CFF] bg-clip-text text-transparent">JTS SUPPORT</span>
              <span className="block text-[8px] font-black text-[#00D4FF] tracking-[0.25em] uppercase leading-none">Enterprise AI Platform</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection("bento")} className="text-xs font-bold text-[#A9B3C7] hover:text-white tracking-wider uppercase transition-colors cursor-pointer">FEATURES</button>
            <button onClick={() => scrollToSection("modules")} className="text-xs font-bold text-[#A9B3C7] hover:text-white tracking-wider uppercase transition-colors cursor-pointer">MODULES</button>
            <button onClick={() => scrollToSection("setup-guide")} className="text-xs font-bold text-[#A9B3C7] hover:text-white tracking-wider uppercase transition-colors cursor-pointer">SETUP GUIDE</button>
            <button onClick={() => scrollToSection("reasons")} className="text-xs font-bold text-[#A9B3C7] hover:text-white tracking-wider uppercase transition-colors cursor-pointer">WHY JTS</button>
            <button onClick={() => scrollToSection("integrations")} className="text-xs font-bold text-[#A9B3C7] hover:text-white tracking-wider uppercase transition-colors cursor-pointer">INTEGRATIONS</button>
            <button onClick={() => scrollToSection("pricing")} className="text-xs font-bold text-[#A9B3C7] hover:text-white tracking-wider uppercase transition-colors cursor-pointer">PRICING</button>
            <button onClick={() => scrollToSection("faq")} className="text-xs font-bold text-[#A9B3C7] hover:text-white tracking-wider uppercase transition-colors cursor-pointer">FAQ</button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate("/login?mode=login")}
              className="text-xs font-bold uppercase tracking-wider text-[#A9B3C7] hover:text-white px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => scrollToSection("pricing")}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#4F8CFF] to-[#7C5CFF] hover:from-[#4F8CFF]/90 hover:to-[#7C5CFF]/90 text-xs font-black uppercase tracking-[0.15em] text-white shadow-xl shadow-[#4F8CFF]/25 transition-all hover:scale-105 cursor-pointer flex items-center gap-2 border border-white/10"
            >
              <Sparkles size={14} /> Start Free Trial
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-[#A9B3C7] hover:text-white transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.08] bg-[#050816]/95 backdrop-blur-2xl px-6 py-6 space-y-4">
            <button onClick={() => scrollToSection("bento")} className="block w-full text-left py-2 text-sm font-bold text-[#A9B3C7] hover:text-white">Features Bento</button>
            <button onClick={() => scrollToSection("modules")} className="block w-full text-left py-2 text-sm font-bold text-[#A9B3C7] hover:text-white">Enterprise Modules</button>
            <button onClick={() => scrollToSection("reasons")} className="block w-full text-left py-2 text-sm font-bold text-[#A9B3C7] hover:text-white">10 Key Reasons</button>
            <button onClick={() => scrollToSection("integrations")} className="block w-full text-left py-2 text-sm font-bold text-[#A9B3C7] hover:text-white">Ecosystem Integrations</button>
            <button onClick={() => scrollToSection("widget-preview")} className="block w-full text-left py-2 text-sm font-bold text-[#A9B3C7] hover:text-white">Studio Customizer</button>
            <button onClick={() => scrollToSection("pricing")} className="block w-full text-left py-2 text-sm font-bold text-[#A9B3C7] hover:text-white">Pricing Packages</button>
            <button onClick={() => scrollToSection("faq")} className="block w-full text-left py-2 text-sm font-bold text-[#A9B3C7] hover:text-white">Frequently Asked Questions</button>
            <div className="pt-4 flex flex-col gap-3 border-t border-white/[0.08]">
              <button 
                onClick={() => navigate("/login?mode=login")}
                className="w-full py-3.5 rounded-xl border border-white/[0.08] text-center text-xs font-black uppercase tracking-wider text-[#A9B3C7]"
              >
                Sign In
              </button>
              <button 
                onClick={() => scrollToSection("pricing")}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4F8CFF] to-[#7C5CFF] text-center text-xs font-black uppercase tracking-wider text-white shadow-lg"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. CINEMATIC HERO SECTION */}
      <section id="hero" className="max-w-7xl mx-auto px-6 pt-10 pb-16 md:py-20 flex flex-col lg:flex-row items-center gap-16 relative">
        
        {/* Left Hero Headlines */}
        <div className="flex-1 space-y-8 text-center lg:text-left z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4F8CFF]/10 text-[#4F8CFF] text-[10px] uppercase font-black tracking-[0.25em] border border-[#4F8CFF]/20 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-[#00D4FF] animate-pulse" />
            Next-Generation Enterprise AI Platform
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.08]">
            Enterprise AI Customer Support Platform Built for <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#4F8CFF] via-[#7C5CFF] to-[#00D4FF] bg-clip-text text-transparent">
              Modern SaaS Businesses.
            </span>
          </h1>

          <p className="text-[#A9B3C7] text-base sm:text-lg max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
            The all-in-one platform unifying real-time live chat, AI Copilot auto-drafting, SLA helpdesk ticketing, Customer 360 profiles, UAE VAT compliance, and multi-site management.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button 
              onClick={() => scrollToSection("pricing")}
              className="w-full sm:w-auto px-9 py-4 rounded-2xl bg-gradient-to-r from-[#4F8CFF] to-[#7C5CFF] hover:from-[#4F8CFF]/90 hover:to-[#7C5CFF]/90 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-[#4F8CFF]/25 transition-all hover:scale-105 cursor-pointer flex items-center justify-center gap-2 border border-white/10"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => scrollToSection("sandbox")}
              className="w-full sm:w-auto px-9 py-4 rounded-2xl border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 font-black text-[11px] uppercase tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-2 backdrop-blur-xl"
            >
              <PlayCircle className="w-4 h-4 text-[#00D4FF]" /> Book Live Demo
            </button>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-8 pt-2 border-t border-white/5">
            <div>
              <span className="block text-2xl font-extrabold text-white tracking-tight">99.99%</span>
              <span className="text-[10px] font-bold text-[#A9B3C7] uppercase tracking-wider">Uptime SLA</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <span className="block text-2xl font-extrabold text-[#00D4FF] tracking-tight">&lt; 2m</span>
              <span className="text-[10px] font-bold text-[#A9B3C7] uppercase tracking-wider">Widget Setup</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <span className="block text-2xl font-extrabold text-[#FFC857] tracking-tight">4.9/5</span>
              <span className="text-[10px] font-bold text-[#A9B3C7] uppercase tracking-wider">Client Rating</span>
            </div>
          </div>
        </div>

        {/* Right Hero Visual - FLOATING SUSPENDED GLASS PANELS */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none relative z-10">
          
          <div className="absolute inset-0 bg-gradient-to-tr from-[#4F8CFF]/20 via-[#7C5CFF]/15 to-[#00D4FF]/20 rounded-[40px] blur-3xl transform rotate-3 scale-105 pointer-events-none" />

          {/* Main Glass Workspace Window */}
          <div className="relative border border-white/[0.12] bg-[#0B1220]/95 rounded-[32px] p-6 shadow-2xl backdrop-blur-2xl transition-all duration-500">
            
            {/* Header bar */}
            <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-[#00D97E]/80" />
              </div>
              <span className="text-[10px] font-black text-[#4F8CFF] uppercase tracking-[0.25em] flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#00D4FF]" /> JTS Command Center Live
              </span>
              <span className="text-[9px] font-bold bg-[#00D97E]/15 text-[#00D97E] border border-[#00D97E]/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                🟢 Operational
              </span>
            </div>

            {/* Top Metric Pills */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                <span className="text-[9px] font-bold text-[#A9B3C7] uppercase block">Active Queue</span>
                <span className="text-lg font-black text-white">128 Live</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#4F8CFF]/10 border border-[#4F8CFF]/20 backdrop-blur-xl">
                <span className="text-[9px] font-bold text-[#4F8CFF] uppercase block">AI Draft Rate</span>
                <span className="text-lg font-black text-[#4F8CFF]">96.4%</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#00D97E]/10 border border-[#00D97E]/20 backdrop-blur-xl">
                <span className="text-[9px] font-bold text-[#00D97E] uppercase block">Resolution</span>
                <span className="text-lg font-black text-[#00D97E]">1m 42s</span>
              </div>
            </div>

            {/* Live Stream Cards */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F8CFF] to-[#7C5CFF] text-white flex items-center justify-center font-black text-xs shadow-md">
                    AV
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">Alex Vance (Enterprise Lead)</h4>
                    <p className="text-[10px] text-[#A9B3C7] truncate max-w-[210px]">"Can we integrate AI auto-drafting for multi-domain support?"</p>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase bg-[#4F8CFF] text-white px-2.5 py-1 rounded-full tracking-wider shadow shrink-0">
                  🔥 HOT 96%
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0B1220] border border-[#4F8CFF]/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00D4FF] to-[#4F8CFF] text-white flex items-center justify-center font-black text-xs shadow-md">
                    ✨
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#00D4FF]">AI Copilot Auto-Draft</h4>
                    <p className="text-[10px] text-slate-300 italic truncate max-w-[210px]">"Yes! AI Copilot routes chats across all registered domain slots..."</p>
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase bg-[#00D4FF]/20 text-[#00D4FF] px-2 py-0.5 rounded border border-[#00D4FF]/30 shrink-0">
                  Ready
                </span>
              </div>

              {/* Clean Non-Overlapping AI Sentiment Badge */}
              <div className="mt-3 p-3.5 rounded-2xl border border-[#00D4FF]/30 bg-[#0B1220]/90 backdrop-blur-xl shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#00D4FF]/15 border border-[#00D4FF]/30 flex items-center justify-center text-[#00D4FF]">
                    <Cpu size={14} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-[#00D4FF] uppercase tracking-widest">AI SENTIMENT SCORE</span>
                      <span className="text-[8px] font-black text-[#00D97E] bg-[#00D97E]/15 border border-[#00D97E]/30 px-1.5 py-0.2 rounded">96.4% Accuracy</span>
                    </div>
                    <p className="text-[10px] text-[#A9B3C7] font-bold">High Purchase Intent • Instant Quote Link Generated</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. TRUSTED COMPANIES & ENTERPRISE SECURITY STRIP */}
      <section className="py-8 border-y border-white/[0.08] bg-[#0B1220]/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {trustBadges.map((badge, idx) => (
              <div 
                key={idx}
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 backdrop-blur-xl flex flex-col items-center justify-center text-center space-y-1.5 transition-all hover:scale-105"
              >
                {badge.icon}
                <span className="text-[9px] font-bold text-[#A9B3C7] uppercase tracking-wider">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. ENTERPRISE STATISTICS BAR */}
      <section className="py-12 max-w-7xl mx-auto px-6">
        <div className="p-8 rounded-[32px] bg-gradient-to-r from-[#0B1220] via-[#050816] to-[#0B1220] border border-white/[0.08] shadow-2xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <span className="text-3xl sm:text-4xl font-extrabold text-white block">99.99%</span>
            <span className="text-[10px] font-black text-[#4F8CFF] uppercase tracking-widest mt-1 block">Uptime Guarantee SLA</span>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#00D4FF] block">&lt; 100ms</span>
            <span className="text-[10px] font-black text-[#00D4FF] uppercase tracking-widest mt-1 block">Subsecond Script Execution</span>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#00D97E] block">3.4 hrs/day</span>
            <span className="text-[10px] font-black text-[#00D97E] uppercase tracking-widest mt-1 block">Saved Per Agent via AI</span>
          </div>
          <div>
            <span className="text-3xl sm:text-4xl font-extrabold text-[#FFC857] block">24 Hubs</span>
            <span className="text-[10px] font-black text-[#FFC857] uppercase tracking-widest mt-1 block">Master BI Report Cards</span>
          </div>
        </div>
      </section>

      {/* 5. AI WORKSPACE SHOWCASE & INTERACTIVE SANDBOX */}
      <section id="sandbox" className="py-10 md:py-16 max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] text-[10px] uppercase font-black tracking-widest border border-[#00D4FF]/20">
              <Sparkles size={12} /> AI Workspace Simulator
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Test JTS Live AI Assistant Right Now!
            </h2>
            <p className="text-[#A9B3C7] text-sm font-medium leading-relaxed">
              Type your own customer question below or click any of the predefined prompts to see how JTS handles inquiries in real-time.
            </p>

            <div className="space-y-3 pt-2">
              <span className="text-xs font-black text-white uppercase tracking-widest block">Quick Test Inquiries:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sandboxPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePromptClick(prompt)}
                    disabled={isTyping}
                    className="p-4 rounded-2xl text-left border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-xs font-bold text-[#A9B3C7] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#4F8CFF]/40 flex items-center justify-between cursor-pointer"
                  >
                    <span>{prompt.q}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#4F8CFF] shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4F8CFF]/15 to-[#00D4FF]/15 rounded-3xl blur-2xl pointer-events-none" />
            <div className="relative border border-white/[0.12] bg-[#0B1220] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[500px]">

              <div className="p-4 bg-[#050816] border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4F8CFF] to-[#00D4FF] flex items-center justify-center shadow-md">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00D97E] border border-[#0B1220]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white tracking-tight uppercase leading-none">JTS Customer Assistant</h4>
                    <span className="text-[9px] font-bold text-[#A9B3C7]">Live AI & Human Desk</span>
                  </div>
                </div>
                <span className="text-[9px] font-black text-[#00D97E] uppercase tracking-widest bg-[#00D97E]/15 border border-[#00D97E]/30 px-2.5 py-1 rounded-full">
                  🟢 Online
                </span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed font-medium
                      ${msg.sender === "user"
                        ? "bg-[#4F8CFF] text-white rounded-tr-none shadow-md"
                        : "bg-[#050816] text-[#A9B3C7] border border-white/[0.08] rounded-tl-none"}`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-[#050816] border border-white/[0.08] rounded-2xl rounded-tl-none p-3 px-4 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F8CFF] animate-bounce" style={{ animationDelay: "0s" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F8CFF] animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F8CFF] animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleCustomSend} className="p-3 bg-[#050816] border-t border-white/[0.08] flex items-center gap-2">
                <input
                  type="text"
                  value={userCustomInput}
                  onChange={(e) => setUserCustomInput(e.target.value)}
                  placeholder="Type any custom question..."
                  disabled={isTyping}
                  className="flex-1 bg-[#0B1220] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#4F8CFF] transition-colors"
                />
                <button
                  type="submit"
                  disabled={!userCustomInput.trim() || isTyping}
                  className="p-2.5 rounded-xl bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          </div>

        </div>
      </section>

      {/* 6. FEATURES (ASYMMETRICAL BENTO GRID) */}
      <section id="bento" className="py-16 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <span className="text-[10px] font-black text-[#00D4FF] tracking-[0.25em] uppercase">Architectural Bento Grid</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">The Next-Gen Support Architecture</h2>
          <p className="text-[#A9B3C7] text-sm font-medium leading-relaxed">
            Engineered as an asymmetrical Bento ecosystem instead of generic cards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {/* Bento Card 1 (Large 2-col Hero Card) */}
          <div className="md:col-span-2 lg:col-span-2 p-8 rounded-[32px] bg-gradient-to-br from-[#0B1220] via-[#050816] to-[#0B1220] border border-[#4F8CFF]/30 shadow-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-[#00D4FF] tracking-widest bg-[#00D4FF]/10 border border-[#00D4FF]/20 px-3 py-1 rounded-lg inline-block">
                ✨ AUTONOMOUS AI COPILOT
              </span>
              <h3 className="text-2xl font-extrabold text-white">Intent Sentiment Classifier & Auto-Drafting</h3>
              <p className="text-xs text-[#A9B3C7] font-bold leading-relaxed">
                Analyzes live visitor messages in real-time, calculates purchase intent scores (e.g. 🔥 HOT INTENT 96%), and auto-generates context-aware replies.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#050816] border border-[#00D4FF]/30 flex items-center justify-between text-xs font-bold text-[#00D4FF]">
              <span>🔥 Lead Intent: High Purchase Intent (96%)</span>
              <span className="text-[#00D97E] font-black">Quote Drafted</span>
            </div>
          </div>

          {/* Bento Card 2 (1-col Metric) */}
          <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl space-y-4 flex flex-col justify-between">
            <div className="w-10 h-10 rounded-2xl bg-[#FFC857]/10 border border-[#FFC857]/20 text-[#FFC857] flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-white block">Subsecond Latency</span>
              <p className="text-xs text-[#A9B3C7] font-bold mt-1">Lightweight 12KB widget snippet executes in &lt;100ms.</p>
            </div>
          </div>

          {/* Bento Card 3 (1-col Security) */}
          <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl space-y-4 flex flex-col justify-between">
            <div className="w-10 h-10 rounded-2xl bg-[#00D97E]/10 border border-[#00D97E]/20 text-[#00D97E] flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-white block">Cryptographic Key</span>
              <p className="text-xs text-[#A9B3C7] font-bold mt-1">Strict CORS origin domain security lockdown.</p>
            </div>
          </div>

          {/* Bento Card 4 (1-col GCC Tax) */}
          <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl space-y-4 flex flex-col justify-between">
            <div className="w-10 h-10 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 text-[#00D4FF] flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-white block">🇦🇪 UAE VAT & Tax</span>
              <p className="text-xs text-[#A9B3C7] font-bold mt-1">Automated FTA Form 201 VAT returns & Corporate Tax.</p>
            </div>
          </div>

          {/* Bento Card 5 (2-col Omnichannel) */}
          <div className="md:col-span-2 lg:col-span-2 p-8 rounded-[32px] bg-gradient-to-br from-[#0B1220] via-[#050816] to-[#0B1220] border border-white/[0.08] shadow-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-[#4F8CFF] tracking-widest bg-[#4F8CFF]/10 border border-[#4F8CFF]/20 px-3 py-1 rounded-lg inline-block">
                💬 OMNICHANNEL LIVE DESK
              </span>
              <h3 className="text-2xl font-extrabold text-white">Unified Multi-Site Visitor Routing</h3>
              <p className="text-xs text-[#A9B3C7] font-bold leading-relaxed">
                Single command center to monitor live visitors across multiple website domains with isolated module entitlements.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-[#A9B3C7] pt-2 border-t border-white/5">
              <span>Domain 1: LuxeGlow.ae (Active)</span>
              <span className="text-[#4F8CFF] font-black">Domain 2: SaaSify.com (Active)</span>
            </div>
          </div>

          {/* Bento Card 6 (1-col 24 Reports) */}
          <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl space-y-4 flex flex-col justify-between">
            <div className="w-10 h-10 rounded-2xl bg-[#7C5CFF]/10 border border-[#7C5CFF]/20 text-[#7C5CFF] flex items-center justify-center">
              <BarChart size={20} />
            </div>
            <div>
              <span className="text-2xl font-extrabold text-white block">24 Master Reports</span>
              <p className="text-xs text-[#A9B3C7] font-bold mt-1">Multi-tab CSV, Excel, and PDF downloads.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 7. PLATFORM MODULES SHOWCASE (Single Line Tab Swapper) */}
      <section id="modules" className="py-12 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-8">
          <span className="text-[10px] font-black text-[#4F8CFF] tracking-[0.25em] uppercase">Unified Ecosystem Suite</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Explore Enterprise Operations Modules
          </h2>
          <p className="text-[#A9B3C7] text-sm font-medium leading-relaxed">
            Switch between core platform modules to explore how JTS Chat powers your entire support & sales operation.
          </p>
        </div>

        {/* Module Tabs - Single Line Layout */}
        <div className="flex flex-nowrap overflow-x-auto items-center justify-start lg:justify-center gap-2 mb-8 custom-scrollbar pb-2 max-w-full">
          {[
            { id: "copilot", label: "✨ AI Copilot Engine" },
            { id: "livechat", label: "💬 Live Support & Chat" },
            { id: "tickets", label: "🎫 SLA Helpdesk Tickets" },
            { id: "crm", label: "💼 CRM & Sales Pipelines" },
            { id: "tax", label: "🇦🇪 UAE VAT & Tax Hub" },
            { id: "reports", label: "📊 24 Master Report Cards" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabShowcase(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap shrink-0
                ${activeTabShowcase === tab.id 
                  ? "bg-[#4F8CFF] text-white border-[#4F8CFF] shadow-xl shadow-[#4F8CFF]/25 scale-105" 
                  : "bg-white/5 text-[#A9B3C7] hover:text-white border-white/10"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Module Content Card */}
        <div className="p-8 sm:p-12 rounded-[32px] bg-gradient-to-br from-[#0B1220] via-[#050816] to-[#0B1220] border border-white/[0.08] shadow-2xl backdrop-blur-2xl">
          {activeTabShowcase === "copilot" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <span className="text-[10px] font-black text-[#00D4FF] uppercase tracking-widest bg-[#00D4FF]/10 px-3 py-1 rounded-lg border border-[#00D4FF]/20">
                  AI ENGINE
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">✨ AI Copilot Auto-Drafting & Intent Engine</h3>
                <p className="text-[#A9B3C7] text-xs font-bold leading-relaxed">
                  Our AI Copilot analyzes customer query intent, evaluates sentiment scores, and drafts perfect professional responses for support agents in 1-click.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                    <CheckCircle size={14} className="text-[#00D4FF]" /> Lead Intent Classification (🔥 HOT 96%, WARM, COLD)
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                    <CheckCircle size={14} className="text-[#00D4FF]" /> Auto-matches FAQs & Knowledge Base articles
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-[#050816] border border-white/10 space-y-4">
                <div className="flex items-center justify-between text-xs font-black border-b border-white/5 pb-3">
                  <span className="text-[#00D4FF] uppercase">AI Intent Inspector</span>
                  <span className="text-rose-400 font-black">🔥 HOT INTENT 96%</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#0B1220] border border-[#00D4FF]/30 text-xs text-[#00D4FF] italic">
                  ✨ Auto-Draft: "Our Standard plan includes 5 Agent seats and SLA Helpdesk ticketing..."
                </div>
              </div>
            </div>
          )}

          {activeTabShowcase === "livechat" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <span className="text-[10px] font-black text-[#4F8CFF] uppercase tracking-widest bg-[#4F8CFF]/10 px-3 py-1 rounded-lg border border-[#4F8CFF]/20">
                  OMNICHANNEL DESK
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Real-Time Visitor Chat Desk</h3>
                <p className="text-[#A9B3C7] text-xs font-bold leading-relaxed">
                  Monitor live online visitors, view website page trail history, assign agent seats, and respond with sub-second latency using canned keyboard shortcuts.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-[#050816] border border-white/10 space-y-4">
                <div className="flex items-center justify-between text-xs font-black border-b border-white/5 pb-3">
                  <span className="text-white uppercase">Queue Status</span>
                  <span className="text-[#00D97E]">0 Waiting | 14 Active</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#4F8CFF]/20 border border-[#4F8CFF]/30 text-xs text-white">
                  "Hi! How can I integrate JTS widget on React?"
                </div>
              </div>
            </div>
          )}

          {activeTabShowcase === "tickets" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <span className="text-[10px] font-black text-[#FFC857] uppercase tracking-widest bg-[#FFC857]/10 px-3 py-1 rounded-lg border border-[#FFC857]/20">
                  HELPDESK TICKETING
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">SLA Helpdesk & Ticket Escalation</h3>
                <p className="text-[#A9B3C7] text-xs font-bold leading-relaxed">
                  Never miss an offline inquiry. Save inquiries into Helpdesk tickets, assign priority levels, and trigger SLA breach alerts.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-[#050816] border border-white/10 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-300 border-b border-white/5 pb-2">
                  <span>#TICK-8021 | Invoice Query</span>
                  <span className="text-[#FFC857] font-black">HIGH PRIORITY</span>
                </div>
                <span className="text-[10px] text-[#A9B3C7] block">Department: Accounts & Billing</span>
              </div>
            </div>
          )}

          {activeTabShowcase === "crm" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <span className="text-[10px] font-black text-[#7C5CFF] uppercase tracking-widest bg-[#7C5CFF]/10 px-3 py-1 rounded-lg border border-[#7C5CFF]/20">
                  SALES CRM
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Customer 360 & Sales Pipelines</h3>
                <p className="text-[#A9B3C7] text-xs font-bold leading-relaxed">
                  Track Customer 360 profiles, deal stages (Leads, Quotations, Sales Orders), follow-up task reminders, and deal pipeline values.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-[#050816] border border-white/10 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>Deal Stage: Quotation Sent</span>
                  <span className="text-[#00D97E] font-black">$12,400</span>
                </div>
              </div>
            </div>
          )}

          {activeTabShowcase === "tax" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <span className="text-[10px] font-black text-[#00D97E] uppercase tracking-widest bg-[#00D97E]/10 px-3 py-1 rounded-lg border border-[#00D97E]/20">
                  GCC COMPLIANCE
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">🇦🇪 UAE VAT & Corporate Tax Suite</h3>
                <p className="text-[#A9B3C7] text-xs font-bold leading-relaxed">
                  Built-in FTA compliant VAT Return filing, Corporate Tax ledger, Trade License expiry alert engine, and PDF export hub.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-[#050816] border border-white/10 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>UAE VAT 201 Return (Q3)</span>
                  <span className="text-[#00D97E] font-black">FTA COMPLIANT</span>
                </div>
              </div>
            </div>
          )}

          {activeTabShowcase === "reports" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <span className="text-[10px] font-black text-[#00D4FF] uppercase tracking-widest bg-[#00D4FF]/10 px-3 py-1 rounded-lg border border-[#00D4FF]/20">
                  BUSINESS INTELLIGENCE
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">24 Master Report Cards & Export Hub</h3>
                <p className="text-[#A9B3C7] text-xs font-bold leading-relaxed">
                  24 specialized report cards grid (Sales, Tickets, Agent SLA, Financial MRR, Corporate Tax) with multi-tab CSV, Excel, and PDF downloads.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-[#050816] border border-white/10 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>Master Reports Export</span>
                  <span className="text-[#00D4FF] font-black">PDF / EXCEL / CSV</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 8. DASHBOARD PREVIEW & WIDGET STUDIO CUSTOMIZER */}
      <section id="widget-preview" className="py-10 md:py-14 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-8">
          <span className="text-[10px] font-black text-[#00D4FF] tracking-[0.25em] uppercase">Interactive Studio</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Customize Your Live Chat Widget</h2>
          <p className="text-[#A9B3C7] text-sm font-medium leading-relaxed">
            Visitors can interactively test different brand accent colors on a live widget mockup.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4 backdrop-blur-xl">
              <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Palette size={14} className="text-[#4F8CFF]" /> Color Theme Selector (Brand Accent):
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { name: "Electric Blue", hex: "#4F8CFF" },
                  { name: "Purple", hex: "#7C5CFF" },
                  { name: "Cyan", hex: "#00D4FF" },
                  { name: "Emerald", hex: "#00D97E" },
                  { name: "Pink", hex: "#ec4899" },
                  { name: "Gold", hex: "#FFC857" }
                ].map((color) => (
                  <button
                    key={color.hex}
                    onClick={() => setPreviewColor(color.hex)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-2 ${previewColor === color.hex ? "scale-105 border-white bg-white/20 text-white shadow-lg" : "border-white/10 bg-white/5 text-[#A9B3C7] hover:text-white"}`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color.hex }} />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3 backdrop-blur-xl">
              <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Code size={14} className="text-[#00D4FF]" /> 1-Line JavaScript Embed Snippet:
              </h4>
              <div className="p-4 rounded-xl bg-[#050816] border border-white/10 font-mono text-[11px] text-[#00D4FF] flex items-center justify-between gap-4">
                <span className="truncate">
                  {`<script src="http://localhost:5000/chat-widget.js" data-api-key="YOUR_KEY"></script>`}
                </span>
                <button
                  onClick={copyScriptSnippet}
                  className="px-3.5 py-2 rounded-xl bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-sans text-[10px] font-black uppercase tracking-wider shrink-0 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSnippet ? <Check size={12} /> : <Copy size={12} />}
                  {copiedSnippet ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="w-full max-w-sm rounded-[32px] overflow-hidden border border-white/[0.12] bg-[#0B1220] shadow-2xl space-y-0">
              
              <div className="p-4 text-white flex items-center justify-between transition-colors duration-300" style={{ backgroundColor: previewColor }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black leading-tight">{previewTitle}</h4>
                    <span className="text-[9px] font-bold opacity-80">We reply in under 1 minute</span>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-[#00D97E] border border-white" />
              </div>

              <div className="p-4 space-y-3 h-64 overflow-y-auto custom-scrollbar bg-[#050816]">
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-2xl rounded-tl-none bg-[#0B1220] border border-white/10 text-[11px] text-[#A9B3C7] font-medium">
                    {previewWelcome}
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] p-3 rounded-2xl rounded-tr-none text-white text-[11px] font-medium" style={{ backgroundColor: previewColor }}>
                    I need to verify my UAE VAT & Trade License filing status.
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-3 rounded-2xl rounded-tl-none bg-[#0B1220] border border-white/10 text-[11px] text-[#A9B3C7] font-medium">
                    ✨ AI Draft: Sure! Click below to view your VAT 201 Return status.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#050816] border-t border-white/10 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Write a message..."
                  disabled
                  className="flex-1 bg-[#0B1220] border border-white/10 rounded-xl px-3 py-2 text-[11px] text-[#A9B3C7] outline-none"
                />
                <button className="p-2 rounded-xl text-white transition-colors" style={{ backgroundColor: previewColor }}>
                  <Send size={14} />
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* NEW SECTION: HOW TO SETUP AND USE AFTER REGISTRATION */}
      <section id="setup-guide" className="py-16 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <span className="text-[10px] font-black text-[#00D4FF] tracking-[0.25em] uppercase">Quick Onboarding Process</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">How to Set Up & Deploy in 4 Easy Steps</h2>
          <p className="text-[#A9B3C7] text-sm font-medium leading-relaxed">
            Go live with JTS Support in less than 3 minutes. Zero coding required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Step 1 */}
          <div className="p-7 rounded-[32px] bg-white/[0.03] border border-white/[0.08] hover:border-[#4F8CFF]/40 backdrop-blur-xl space-y-5 transition-all hover:-translate-y-1 relative group">
            <span className="w-10 h-10 rounded-2xl bg-[#4F8CFF]/15 border border-[#4F8CFF]/30 text-[#4F8CFF] font-black text-xs flex items-center justify-center">
              01
            </span>
            <div className="space-y-2">
              <h4 className="text-base font-extrabold text-white">1-Click Registration</h4>
              <p className="text-xs text-[#A9B3C7] font-bold leading-relaxed">
                Click "Start Free Trial", select your growth plan, and gain instant access to your Client Command Center.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 text-[10px] font-black text-[#4F8CFF] uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={12} className="text-[#00D97E]" /> Instant Activation
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-7 rounded-[32px] bg-white/[0.03] border border-white/[0.08] hover:border-[#7C5CFF]/40 backdrop-blur-xl space-y-5 transition-all hover:-translate-y-1 relative group">
            <span className="w-10 h-10 rounded-2xl bg-[#7C5CFF]/15 border border-[#7C5CFF]/30 text-[#7C5CFF] font-black text-xs flex items-center justify-center">
              02
            </span>
            <div className="space-y-2">
              <h4 className="text-base font-extrabold text-white">Register Domain & Key</h4>
              <p className="text-xs text-[#A9B3C7] font-bold leading-relaxed">
                Add your website URL (e.g. yourbrand.com) in Website Settings to generate your cryptographic API key.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 text-[10px] font-black text-[#7C5CFF] uppercase tracking-wider flex items-center gap-1">
              <Key size={12} className="text-[#00D4FF]" /> Origin Lockdown
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-7 rounded-[32px] bg-white/[0.03] border border-white/[0.08] hover:border-[#00D4FF]/40 backdrop-blur-xl space-y-5 transition-all hover:-translate-y-1 relative group">
            <span className="w-10 h-10 rounded-2xl bg-[#00D4FF]/15 border border-[#00D4FF]/30 text-[#00D4FF] font-black text-xs flex items-center justify-center">
              03
            </span>
            <div className="space-y-2">
              <h4 className="text-base font-extrabold text-white">Embed Script Snippet</h4>
              <p className="text-xs text-[#A9B3C7] font-bold leading-relaxed">
                Copy your 1-line &lt;script&gt; tag into your HTML header, WordPress footer, WooCommerce, or Shopify theme.
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 text-[10px] font-black text-[#00D4FF] uppercase tracking-wider flex items-center gap-1">
              <Code size={12} className="text-[#FFC857]" /> &lt;2 Min Installation
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-7 rounded-[32px] bg-white/[0.03] border border-white/[0.08] hover:border-[#00D97E]/40 backdrop-blur-xl space-y-5 transition-all hover:-translate-y-1 relative group">
            <span className="w-10 h-10 rounded-2xl bg-[#00D97E]/15 border border-[#00D97E]/30 text-[#00D97E] font-black text-xs flex items-center justify-center">
              04
            </span>
            <div className="space-y-2">
              <h4 className="text-base font-extrabold text-white">Invite Team & Launch AI</h4>
              <p className="text-xs text-[#A9B3C7] font-bold leading-relaxed">
                Invite support agents, set SLA priority levels, and enable AI Copilot auto-drafting to start converting visitors!
              </p>
            </div>
            <div className="pt-3 border-t border-white/5 text-[10px] font-black text-[#00D97E] uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={12} className="text-[#00D97E]" /> Live Operations
            </div>
          </div>

        </div>
      </section>

      {/* 9. INTEGRATIONS & ECOSYSTEM MAP */}
      <section id="integrations" className="py-16 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <span className="text-[10px] font-black text-[#7C5CFF] tracking-[0.25em] uppercase">Ecosystem Connectors</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Plug-and-Play Integrations</h2>
          <p className="text-[#A9B3C7] text-sm font-medium leading-relaxed">
            Connect JTS AI Platform with your existing enterprise toolchain in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrationNodes.map((node, idx) => (
            <div 
              key={idx}
              className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.08] hover:border-[#4F8CFF]/40 backdrop-blur-xl flex items-center justify-between transition-all hover:scale-105"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#050816] border border-white/10 flex items-center justify-center">
                  {node.icon}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">{node.name}</h4>
                  <span className="text-[10px] font-bold text-[#A9B3C7]">{node.tag}</span>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase bg-[#00D97E]/15 text-[#00D97E] border border-[#00D97E]/30 px-2.5 py-1 rounded-full">
                Connected
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 10. REASONS & WHY ENTERPRISE TEAMS CHOOSE JTS */}
      <section id="reasons" className="py-10 md:py-14 max-w-7xl mx-auto px-6 bg-[#0B1220]/60 border-y border-white/[0.08] rounded-[40px] my-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-8">
          <span className="text-[10px] font-black text-[#00D4FF] tracking-[0.25em] uppercase">10 Key Advantages</span>
          <h2 className="text-3xl sm:text-4.5xl font-extrabold text-white tracking-tight">10 Reasons Why Enterprise Teams Choose JTS</h2>
          <p className="text-[#A9B3C7] text-sm font-medium leading-relaxed">
            Engineered for high-volume customer support, subsecond response times, and automated enterprise operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tenReasons.map((item, idx) => (
            <div 
              key={idx}
              className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] flex items-start gap-5 hover:border-[#4F8CFF]/40 transition-all backdrop-blur-xl"
            >
              <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-[#4F8CFF] bg-[#4F8CFF]/10 px-2 py-0.5 rounded">REASON {item.num}</span>
                  <h4 className="text-sm font-extrabold text-white">{item.title}</h4>
                </div>
                <p className="text-xs text-[#A9B3C7] font-bold leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 10. DYNAMIC MONGODB SUBSCRIPTION PRICING */}
      <section id="pricing" className="py-10 md:py-16 bg-[#050816] border-y border-white/[0.08] relative">
        <div className="max-w-7xl mx-auto px-6">

          <div className="text-center max-w-2xl mx-auto space-y-4 mb-8">
            <span className="text-[10px] font-black text-[#00D4FF] tracking-[0.25em] uppercase">High-Margin SaaS Packages</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Select Your Growth Plan Package.
            </h2>
            <p className="text-[#A9B3C7] text-sm font-medium leading-relaxed">
              Live real-time pricing from MongoDB. Instant setup, 1-click Express activation, and annual 20% discount.
            </p>

            <div className="inline-flex items-center gap-3 p-1.5 bg-[#0B1220] border border-white/[0.08] rounded-2xl mt-4">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer
                  ${billingPeriod === "monthly" ? "bg-[#4F8CFF] text-white shadow-lg" : "text-[#A9B3C7] hover:text-white"}`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingPeriod("annual")}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2
                  ${billingPeriod === "annual" ? "bg-[#4F8CFF] text-white shadow-lg" : "text-[#A9B3C7] hover:text-white"}`}
              >
                Annual Billing
                <span className="px-2 py-0.5 rounded-full bg-[#00D97E]/20 text-[#00D97E] text-[8px] font-black border border-[#00D97E]/30">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {activePlansToRender.map((plan) => {
              const price = billingPeriod === "annual"
                ? Math.floor((plan.monthlyPrice || 49) * 0.8)
                : (plan.monthlyPrice || 49);

              return (
                <div
                  key={plan._id || plan.code}
                  className={`relative flex flex-col p-7 rounded-[32px] transition-all duration-300 hover:scale-[1.02] border justify-between backdrop-blur-xl
                    ${plan.isPopular
                      ? "bg-gradient-to-b from-[#0B1220] via-[#050816] to-[#0B1220] border-[#4F8CFF] shadow-2xl shadow-[#4F8CFF]/20 relative z-10"
                      : "bg-[#0B1220]/60 border-white/[0.08] hover:border-white/20"}`}
                >
                  {plan.isPopular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#4F8CFF] to-[#7C5CFF] text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-1">
                      <Sparkles size={10} /> Most Popular
                    </span>
                  )}

                  <div className="space-y-5">
                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 text-[#A9B3C7] rounded-lg inline-block">
                      CODE: {plan.code?.toUpperCase()}
                    </span>

                    <div>
                      <h3 className="text-base font-extrabold text-white uppercase tracking-tight">{plan.name}</h3>
                      <p className="text-[10px] font-bold text-[#A9B3C7] mt-1 line-clamp-2">{plan.description}</p>
                    </div>

                    <div>
                      <span className="text-3xl font-extrabold text-white tracking-tight">{plan.currencySymbol || "$"}{price}</span>
                      <span className="text-[10px] font-black text-[#A9B3C7] uppercase tracking-widest ml-1">/ month</span>
                      {billingPeriod === "annual" && (
                        <p className="text-[9px] font-bold text-[#00D97E] mt-1">
                          Billed annually (${price * 12}/yr)
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-4 border-t border-white/10 text-[10px] font-bold text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[#A9B3C7]"><Users size={12} className="text-[#4F8CFF]" /> Agent Seats</span>
                        <span className="font-black text-white">{plan.limits?.agents || 2} Seats</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[#A9B3C7]"><Globe size={12} className="text-[#FFC857]" /> Domain Slots</span>
                        <span className="font-black text-white">{plan.limits?.websites || 1} Domains</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#A9B3C7] block mb-1">Included Modules:</span>
                      {Array.isArray(plan.includedModules) && plan.includedModules.map((m, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-slate-300">
                          <CheckCircle2 size={12} className="text-[#00D97E] shrink-0" />
                          <span className="uppercase tracking-wider">{m} Suite</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectPlan(plan.code)}
                    className={`w-full mt-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer hover:shadow-xl flex items-center justify-center gap-2
                      ${plan.isPopular
                        ? "bg-gradient-to-r from-[#4F8CFF] to-[#7C5CFF] hover:from-[#4F8CFF]/90 hover:to-[#7C5CFF]/90 text-white shadow-[#4F8CFF]/25"
                        : "bg-white/10 hover:bg-white/15 text-white border border-white/10"}`}
                  >
                    Subscribe {plan.name}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 11. VERIFIED CLIENT TESTIMONIALS */}
      <section className="py-12 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-8">
          <span className="text-[10px] font-black text-[#4F8CFF] tracking-[0.25em] uppercase">Verified Client Reviews</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">
            Trusted By Support Operations Worldwide.
          </h2>
          <p className="text-[#A9B3C7] text-sm font-medium leading-relaxed">
            Here is what business owners, CTOs, and support directors have to say about JTS Support Platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <div key={idx} className="p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-6 hover:border-[#4F8CFF]/30 transition-all backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#FFC857] text-[#FFC857]" />
                  ))}
                </div>
                <span className="text-[8px] font-black uppercase tracking-wider bg-[#00D97E]/15 text-[#00D97E] border border-[#00D97E]/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle size={10} /> {t.badge}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-bold leading-relaxed italic">
                "{t.text}"
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${t.color} text-white flex items-center justify-center font-black text-xs shadow-md`}>
                  {t.avatar}
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">{t.name}</h4>
                  <span className="text-[9px] text-[#A9B3C7] font-bold">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 12. FAQ ACCORDION SECTION */}
      <section id="faq" className="py-10 md:py-16 bg-[#0B1220]/60 border-t border-white/[0.08]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center space-y-4 mb-8">
            <span className="text-[10px] font-black text-[#4F8CFF] tracking-[0.25em] uppercase">Common Inquiries</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={index} className="border border-white/[0.08] rounded-2xl bg-white/[0.03] overflow-hidden backdrop-blur-xl">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between text-slate-200 hover:text-white font-bold text-sm transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[#4F8CFF]" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-xs text-[#A9B3C7] font-bold leading-relaxed border-t border-white/5 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 13. FINAL CINEMATIC CTA & MULTI-COLUMN ENTERPRISE FOOTER */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="relative rounded-[36px] overflow-hidden bg-gradient-to-tr from-[#0B1220] via-[#050816] to-[#0B1220] p-10 sm:p-16 text-center border border-[#4F8CFF]/30 shadow-2xl backdrop-blur-2xl">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#4F8CFF]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#00D4FF]/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-3xl mx-auto space-y-8 relative z-10">
            <span className="text-[10px] font-black text-[#00D4FF] uppercase tracking-[0.25em] bg-white/5 border border-white/10 px-4 py-1.5 rounded-full inline-block">
              INSTANT PLATFORM DEPLOYMENT
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Ready to Transform Your Customer Support Operations?
            </h2>
            <p className="text-indigo-200 text-sm font-medium leading-relaxed max-w-xl mx-auto">
              Join leading support teams worldwide. Deploy your 1-line script snippet, invite agents, and convert live visitors in under 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => scrollToSection("pricing")}
                className="w-full sm:w-auto px-10 py-4.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-105 shadow-xl cursor-pointer flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
              <button 
                onClick={() => scrollToSection("sandbox")}
                className="w-full sm:w-auto px-10 py-4.5 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-extrabold text-[11px] uppercase tracking-[0.2em] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Schedule Live Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MULTI-COLUMN ENTERPRISE FOOTER */}
      <footer className="border-t border-white/[0.08] bg-[#050816] py-16 text-[#A9B3C7] text-xs">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-10">
          
          {/* Brand Info */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F8CFF] to-[#00D4FF] flex items-center justify-center text-white font-black">
                <Command size={18} />
              </div>
              <span className="text-lg font-extrabold text-white tracking-tight">JTS SUPPORT</span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
              Enterprise Omnichannel Live Chat, AI Copilot Auto-Drafting, SLA Helpdesk Ticketing & UAE VAT Compliance Suite.
            </p>
            <p className="text-slate-600 text-[10px]">
              &copy; {new Date().getFullYear()} JTS Chat Support Platform. All rights reserved.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Product Platform</h4>
            <ul className="space-y-2 text-[11px] text-[#A9B3C7] font-bold">
              <li className="hover:text-white cursor-pointer" onClick={() => scrollToSection("bento")}>Features Bento</li>
              <li className="hover:text-white cursor-pointer" onClick={() => scrollToSection("modules")}>AI Support Copilot</li>
              <li className="hover:text-white cursor-pointer" onClick={() => scrollToSection("modules")}>Helpdesk SLA Tickets</li>
              <li className="hover:text-white cursor-pointer" onClick={() => scrollToSection("modules")}>UAE VAT & Tax Hub</li>
            </ul>
          </div>

          {/* Solutions Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Solutions</h4>
            <ul className="space-y-2 text-[11px] text-[#A9B3C7] font-bold">
              <li className="hover:text-white cursor-pointer" onClick={() => scrollToSection("pricing")}>E-Commerce Stores</li>
              <li className="hover:text-white cursor-pointer" onClick={() => scrollToSection("pricing")}>FinTech & SaaS</li>
              <li className="hover:text-white cursor-pointer" onClick={() => scrollToSection("pricing")}>Enterprise Support</li>
              <li className="hover:text-white cursor-pointer" onClick={() => scrollToSection("reasons")}>Multi-Site Brands</li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-[11px] text-[#A9B3C7] font-bold">
              <li className="hover:text-white cursor-pointer" onClick={() => scrollToSection("reasons")}>Why JTS</li>
              <li className="hover:text-white cursor-pointer" onClick={() => scrollToSection("faq")}>FAQ & Security</li>
              <li className="hover:text-white cursor-pointer" onClick={() => navigate("/login?mode=login")}>Agent Workspace</li>
              <li className="hover:text-white cursor-pointer" onClick={() => navigate("/login?mode=register")}>1-Click Register</li>
            </ul>
          </div>

        </div>
      </footer>

    </div>
  );
}
