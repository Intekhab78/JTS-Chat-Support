import React, { useState } from "react";
import { X, Shield, Activity, User, Info, Smartphone, Globe, Clock, Bot, Ticket, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import HistoryTimelineTab from "../CrmSystem/DrawerTabs/HistoryTimelineTab.jsx";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function ConversationDrawer({ 
  session, 
  isOpen, 
  onClose,
  onConvertToTicket,
  onDeleteSession 
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotedId, setPromotedId] = useState(null);

  const handlePromote = async () => {
    setIsPromoting(true);
    try {
      const customer = await api("/api/crm/promote", {
        method: "POST",
        body: JSON.stringify({ 
          visitorId: session.visitorId?.visitorId, 
          sessionId: session.sessionId 
        })
      });
      setPromotedId(customer._id);
      toast.success("Successfully promoted to CRM Lead");
    } catch (err) {
      toast.error(err.message || "Promotion failed");
    } finally {
      setIsPromoting(false);
    }
  };

  if (!isOpen || !session) return null;

  const visitor = session.visitorId;
  const metrics = [
    { label: "Platform", value: visitor?.os || "Unknown", icon: Smartphone },
    { label: "Browser", value: visitor?.browser || "Unknown", icon:Globe },
    { label: "Location", value: `${visitor?.city || 'Unknown'}, ${visitor?.country || 'Earth'}`, icon: Globe },
    { label: "IP Address", value: visitor?.ipAddress || "0.0.0.0", icon: Shield },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-500" 
        onClick={onClose}
      />
      
      {/* Drawer Content */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] h-full overflow-hidden flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-black/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xl shadow-indigo-200">
              {visitor?.name?.slice(0, 2).toUpperCase() || "AN"}
            </div>
            <div>
              <h2 className="text-lg font-black dark:text-white truncate max-w-[200px]">{visitor?.name || "Anonymous User"}</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{session.sessionId}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:rotate-90 transition-all shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 border-b border-slate-50 dark:border-white/5 bg-white dark:bg-slate-900 sticky top-0 z-20">
          <div className="flex gap-8">
            {[
              { id: "overview", label: "Intelligence", icon: Info },
              { id: "audit", label: "Governance Audit", icon: Shield },
              { id: "actions", label: "Administrative", icon: Activity }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-6 flex items-center gap-2 border-b-2 transition-all text-[10px] font-black uppercase tracking-[0.15em] ${
                  activeTab === tab.id 
                  ? "border-indigo-600 text-indigo-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30 dark:bg-black/10">
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* AI Intelligence Summary */}
              {session.aiSummary && (
                <div className="bg-slate-900 dark:bg-indigo-600 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
                    <Sparkles size={120} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                        <Sparkles size={16} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-indigo-200">AI Intelligent Summary</span>
                    </div>
                    <p className="text-sm font-bold leading-relaxed text-slate-100 italic">
                      "{session.aiSummary}"
                    </p>
                  </div>
                </div>
              )}

              {/* Device & Location Grid */}
              <div className="grid grid-cols-2 gap-4">
                {metrics.map((m, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
                        <m.icon size={14} />
                      </div>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{m.label}</span>
                    </div>
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Bot Journey */}
              {session.botMetadata?.path?.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-slate-50 dark:border-white/5 bg-indigo-50/30 dark:bg-indigo-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bot size={18} className="text-indigo-600" />
                      <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">AI Navigation Path</span>
                    </div>
                  </div>
                  <div className="p-8 space-y-6">
                    {session.botMetadata.path.map((step, idx) => (
                      <div key={idx} className="flex gap-4 relative">
                        {idx < session.botMetadata.path.length - 1 && (
                          <div className="absolute left-4 top-8 bottom-[-1.5rem] w-0.5 bg-slate-100 dark:bg-white/5" />
                        )}
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-black text-xs shrink-0 z-10">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{step}</p>
                          <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Navigation Event</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CRM Integration Action */}
              {!session.customerId && (
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-200 dark:shadow-none">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight">Convert to CRM Lead</h4>
                      <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Sales Pipeline Bridge</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90 mb-6 font-medium">
                    Pull this visitor's data, session history, and device profile directly into your sales pipeline for long-term management.
                  </p>
                  {promotedId ? (
                    <a 
                      href={`/dashboard?tab=crm&customerId=${promotedId}`}
                      className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={14} /> View Lead in CRM
                    </a>
                  ) : (
                    <button 
                      onClick={handlePromote}
                      disabled={isPromoting}
                      className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      {isPromoting ? "Processing..." : "Promote to Enterprise CRM"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "audit" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <HistoryTimelineTab entityId={session._id} />
            </div>
          )}

          {activeTab === "actions" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-rose-50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 p-6 rounded-[32px] space-y-4">
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <Shield size={18} />
                  <span className="text-[11px] font-black uppercase tracking-tight">Destructive Operations</span>
                </div>
                <p className="text-[10px] text-rose-500/70 dark:text-rose-400/50 font-medium leading-relaxed uppercase tracking-widest">
                  Danger zone actions require high-level authorization. Deletion is irreversible and removes all associated audit history permanently.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button 
                    onClick={() => onDeleteSession(session.sessionId)}
                    className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-rose-500/20 hover:bg-rose-600 hover:text-white transition-all group"
                  >
                    <Trash2 size={24} className="text-rose-500 group-hover:text-white transition-colors" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Wipe Session</span>
                  </button>
                  <button className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 hover:bg-slate-950 hover:text-white transition-all group">
                    <Shield size={24} className="text-slate-400 group-hover:text-white transition-colors" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Blacklist IP</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
