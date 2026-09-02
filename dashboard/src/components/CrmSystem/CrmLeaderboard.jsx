import React, { useState } from "react";
import { Trophy, Medal, Star, Target, Flame, Sparkles, Award, Zap, PartyPopper } from "lucide-react";

export default function CRMLeaderboard({ agents = [] }) {
  const [celebratingAgent, setCelebratingAgent] = useState(null);
  const [confettiActive, setConfettiActive] = useState(false);

  // Fallback demo agents if empty
  const displayAgents = agents && agents.length > 0 ? agents : [
    { name: "Sarah Al Mansoori", email: "sarah@jts.ae", deals: 14, tasks: 42, revenue: 245000, streak: 6 },
    { name: "Rahul Sharma", email: "rahul@jts.ae", deals: 11, tasks: 38, revenue: 180000, streak: 4 },
    { name: "Tariq Mahmood", email: "tariq@jts.ae", deals: 8, tasks: 29, revenue: 125000, streak: 3 },
    { name: "Priya Patel", email: "priya@jts.ae", deals: 6, tasks: 22, revenue: 95000, streak: 2 }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  };

  const triggerCelebration = (agent) => {
    setCelebratingAgent(agent.name);
    setConfettiActive(true);
    setTimeout(() => {
      setConfettiActive(false);
      setCelebratingAgent(null);
    }, 3000);
  };

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm h-full flex flex-col relative overflow-hidden">
      {/* Confetti Animation Layer */}
      {confettiActive && (
        <div className="absolute inset-0 z-20 pointer-events-none bg-indigo-950/20 backdrop-blur-[1px] flex items-center justify-center animate-fade-in">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl text-center space-y-1 animate-scale-in border border-amber-400/40">
            <PartyPopper size={32} className="mx-auto text-amber-400 animate-bounce" />
            <p className="text-xs font-black uppercase tracking-widest text-amber-300">Sales Champion Celebrated!</p>
            <p className="text-sm font-black text-white">{celebratingAgent} is on Fire! 🔥</p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-200">Gamified League</span>
            <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-200">Live Quotas</span>
          </div>
          <h3 className="text-lg font-black text-slate-950 tracking-tight">Top Closers & Champions</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Performance, Streaks & Badges</p>
        </div>
        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
          <Trophy size={22} />
        </div>
      </div>

      <div className="space-y-3 flex-1">
        {displayAgents.map((agent, idx) => {
          const streak = agent.streak || (displayAgents.length - idx + 1);
          return (
            <div 
              key={agent.email || idx} 
              onClick={() => triggerCelebration(agent)}
              className={`group relative flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                idx === 0 
                  ? "bg-gradient-to-r from-amber-50/60 via-orange-50/30 to-white border-amber-200 shadow-sm" 
                  : "border-slate-100 hover:border-indigo-100 hover:bg-slate-50/70"
              }`}
              title="Click to celebrate deal streak!"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-sm shrink-0 ${
                idx === 0 ? "bg-amber-500 text-white shadow-amber-200" :
                idx === 1 ? "bg-slate-200 text-slate-700" :
                idx === 2 ? "bg-orange-200 text-orange-800" :
                "bg-slate-100 text-slate-500"
              }`}>
                {idx === 0 ? <Medal size={16} /> : idx + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black text-slate-900 truncate">{agent.name}</p>
                  {idx === 0 && <span className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-amber-400/20 text-amber-700 rounded border border-amber-300">👑 MVP</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex items-center gap-1 text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md">
                     <Star size={8} className="text-amber-500 fill-amber-500" /> {agent.deals || 4} Deals
                  </span>
                  <span className="flex items-center gap-0.5 text-[8px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100">
                     <Flame size={9} /> {streak} Streak
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-black text-indigo-700">{formatCurrency(agent.revenue || 50000)}</p>
                <span className="text-[8px] font-bold text-slate-400 block mt-0.5">Won Revenue</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active League Participants</span>
        <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">{displayAgents.length} Agents</span>
      </div>
    </div>
  );
}
