import React, { useState, useEffect } from "react";
import { UserPlus, Shield, CheckCircle, X, ArrowRight, MessageSquare, AlertCircle, Sparkles, PhoneForwarded } from "lucide-react";
import { api } from "../api/client.js";

export default function TransferCallModal({ isOpen, onClose, activeCall, onConfirmTransfer }) {
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTeamAgents();
    }
  }, [isOpen]);

  const fetchTeamAgents = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users/agents");
      const list = res.data?.agents || res.data || [];
      setAgents(Array.isArray(list) ? list : []);
      if (list.length > 0 && !selectedAgentId) {
        setSelectedAgentId(list[0]._id || list[0].id || "");
      }
    } catch (err) {
      console.error("Failed to load agents for transfer:", err);
      // Fallback mock team members if offline/error
      setAgents([
        { _id: "senior_admin", name: "Senior Lead Specialist", role: "admin", department: "Escalations", status: "online" },
        { _id: "billing_expert", name: "Billing & Finance Lead", role: "manager", department: "Billing", status: "online" },
        { _id: "tech_architect", name: "Technical Solutions Lead", role: "admin", department: "Engineering", status: "online" }
      ]);
      setSelectedAgentId("senior_admin");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !activeCall) return null;

  const handleTransfer = () => {
    if (!selectedAgentId) return;
    setSubmitting(true);
    onConfirmTransfer(selectedAgentId, transferNote);
    setTimeout(() => {
      setSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-zoom-in">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <PhoneForwarded size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Transfer Live Call to Senior / Agent
              </h3>
              <p className="text-xs text-slate-500">
                Visitor: <span className="font-bold text-slate-800 dark:text-slate-200">{(activeCall.visitorName && activeCall.visitorName !== "Website Visitor") ? activeCall.visitorName : (activeCall.telemetry?.city ? `Visitor (${activeCall.telemetry.city})` : "Visitor")}</span>
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          
          {/* Target Agent Selection */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Select Senior Agent / Team Member
            </label>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium animate-pulse">
                Loading available team members...
              </div>
            ) : (
              <div className="space-y-2">
                {agents.map((ag) => {
                  const id = ag._id || ag.id;
                  const isSelected = selectedAgentId === id;
                  return (
                    <div
                      key={id}
                      onClick={() => setSelectedAgentId(id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                          : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isSelected ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                          }`}>
                            {ag.name?.[0]?.toUpperCase() || "A"}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{ag.name}</h4>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                              {ag.role || "Specialist"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {ag.department ? `Dept: ${ag.department}` : (ag.email || "Available Online")}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <CheckCircle size={14} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-white/20" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Handover Note */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Internal Handover Note (Optional)</span>
              <span className="text-[10px] font-normal text-slate-400 lowercase">visible to senior in popup</span>
            </label>
            <textarea
              rows={2}
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="e.g., Customer requesting custom quotation approval for 100 enterprise licenses..."
              className="w-full text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Quick Notice */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <p className="text-[11.5px] leading-relaxed">
              When you transfer, the visitor will be notified and placed on brief hold until the senior agent accepts the call.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-black text-xs uppercase tracking-wider transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedAgentId || submitting}
            onClick={handleTransfer}
            className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-95"
          >
            <PhoneForwarded size={15} />
            <span>{submitting ? "Transferring..." : "Transfer Call"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
