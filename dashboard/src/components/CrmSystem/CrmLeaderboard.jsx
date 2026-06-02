import React from "react";
import { Trophy, Medal, Star, Target } from "lucide-react";

export default function CRMLeaderboard({ agents }) {
  if (!agents || agents.length === 0) {
    return (
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
          <Target size={24} />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No sales data recorded</p>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  };

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm h-full flex flex-col">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h3 className="text-lg font-black text-slate-950 tracking-tight">Top Closers</h3>
          <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Performance by Revenue</p>
        </div>
        <Trophy className="text-amber-500" size={24} />
      </div>

      <div className="space-y-4 flex-1">
        {agents.map((agent, idx) => (
          <div key={agent.email} className="group relative flex items-center gap-4 p-4 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-sm shrink-0 ${
              idx === 0 ? "bg-amber-100 text-amber-600" :
              idx === 1 ? "bg-slate-100 text-slate-500" :
              idx === 2 ? "bg-orange-100 text-orange-600" :
              "bg-slate-50 text-slate-400"
            }`}>
              {idx === 0 ? <Medal size={16} /> : idx + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-slate-950 truncate">{agent.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded-md">
                   <Star size={8} className="text-amber-500 fill-amber-500" /> {agent.deals} Deals
                </span>
                <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md">
                   <Target size={8} className="text-emerald-500" /> {agent.tasks} Missions
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-black text-slate-900">{formatCurrency(agent.revenue)}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-50">
         <div className="flex items-center justify-between px-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Active Agents</span>
            <span className="text-xs font-black text-slate-900">{agents.length}</span>
         </div>
      </div>
    </div>
  );
}
