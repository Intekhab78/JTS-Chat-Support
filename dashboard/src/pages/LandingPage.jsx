import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, Cpu, GitBranch, Users, Ticket, Globe, BarChart, 
  Check, Zap, Shield, Crown, ArrowRight, Star, Sparkles, AlertCircle, 
  Menu, X, HelpCircle, ChevronDown, ChevronUp, Clock, ShieldCheck
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState("monthly"); // monthly or annual
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  // Interactive Sandbox Chat State
  const [chatMessages, setChatMessages] = useState([
    { sender: "agent", text: "👋 Hello! I am your JTS Support Assistant. Click any of the queries below to see how our platform handles customer interactions in real time!" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const sandboxPrompts = [
    { q: "How fast is setup?", a: "Integrating JTS Chat is simple! Just copy & paste a single line of script onto your website. You'll be ready to accept live chats in under 2 minutes." },
    { q: "How do AI agents work?", a: "Our AI agents automatically analyze your custom Knowledge Base to answer Tier-1 questions. If a query is complex, it triggers a smooth hand-off to a live human agent." },
    { q: "Can we route tickets?", a: "Yes! If agents are offline, inquiries are saved as helpdesk tickets. You can organize them by department (Sales, Support, Accounts) with custom SLA alerts." },
    { q: "Is multi-site supported?", a: "Absolutely! You can register and manage multiple website domains from a single unified workspace under our Standard and Pro plans." }
  ];

  const handlePromptClick = (prompt) => {
    if (isTyping) return;
    
    // Add user message
    setChatMessages(prev => [...prev, { sender: "user", text: prompt.q }]);
    setIsTyping(true);

    // Simulate agent typing
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: "agent", text: prompt.a }]);
      setIsTyping(false);
    }, 1200);
  };

  const pricingPlans = [
    {
      id: "basic",
      name: "Basic Chat",
      price: 29,
      description: "Essential live chat widget for growing websites.",
      features: [
        "2 Agent Seats",
        "1 Website Domain",
        "Standard Chat Widget",
        "Basic Canned Shortcuts",
        "Secure Data Encryption",
        "Email Support"
      ],
      color: "from-sky-500 to-blue-600",
      icon: <Zap className="w-5 h-5 text-sky-400" />,
      popular: false
    },
    {
      id: "standard",
      name: "Standard Support",
      price: 79,
      description: "Advanced helpdesk ticketing and automated routing.",
      features: [
        "5 Agent Seats",
        "2 Website Domains",
        "Full Helpdesk & Tickets",
        "Department-wise Routing",
        "Basic AI Auto-Replies",
        "Enhanced Analytics & Reports",
        "24/7 Priority Email Support"
      ],
      color: "from-amber-400 to-orange-500",
      icon: <Shield className="w-5 h-5 text-amber-400" />,
      popular: true
    },
    {
      id: "pro",
      name: "Enterprise Pro",
      price: 199,
      description: "Full CRM and custom customer service automation suite.",
      features: [
        "20 Agent Seats",
        "10 Website Domains",
        "Full CRM Suite & Contact 360",
        "Lead Capture Pipelines",
        "Advanced Analytics & Audit Logs",
        "Dynamic Conversational Flows",
        "Dedicated Manager Setup",
        "Priority Phone & Chat Support"
      ],
      color: "from-indigo-500 to-purple-600",
      icon: <Crown className="w-5 h-5 text-indigo-400" />,
      popular: false
    }
  ];

  const getPlanPrice = (basePrice) => {
    return billingPeriod === "annual" ? Math.floor(basePrice * 0.8) : basePrice;
  };

  const handleSelectPlan = (planId) => {
    navigate(`/login?mode=register&plan=${planId}`);
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const faqs = [
    {
      q: "Can I upgrade or downgrade my plan later?",
      a: "Yes, you can upgrade, downgrade, or cancel your subscription at any time directly from the Billing tab in your Client Dashboard. Any price differences will be prorated."
    },
    {
      q: "Is there a free trial option available?",
      a: "We offer immediate access to our plans. Registering for any plan gives you instant operational access to set up your support team, test the widget, and begin receiving chats immediately."
    },
    {
      q: "How does the AI hand-off feature work?",
      a: "When a customer asks a question, the JTS AI agent matches it against your Help Center articles. If the user indicates that the response did not solve their problem, or if the question requires human approval, the chat is immediately transferred to an active agent with the complete conversation history context."
    },
    {
      q: "Do you offer custom customization and branding?",
      a: "Yes! You can completely customize the chat widget colors, launcher icon, agent avatars, welcome messages, and shortcuts to match your corporate identity."
    }
  ];

  return (
    <div className="w-full h-full overflow-y-auto scroll-smooth bg-[#060814] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Background Lights / Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[800px] right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[500px] left-10 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#060814]/80 border-b border-slate-800/60 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection("hero")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <MessageSquare className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-400 bg-clip-text text-transparent">JTS CHAT</span>
              <span className="block text-[8px] font-black text-cyan-400 tracking-[0.25em] uppercase leading-none">Support Suite</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection("features")} className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer">FEATURES</button>
            <button onClick={() => scrollToSection("sandbox")} className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer">LIVE DEMO</button>
            <button onClick={() => scrollToSection("pricing")} className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer">PRICING PLANS</button>
            <button onClick={() => scrollToSection("faq")} className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer">FAQ</button>
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate("/login?mode=login")}
              className="text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => scrollToSection("pricing")}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-indigo-600/20 cursor-pointer active:scale-95"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Btn */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-[#060814] px-6 py-6 space-y-4 animate-fade-in">
            <button onClick={() => scrollToSection("features")} className="block w-full text-left py-2 text-sm font-bold text-slate-300 hover:text-white">Features</button>
            <button onClick={() => scrollToSection("sandbox")} className="block w-full text-left py-2 text-sm font-bold text-slate-300 hover:text-white">Live Demo</button>
            <button onClick={() => scrollToSection("pricing")} className="block w-full text-left py-2 text-sm font-bold text-slate-300 hover:text-white">Pricing Plans</button>
            <button onClick={() => scrollToSection("faq")} className="block w-full text-left py-2 text-sm font-bold text-slate-300 hover:text-white">FAQ</button>
            <div className="pt-4 flex flex-col gap-3 border-t border-slate-850">
              <button 
                onClick={() => navigate("/login?mode=login")}
                className="w-full py-3 rounded-xl border border-slate-800 hover:border-slate-700 text-center text-xs font-black uppercase tracking-wider text-slate-300"
              >
                Sign In
              </button>
              <button 
                onClick={() => scrollToSection("pricing")}
                className="w-full py-3 rounded-xl bg-indigo-600 text-center text-xs font-black uppercase tracking-wider text-white"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section id="hero" className="max-w-7xl mx-auto px-6 pt-16 pb-20 md:py-32 flex flex-col lg:flex-row items-center gap-16 relative">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-black tracking-widest border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            Empowering Modern Customer Support
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6.5xl font-black text-white tracking-tight leading-[1.05]">
            Connect with customers <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              in real-time, anywhere.
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 font-medium leading-relaxed">
            A comprehensive, premium support suite featuring interactive live chat, AI automation, ticket management, and full CRM integrations to retain and delight clients.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button 
              onClick={() => scrollToSection("pricing")}
              className="w-full sm:w-auto px-8 py-4.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
            >
              Choose Your Plan
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={() => scrollToSection("sandbox")}
              className="w-full sm:w-auto px-8 py-4.5 rounded-2xl border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60 text-slate-300 hover:text-white font-black text-[11px] uppercase tracking-[0.2em] transition-all cursor-pointer"
            >
              Try Interactive Demo
            </button>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
            <div>
              <span className="block text-2xl font-black text-white tracking-tight">99.9%</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Uptime SLA</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="block text-2xl font-black text-white tracking-tight">&lt; 2m</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Install</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="block text-2xl font-black text-white tracking-tight">4.9/5</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client Rating</span>
            </div>
          </div>
        </div>

        {/* Hero Visual Mockup */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none relative">
          <div className="absolute inset-0 bg-indigo-500/10 rounded-3xl blur-2xl transform rotate-3" />
          <div className="relative border border-slate-800/80 bg-slate-950/80 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-2xl">
            {/* Window bar */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">JTS Dashboard Hub</span>
              <div className="w-10 h-1 bg-transparent" />
            </div>

            {/* Mock Dashboard Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3.5 rounded-2xl bg-white/2 border border-white/5 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Active Chats</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-base font-black text-white">14</span>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/2 border border-white/5 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Avg Response</span>
                <span className="block text-base font-black text-white">42s</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/2 border border-white/5 space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Satisfaction</span>
                <span className="block text-base font-black text-indigo-400">98.4%</span>
              </div>
            </div>

            {/* Chat List Visual Mock */}
            <div className="space-y-2 border-t border-slate-900 pt-4">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Ongoing Conversations</span>
              
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/80 text-white flex items-center justify-center text-xs font-black">
                    A
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">Alex Carter (Domain.com)</h4>
                    <p className="text-[10px] text-slate-400 truncate max-w-[200px]">How does the API pricing integrate?</p>
                  </div>
                </div>
                <span className="text-[8px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
              </div>

              <div className="p-3 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-650/80 text-white flex items-center justify-center text-xs font-black">
                    S
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 leading-tight">Sophia Lopez</h4>
                    <p className="text-[10px] text-slate-400 truncate max-w-[200px]">AI auto-replied & escalated to agent</p>
                  </div>
                </div>
                <span className="text-[8px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider">AI Escalated</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 md:py-32 bg-slate-950/40 border-y border-slate-900/60 relative">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-20">
            <span className="text-[10px] font-black text-cyan-400 tracking-[0.25em] uppercase">Core Capabilities</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
              Built for Enterprise-Level Operations.
            </h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Whether you are running a small startup or a large e-commerce portal, JTS provides the tools required to organize and optimize chats.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-white/2 border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 space-y-5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">Real-Time Live Chat</h3>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                Chat with online visitors instantly. Track active agent status (online, away, break), see user geo-location, and respond with speed using keyboard shortcuts.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-white/2 border border-white/5 hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-1 space-y-5">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">AI Virtual Assistant</h3>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                Connect your documentation center as an AI knowledge base. Our bot automatically answers recurring inquiries, reducing workload by up to 60%.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-white/2 border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 space-y-5">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <GitBranch className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">Chat Flow Builder</h3>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                Create custom triage triggers. Qualify leads, collect visitor email addresses, and route conversation channels before a live agent is even notified.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-2xl bg-white/2 border border-white/5 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 space-y-5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">Integrated Client CRM</h3>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                View customer 360 profile views. Track contact histories, call recordings, quotations, purchase tickets, and logs in a unified database.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-2xl bg-white/2 border border-white/5 hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 space-y-5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Ticket className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">Helpdesk Ticketing</h3>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                Resolve offline emails or escalations. Assign tickets to departments, track state resolutions, and monitor SLA breach alerts to stay on target.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-2xl bg-white/2 border border-white/5 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 space-y-5">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">Multi-Website Console</h3>
              <p className="text-slate-400 text-xs font-medium leading-relaxed">
                Manage all your online businesses together. Set up unique configurations, widget designs, and custom responses per registered website.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* INTERACTIVE CHAT SANDBOX */}
      <section id="sandbox" className="py-20 md:py-32 max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          <div className="flex-1 space-y-6">
            <span className="text-[10px] font-black text-indigo-400 tracking-[0.25em] uppercase">Interactive Sandbox</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Test JTS Live Chat Right Now!
            </h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              We believe in showing, not just telling. Click any of the predefined customer inquiries on the right, and watch how quickly our live chat assistant resolves doubts and provides structure.
            </p>

            <div className="space-y-4 pt-4">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Select a question to test:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sandboxPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePromptClick(prompt)}
                    disabled={isTyping}
                    className="p-4 rounded-xl text-left border border-slate-800/80 bg-slate-950/60 hover:bg-slate-900/60 text-xs font-bold text-slate-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:border-indigo-500/30 flex items-center justify-between cursor-pointer"
                  >
                    <span>{prompt.q}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Container Simulator */}
          <div className="flex-1 w-full max-w-md relative">
            <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl blur-xl" />
            <div className="relative border border-slate-800 bg-[#0b0e1b] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[480px]">
              
              {/* Simulator Header */}
              <div className="p-4 bg-indigo-950/40 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#0b0e1b]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white tracking-tight uppercase leading-none">JTS Customer Success</h4>
                    <span className="text-[9px] font-bold text-slate-400">Agent & AI Active</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Online</span>
                </div>
              </div>

              {/* Chat Message Output */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed
                      ${msg.sender === "user" 
                        ? "bg-indigo-650 text-white rounded-tr-none shadow-md shadow-indigo-650/10" 
                        : "bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none"}`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3 px-4 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0s" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Widget Footer Simulator */}
              <div className="p-3 bg-slate-950/60 border-t border-slate-850 flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Click a test question above to send..." 
                  disabled
                  className="flex-1 bg-slate-900 border border-slate-800/80 rounded-xl px-4 py-2.5 text-xs text-slate-500 placeholder:text-slate-650 outline-none"
                />
                <button disabled className="p-2.5 rounded-xl bg-indigo-600/40 text-indigo-300 opacity-60 cursor-not-allowed">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-20 md:py-32 bg-slate-950/60 border-y border-slate-900/60 relative">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-5 mb-16">
            <span className="text-[10px] font-black text-cyan-400 tracking-[0.25em] uppercase">Flexible Subscription Plans</span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
              Choose the perfect plan for your business.
            </h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Instant activation. Auto setup. Log in immediately after registering and configure your support desk in real-time.
            </p>

            {/* Billing Switch */}
            <div className="inline-flex items-center gap-3 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl mt-4">
              <button 
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer
                  ${billingPeriod === "monthly" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"}`}
              >
                Monthly Billing
              </button>
              <button 
                onClick={() => setBillingPeriod("annual")}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5
                  ${billingPeriod === "annual" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"}`}
              >
                Annual Billing
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[8px] font-black tracking-normal border border-emerald-500/20">-20%</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
            {pricingPlans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative flex flex-col p-8 sm:p-10 rounded-[24px] transition-all duration-300 hover:scale-[1.01] border
                  ${plan.popular 
                    ? "bg-slate-900/80 border-indigo-500 shadow-2xl shadow-indigo-500/10 relative z-10" 
                    : "bg-[#0b0e1b]/50 border-slate-800/80 hover:border-slate-700/80"}`}
              >
                {plan.popular && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-4.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] shadow-md shadow-indigo-600/20">
                    Most Popular
                  </span>
                )}

                {/* Plan Header */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center">
                      {plan.icon}
                    </div>
                    <h3 className="text-base font-black text-white tracking-tight uppercase">{plan.name}</h3>
                  </div>

                  <p className="text-3xl font-black text-white tracking-tight flex items-baseline">
                    ${getPlanPrice(plan.price)}
                    <span className="text-xs text-slate-500 font-bold ml-1">/month</span>
                  </p>

                  <p className="text-[11px] font-bold text-slate-400 leading-relaxed min-h-[32px]">{plan.description}</p>
                </div>

                {/* Plan Features */}
                <div className="space-y-4 flex-1 mb-8">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">What is included</span>
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] font-bold text-slate-350">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Action */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all cursor-pointer hover:shadow-lg flex items-center justify-center gap-2
                    ${plan.popular 
                      ? "bg-indigo-600 hover:bg-indigo-555 text-white shadow-indigo-600/20" 
                      : "bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 hover:border-slate-700 shadow-slate-950/20"}`}
                >
                  Choose {plan.name}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CLIENT TESTIMONIALS */}
      <section className="py-20 md:py-32 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-20">
          <span className="text-[10px] font-black text-indigo-400 tracking-[0.25em] uppercase">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
            What our clients are saying.
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            Leading support operations across the globe trust JTS Chat to manage client interactions, SLA resolutions, and agent efficiencies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Testimonial 1 */}
          <div className="p-8 rounded-2xl bg-white/2 border border-white/5 space-y-6">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-300 font-bold leading-relaxed italic">
              "We migrated to JTS Chat Support three months ago. The installation took less than 5 minutes and we noticed a 35% decrease in unresolved tickets within the first 2 weeks. The automated AI agent handles common queries beautifully."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-xs font-black text-white">
                MK
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-none">Mohit Kumar</h4>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Operations Director, FinTech Solutions</span>
              </div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="p-8 rounded-2xl bg-white/2 border border-white/5 space-y-6">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-300 font-bold leading-relaxed italic">
              "The multiple website dashboard layout is phenomenal. From one Manager seat, we track visitor live sessions across three different e-commerce stores, routing specific support flows to different agent departments automatically."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-400 to-pink-500 flex items-center justify-center text-xs font-black text-white">
                SR
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-none">Sarah Ross</h4>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Founder, LuxeGlow Cosmetics</span>
              </div>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div className="p-8 rounded-2xl bg-white/2 border border-white/5 space-y-6">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-300 font-bold leading-relaxed italic">
              "The billing layout, CRM customer profiles, and quote creations inside the workspace have streamlined our sales efforts. New agents login and are immediately available to chats. Exceptional UX layout!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-xs font-black text-white">
                JS
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-none">James Sterling</h4>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">VP of Support, SaaSify Corp</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 md:py-32 bg-slate-950/40 border-t border-slate-900/60">
        <div className="max-w-4xl mx-auto px-6">
          
          <div className="text-center space-y-4 mb-16">
            <span className="text-[10px] font-black text-indigo-400 tracking-[0.25em] uppercase">Common Questions</span>
            <h2 className="text-3xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div 
                  key={index}
                  className="border border-slate-850 rounded-2xl bg-slate-900/20 overflow-hidden"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full p-6 text-left flex items-center justify-between text-slate-200 hover:text-white font-bold text-sm transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-xs text-slate-400 font-medium leading-relaxed border-t border-slate-900 pt-4 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-tr from-indigo-950 via-[#0a0f24] to-cyan-950 p-8 sm:p-12 md:p-16 text-center border border-indigo-500/20 shadow-2xl">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="max-w-2xl mx-auto space-y-8 relative z-10">
            <h2 className="text-3xl sm:text-4.5xl font-black text-white tracking-tight leading-none">
              Supercharge your support team today.
            </h2>
            <p className="text-indigo-200 text-sm font-medium leading-relaxed">
              Register in under 2 minutes, choose your operation plan, and begin interacting with website visitors in real-time. Setup is fully automated.
            </p>
            <div className="flex items-center justify-center">
              <button 
                onClick={() => scrollToSection("pricing")}
                className="px-10 py-5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-black text-[11px] uppercase tracking-[0.2em] transition-all hover:scale-[1.02] shadow-xl shadow-white/5 cursor-pointer flex items-center gap-2"
              >
                Get Operations Active
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-12 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest space-y-4">
        <div className="flex items-center justify-center gap-6 mb-4">
          <span className="cursor-pointer hover:text-white transition-colors" onClick={() => scrollToSection("features")}>Features</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
          <span className="cursor-pointer hover:text-white transition-colors" onClick={() => scrollToSection("pricing")}>Pricing</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
          <span className="cursor-pointer hover:text-white transition-colors" onClick={() => scrollToSection("faq")}>FAQ</span>
        </div>
        <p>&copy; {new Date().getFullYear()} JTS Chat Support Platform. All rights reserved.</p>
        <p className="text-slate-600 tracking-wider">Premium Customer Support Suite & Enterprise Service Channels</p>
      </footer>

    </div>
  );
}
