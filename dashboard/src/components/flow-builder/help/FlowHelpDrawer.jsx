import React, { useState, useEffect } from "react";
import { useFlowStore } from "../store/useFlowStore.js";
import { FAQ_ITEMS, NODE_DOCUMENTATION } from "./flowHelpData.js";
import { api } from "../../../api/client.js";
import {
  HelpCircle,
  Search,
  BookOpen,
  Keyboard,
  ShieldCheck,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCcw,
  FileText,
  HelpCircle as HelpIcon,
  MessageSquare,
  Zap,
  Network,
  Bot
} from "lucide-react";

export function FlowHelpDrawer() {
  const showHelpDrawer = useFlowStore((s) => s.showHelpDrawer);
  const setShowHelpDrawer = useFlowStore((s) => s.setShowHelpDrawer);
  const setShowProductTour = useFlowStore((s) => s.setShowProductTour);

  const [activeTab, setActiveTab] = useState("faq"); // "faq" | "db_articles" | "nodes" | "shortcuts"
  const [search, setSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [dbArticles, setDbArticles] = useState([]);
  const [loadingDb, setLoadingDb] = useState(false);

  useEffect(() => {
    if (showHelpDrawer) {
      setLoadingDb(true);
      api("/api/help/articles")
        .then((data) => {
          setDbArticles(data || []);
          setLoadingDb(false);
        })
        .catch(() => setLoadingDb(false));
    }
  }, [showHelpDrawer]);

  if (!showHelpDrawer) return null;

  const filteredFaqs = FAQ_ITEMS.filter(
    (item) =>
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
  );

  const handleRestartTour = () => {
    setShowHelpDrawer(false);
    setShowProductTour(true);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end select-none animate-in fade-in duration-200"
      onClick={() => setShowHelpDrawer(false)}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-2xl">
              <HelpCircle size={22} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-base">
                Help & Knowledge Center
              </h3>
              <p className="text-xs text-slate-400 font-medium">Database Help Articles, 50 FAQs & Interactive Tour</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestartTour}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-100"
              title="Restart Interactive Onboarding Tour"
            >
              <RotateCcw size={13} /> Restart Tour
            </button>
            <button onClick={() => setShowHelpDrawer(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/50 p-2 gap-1">
          <button
            onClick={() => setActiveTab("faq")}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "faq"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <HelpIcon size={14} /> 50 FAQs
          </button>
          <button
            onClick={() => setActiveTab("db_articles")}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "db_articles"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <FileText size={14} /> DB Docs ({dbArticles.length})
          </button>
          <button
            onClick={() => setActiveTab("nodes")}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "nodes"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <BookOpen size={14} /> Node Types
          </button>
          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "shortcuts"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Keyboard size={14} /> Shortcuts
          </button>
        </div>

        {/* Search Input */}
        {activeTab === "faq" && (
          <div className="p-4 border-b border-slate-100 dark:border-white/10">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search FAQs (publish, condition, form, broken link)..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* DB Articles Tab */}
          {activeTab === "db_articles" && (
            <div className="space-y-4">
              {loadingDb && (
                <div className="py-12 text-center text-xs font-bold text-slate-400">Loading Database Help Articles...</div>
              )}
              {dbArticles.map((art) => (
                <div key={art._id || art.slug} className="p-5 rounded-3xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {art.category}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">DB Stored</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white">{art.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{art.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* FAQ Tab */}
          {activeTab === "faq" && (
            <div className="space-y-3">
              {filteredFaqs.map((faq, idx) => {
                const isExpanded = expandedFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 transition-all"
                  >
                    <button
                      onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                      className="w-full p-4 text-left font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between gap-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all"
                    >
                      <span>{faq.q}</span>
                      {isExpanded ? <ChevronUp size={16} className="shrink-0 text-indigo-500" /> : <ChevronDown size={16} className="shrink-0 text-slate-400" />}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 leading-relaxed font-medium bg-white dark:bg-slate-900">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Node Docs Tab */}
          {activeTab === "nodes" && (
            <div className="space-y-4">
              {NODE_DOCUMENTATION.map((nodeDoc) => (
                <div key={nodeDoc.type} className="p-5 rounded-3xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    {nodeDoc.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <strong>Purpose:</strong> {nodeDoc.purpose}
                  </p>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/30 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                    💡 <strong>Best Practice:</strong> {nodeDoc.bestPractices}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Keyboard Shortcuts Tab */}
          {activeTab === "shortcuts" && (
            <div className="space-y-2">
              {[
                { key: "Ctrl + Z", desc: "Undo last edit action" },
                { key: "Ctrl + Y / Ctrl + Shift + Z", desc: "Redo undone edit action" },
                { key: "Ctrl + S", desc: "Save Flow engine" },
                { key: "Ctrl + C", desc: "Copy selected node" },
                { key: "Ctrl + V", desc: "Paste copied node" },
                { key: "Right Click Canvas", desc: "Open Quick Add Node menu" }
              ].map((sc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{sc.desc}</span>
                  <span className="font-mono font-bold px-2.5 py-1 bg-white dark:bg-slate-900 border rounded-lg text-indigo-600 dark:text-indigo-400">
                    {sc.key}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
