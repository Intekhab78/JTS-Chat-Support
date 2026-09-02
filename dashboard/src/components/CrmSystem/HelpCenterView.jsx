import React, { useState } from "react";
import { BookOpen, Search, HelpCircle, ThumbsUp, ThumbsDown, ChevronRight, FileText, CheckCircle2, MessageSquare, ExternalLink, Sparkles, Plus, X } from "lucide-react";

const KNOWLEDGE_CATEGORIES = [
  { id: "uae_tax", label: "Corporate Tax & FTA Compliance", icon: "🏢", count: 12 },
  { id: "vat", label: "UAE VAT Returns & Invoicing", icon: "🧾", count: 18 },
  { id: "trade_license", label: "Trade License & DED Renewals", icon: "📋", count: 8 },
  { id: "crm_portal", label: "Client Portal & Payment Gateway", icon: "💳", count: 15 },
  { id: "workflows", label: "Automation & WhatsApp Bots", icon: "⚡", count: 9 }
];

const INITIAL_ARTICLES = [
  {
    id: "art_1",
    categoryId: "uae_tax",
    title: "How to complete UAE Corporate Tax Registration via EmaraTax Portal",
    summary: "Step-by-step guideline on attaching audited financial accounts, passport copies, and trade license to secure Tax Registration Number (TRN).",
    readTime: "4 min read",
    likes: 48,
    views: 312,
    content: `## Overview of Corporate Tax Registration in UAE
All juridical persons (LLC, Free Zone, Branch of Foreign Company) incorporated in the UAE are legally mandated to register for Corporate Tax with the Federal Tax Authority (FTA).

### Required Documents:
1. Valid Trade License copy
2. Passport and Emirates ID of authorized signatories
3. Memorandum of Association (MOA) or Articles of Association
4. Audited Financial Statements for previous fiscal year

### Key Deadlines:
• Licenses issued in January/February: Deadline by May 31st.
• Failure to register within prescribed deadlines incurs a statutory penalty of AED 10,000.`
  },
  {
    id: "art_2",
    categoryId: "vat",
    title: "Generating FTA-Compliant Tax Invoices & E-Invoicing Requirements",
    summary: "Mandatory invoice header fields, TRN display, 5% VAT breakdown, and bilingual Arabic/English invoice template structure.",
    readTime: "3 min read",
    likes: 64,
    views: 480,
    content: `## Tax Invoice Essentials under FTA Regulations
A valid full Tax Invoice must clearly state the following particulars:
- Words "Tax Invoice" clearly displayed on top.
- Name, address, and TRN of the supplier.
- Name, address, and TRN of the recipient (mandatory for amounts exceeding AED 10,000).
- Detailed description, unit quantity, unit rate in AED, and standard 5% tax amount.`
  },
  {
    id: "art_3",
    categoryId: "crm_portal",
    title: "How to Digitally Sign Quotations and Pay via Razorpay / Stripe",
    summary: "Learn how to access your secure client portal, sign commercial proposals with digital touch-signature, and download receipts.",
    readTime: "2 min read",
    likes: 82,
    views: 620,
    content: `## 1-Click Digital Sign-off
Clients can review their issued quotations directly through their dedicated portal:
1. Navigate to Quotations tab.
2. Click E-Sign to open the signature canvas.
3. Draw your signature and click Authorize.
4. Complete deposit payment via Razorpay / Card gateway to initiate immediate onboarding.`
  }
];

