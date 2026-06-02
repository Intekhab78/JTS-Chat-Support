import React from "react";
import { TrendingUp } from "lucide-react";

export default function CRMPipelineBar({ customers }) {
  const pipelineCounts = customers.reduce((acc, c) => {
    const stage = c.pipelineStage || "new";
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  const stages = [
    { key: "new", label: "New", color: "bg-violet-500", count: pipelineCounts.new || 0 },
    { key: "contacted", label: "Contacted", color: "bg-sky-500", count: pipelineCounts.contacted || 0 },
    { key: "qualified", label: "Qualified", color: "bg-indigo-500", count: pipelineCounts.qualified || 0 },
    { key: "proposal", label: "Proposal", color: "bg-amber-500", count: pipelineCounts.proposal || 0 },
    { key: "negotiation", label: "Negotiation", color: "bg-orange-500", count: pipelineCounts.negotiation || 0 },
    { key: "won", label: "Won", color: "bg-emerald-500", count: pipelineCounts.won || 0 },
    { key: "lost", label: "Lost", color: "bg-red-400", count: pipelineCounts.lost || 0 },
  ];

  const total = customers.length || 1;

  return (
    <div className="premium-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CRM Pipeline</p>
          <p className="text-sm font-black text-slate-900">{customers.length} Total Records</p>
        </div>
        <TrendingUp size={18} className="text-indigo-400" />
      </div>

      <div className="flex rounded-xl overflow-hidden h-2.5 bg-slate-100 gap-0.5">
        {stages.map(s => s.count > 0 && (
          <div
            key={s.key}
            className={`${s.color} transition-all duration-700`}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>

      <div className="flex gap-4 flex-wrap">
        {stages.map(s => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{s.label} <span className="text-slate-900">{s.count}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
