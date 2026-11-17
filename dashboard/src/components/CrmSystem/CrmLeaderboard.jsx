import React, { useState } from "react";
import { Trophy, Medal, Star, Flame, Award, PartyPopper, Users } from "lucide-react";
import { formatCurrency } from "../../utils/currencyFormatter.js";

export default function CRMLeaderboard({ agents = [] }) {
  const [celebratingAgent, setCelebratingAgent] = useState(null);
  const [confettiActive, setConfettiActive] = useState(false);

  const displayAgents = Array.isArray(agents) ? agents : [];

  const triggerCelebration = (agent) => {
    setCelebratingAgent(agent.name || agent.email || "Team Member");
    setConfettiActive(true);
    setTimeout(() => {
      setConfettiActive(false);
      setCelebratingAgent(null);
    }, 2500);
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs h-full flex flex-col relative overflow-hidden">
      {confettiActive && (
        <div className="absolute inset-0 z-20 pointer-events-none bg-slate-900/15 backdrop-blur-[1px] flex items-center justify-center animate-fade-in">
          <div className="bg-white text-slate-900 px-5 py-3.5 rounded-2xl shadow-xl text-center space-y-1 border border-amber-300">
            <PartyPopper size={24} className="mx-auto text-amber-500 animate-bounce" />
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Top Performer</p>
            <p className="text-xs font-black text-slate-900">{celebratingAgent}</p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="bg-amber-50 text-amber-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-amber-200">
              Sales League
            </span>
            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-200">
              Live Data
            </span>
          </div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">Top Closers & Champions</h3>
          <p className="text-[10px] font-medium text-slate-500">Real-time deal count, revenue & activity performance</p>
        </div>
        <div className="w-9 h-9 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl flex items-center justify-center shrink-0">
          <Trophy size={18} />
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {displayAgents.length === 0 ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-50/70 border border-dashed border-slate-200">
            <Users size={22} className="text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-600">No agent performance recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Closed deals and assigned consultant revenue will appear here automatically.</p>
          </div>
        ) : (
          displayAgents.map((agent, idx) => {
            const dealsCount = Number(agent.deals ?? agent.wonDeals ?? 0);
            const revenueVal = Number(agent.revenue ?? agent.wonRevenue ?? 0);
            const streakCount = Number(agent.streak ?? 0);
            return (
              <div
                key={agent.email || agent._id || idx}
                onClick={() => triggerCelebration(agent)}
                className={`group relative flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                  idx === 0
                    ? "bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/70"
                    : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50/70"
                }`}
                title="Click to highlight performer"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    idx === 0
                      ? "bg-amber-500 text-white"
                      : idx === 1
                      ? "bg-slate-200 text-slate-700"
                      : idx === 2
                      ? "bg-orange-100 text-orange-800"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {idx === 0 ? <Medal size={15} /> : idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900 truncate">{agent.name || agent.email || "Consultant"}</p>
                    {idx === 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200">
                        <Award size={9} /> MVP
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      <Star size={9} className="text-amber-500 fill-amber-500" /> {dealsCount} Deals
                    </span>
                    {streakCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100">
                        <Flame size={9} /> {streakCount} Streak
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-indigo-600">{formatCurrency(revenueVal)}</p>
                  <span className="text-[9px] font-medium text-slate-400 block">Won Revenue</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active League Participants</span>
        <span className="text-[11px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{displayAgents.length} Agents</span>
      </div>
    </div>
  );
}
