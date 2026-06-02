import React, { useState } from "react";
import { User, ChevronRight, Check, Trash2, UserPlus, Tag, Shield, AlertTriangle, TrendingUp, X, Clock } from "lucide-react";
import { formatCurrency } from "./CrmUIComponents.jsx";
import { isStaleLead, isHighValueLead } from "./crmUtils.js";

export default function CrmTableView({
  customers,
  loading,
  pagination,
  leadView,
  openCustomer,
  selectedIds = [],
  toggleSelection,
  clearSelection,
  onBulkUpdate,
  onBulkDelete,
  canBulkDelete,
  teamMembers = []
}) {
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionType, setBulkActionType] = useState(null); // 'owner' | 'stage' | 'status'

  const allSelected = customers.length > 0 && selectedIds.length === customers.length;

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                customers.forEach(c => {
                  if (allSelected) {
                    if (selectedIds.includes(c._id)) toggleSelection(c._id);
                  } else {
                    if (!selectedIds.includes(c._id)) toggleSelection(c._id);
                  }
                });
              }}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">Lead Register</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.18em] mt-0.5">{pagination.total || customers.length} records in scope</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {selectedIds.length > 0 && (
              <p className="text-[10px] font-black uppercase text-indigo-600 animate-pulse">
                {selectedIds.length} Records Selected
              </p>
            )}
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {leadView.replaceAll("_", " ")}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="w-12 px-6 py-4" />
                <th className="px-6 py-4 small-label w-[20%]">Opportunity</th>
                <th className="px-6 py-4 small-label w-[15%]">Stage & Status</th>
                <th className="px-6 py-4 small-label w-[15%]">Owner</th>
                <th className="px-6 py-4 small-label w-[15%]">Timeline</th>
                <th className="px-6 py-4 small-label w-[15%]">Financials</th>
                <th className="px-6 py-4 small-label w-[15%]">Updated</th>
                <th className="w-12 px-6 py-4 small-label" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={8} className="px-6 py-6">
                      <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
                        <User size={20} className="text-slate-300" />
                      </div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No customers found</p>
                    </div>
                  </td>
                </tr>
              ) : customers.map((c) => {
                const isSelected = selectedIds.includes(c._id);
                return (
                  <tr
                    key={c._id}
                    className={`hover:bg-slate-50/60 transition-colors cursor-pointer group ${isSelected ? "bg-indigo-50/30" : ""}`}
                  >
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(c._id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-5" onClick={() => openCustomer(c)}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-200 shrink-0">
                          {c.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{c.name}</p>
                            {isStaleLead(c) && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500 text-white text-[7px] font-black uppercase tracking-widest rounded shadow-sm">
                                <AlertTriangle size={8} />
                                Stale
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold truncate">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5" onClick={() => openCustomer(c)}>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{c.pipelineStage}</p>
                        <span className={`px-2 py-0.5 mt-1 inline-block rounded text-[8px] font-black uppercase tracking-widest border ${c.status === "customer" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          c.status === "lead" ? "bg-sky-50 text-sky-600 border-sky-100" :
                            c.status === "prospect" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                              "bg-slate-100 text-slate-400 border-slate-200"
                          }`}>
                          {c.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5" onClick={() => openCustomer(c)}>
                      <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest truncate">
                          {c.ownerId?.name || "Unassigned"}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold truncate">
                          {c.decisionMaker || "No DM defined"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5" onClick={() => openCustomer(c)}>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{c.timeline || "TBD"}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                          Close: {c.expectedCloseDate ? new Date(c.expectedCloseDate).toLocaleDateString() : "TBA"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5" onClick={() => openCustomer(c)}>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                          Bud: {c.budget ? formatCurrency(c.budget) : "TBD"}
                          {isHighValueLead(c) && (
                            <span className="flex items-center gap-1 text-[8px] text-emerald-500 font-black">
                              <TrendingUp size={10} />
                              HIGH CAP
                            </span>
                          )}
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Est: {c.leadValue ? formatCurrency(c.leadValue) : "TBD"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5" onClick={() => openCustomer(c)}>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest truncate">
                        {new Date(c.lastInteraction).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openCustomer(c, 'actions'); }}
                          className="w-8 h-8 rounded-full hover:bg-amber-50 flex items-center justify-center text-slate-300 hover:text-amber-500 transition-all"
                          title="Create Task"
                        >
                          <Clock size={16} />
                        </button>
                        <div className="w-8 h-8 rounded-full hover:bg-indigo-50 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 transition-all ml-auto">
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[50] bg-slate-900 text-white rounded-3xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-6 border border-white/10 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3 px-4 border-r border-white/10">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-xs">
              {selectedIds.length}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest">Records Selected</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkActionType('owner')}
              className="px-4 py-2 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <UserPlus size={14} className="text-indigo-400" /> Assign
            </button>
            <button
              onClick={() => setBulkActionType('stage')}
              className="px-4 py-2 hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <Tag size={14} className="text-amber-400" /> Set Stage
            </button>
            {canBulkDelete && (
              <button
                onClick={onBulkDelete}
                className="px-4 py-2 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>

          {/* Bulk Action Popovers */}
          {bulkActionType === 'owner' && (
            <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 min-w-[200px] text-slate-900 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3">Reassign to Agent</p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                {teamMembers.filter(m => ["sales", "manager"].includes(m.role)).map(m => (
                  <button
                    key={m._id}
                    onClick={() => { onBulkUpdate({ ownerId: m._id }); setBulkActionType(null); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-[10px] font-bold transition-all flex items-center justify-between group"
                  >
                    {m.name}
                    <ChevronRight size={12} className="opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
                <button
                  onClick={() => { onBulkUpdate({ ownerId: null }); setBulkActionType(null); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 text-[10px] font-bold transition-all"
                >
                  Unassign All
                </button>
              </div>
              <button onClick={() => setBulkActionType(null)} className="mt-3 w-full py-2 bg-slate-100 text-[9px] font-black uppercase rounded-lg">Cancel</button>
            </div>
          )}

          {bulkActionType === 'stage' && (
            <div className="absolute bottom-full mb-4 right-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 min-w-[200px] text-slate-900 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3">Update Pipeline Stage</p>
              <div className="grid grid-cols-1 gap-1">
                {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map(stage => (
                  <button
                    key={stage}
                    onClick={() => { onBulkUpdate({ pipelineStage: stage }); setBulkActionType(null); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-[10px] font-bold uppercase tracking-tight transition-all"
                  >
                    {stage}
                  </button>
                ))}
              </div>
              <button onClick={() => setBulkActionType(null)} className="mt-3 w-full py-2 bg-slate-100 text-[9px] font-black uppercase rounded-lg">Cancel</button>
            </div>
          )}

          <button
            onClick={() => clearSelection()}
            className="ml-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