export default function HelpCenterView({ websiteId }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [likedArticles, setLikedArticles] = useState({});
  const [showAskModal, setShowAskModal] = useState(false);
  const [askQuestionText, setAskQuestionText] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [askingAi, setAskingAi] = useState(false);

  const filteredArticles = INITIAL_ARTICLES.filter(art => {
    if (selectedCategory !== "all" && art.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return art.title.toLowerCase().includes(q) || art.summary.toLowerCase().includes(q);
    }
    return true;
  });

  const handleAskAiAssistant = () => {
    if (!askQuestionText.trim()) return;
    setAskingAi(true);
    setAiAnswer("");

    setTimeout(() => {
      setAskingAi(false);
      setAiAnswer(
        `Based on UAE Regulatory Standards & Knowledge Base:\n\n` +
        `Regarding "${askQuestionText}":\n` +
        `• FTA regulations state that standard VAT rate of 5% applies to commercial supply within the state.\n` +
        `• To ensure full compliance, attach your TRN certificate and verify your client portal credentials.\n` +
        `• If you require bespoke assistance, our support desk is standing by 24/7.`
      );
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Hero Search Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-[32px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden border border-indigo-900/50 text-center space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
          <Sparkles size={12} className="text-amber-300 animate-pulse" /> Self-Service Knowledge & Resolution Hub
        </div>

        <div className="max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">How can we assist your business today?</h2>
          <p className="text-xs font-medium text-slate-300">
            Search hundreds of verified articles on UAE Corporate Tax, Invoicing, VAT, and Portal guides.
          </p>
        </div>

        {/* Big Search Bar */}
        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords: 'corporate tax deadline', 'vat invoice format'..."
            className="w-full pl-12 pr-28 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-xs font-bold text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-slate-900/90 transition-all shadow-xl"
          />
          <button
            onClick={() => setShowAskModal(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-md"
          >
            <Sparkles size={12} /> Ask AI
          </button>
        </div>
      </div>

      {/* Category Pills Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
            selectedCategory === "all"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Topics
        </button>
        {KNOWLEDGE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 ${
              selectedCategory === cat.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Article Grid & Detail View */}
      {selectedArticle ? (
        <div className="bg-white rounded-[32px] p-8 md:p-10 border border-slate-200/80 shadow-sm space-y-6 animate-in fade-in">
          <button
            onClick={() => setSelectedArticle(null)}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 transition-all"
          >
            ← Back to Articles
          </button>

          <div className="space-y-3 border-b border-slate-100 pb-6">
            <h1 className="text-xl md:text-2xl font-black text-slate-900">{selectedArticle.title}</h1>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
              <span>{selectedArticle.readTime}</span>
              <span>•</span>
              <span>{selectedArticle.views} Views</span>
            </div>
          </div>

          <div className="prose max-w-none text-slate-700 text-xs font-medium leading-relaxed whitespace-pre-line">
            {selectedArticle.content}
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Was this article helpful?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLikedArticles({ ...likedArticles, [selectedArticle.id]: "liked" })}
                className={`p-2.5 rounded-xl border flex items-center gap-1 text-xs font-black transition-all ${
                  likedArticles[selectedArticle.id] === "liked"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ThumbsUp size={14} /> Helpful
              </button>
              <button
                onClick={() => setLikedArticles({ ...likedArticles, [selectedArticle.id]: "disliked" })}
                className={`p-2.5 rounded-xl border flex items-center gap-1 text-xs font-black transition-all ${
                  likedArticles[selectedArticle.id] === "disliked"
                    ? "bg-rose-50 border-rose-300 text-rose-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ThumbsDown size={14} /> Not Helpful
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredArticles.map(art => (
            <div
              key={art.id}
              onClick={() => setSelectedArticle(art)}
              className="bg-white rounded-[28px] p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  <FileText size={18} />
                </div>
                <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                  {art.title}
                </h3>
                <p className="text-xs font-medium text-slate-500 line-clamp-3 leading-relaxed">
                  {art.summary}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400">
                <span>{art.readTime}</span>
                <span className="text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Read Guide <ChevronRight size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ask AI Assistant Modal */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl space-y-6 animate-scale-in border border-indigo-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">AI Knowledge Assistant</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instant Answers from Knowledge Base</p>
                </div>
              </div>
              <button onClick={() => setShowAskModal(false)} className="p-2 text-slate-400 hover:text-slate-800 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Your Question</label>
                <textarea
                  rows={3}
                  value={askQuestionText}
                  onChange={(e) => setAskQuestionText(e.target.value)}
                  placeholder="e.g. What is the fine for late Corporate Tax registration in UAE?"
                  className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {askingAi && (
                <div className="py-6 text-center space-y-2">
                  <Sparkles size={24} className="mx-auto text-indigo-600 animate-spin" />
                  <p className="text-xs font-black text-indigo-700 uppercase tracking-wider">Synthesizing Answer from FTA Standards…</p>
                </div>
              )}

              {aiAnswer && (
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 block">AI Generated Guidance</span>
                  <p className="text-xs font-medium text-slate-800 whitespace-pre-line leading-relaxed">{aiAnswer}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAskModal(false)}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAskAiAssistant}
                className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                <Sparkles size={14} /> Ask Gemini AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
