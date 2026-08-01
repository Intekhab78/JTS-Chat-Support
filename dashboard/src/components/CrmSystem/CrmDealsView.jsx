import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Plus, Grid, List, Trash2, Edit3, X, Check, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { api } from "../../api/client.js";
import ConfirmModal from "../ConfirmModal.jsx";

const DEFAULT_STAGES = [
  { key: "new", label: "New Lead", color: "bg-violet-50 text-violet-600 border-violet-100" },
  { key: "contacted", label: "Contacted", color: "bg-sky-50 text-sky-600 border-sky-100" },
  { key: "qualified", label: "Qualified", color: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  { key: "proposal", label: "Proposal", color: "bg-amber-50 text-amber-600 border-amber-100" },
  { key: "negotiation", label: "Negotiation", color: "bg-orange-50 text-orange-600 border-orange-100" },
  { key: "won", label: "Closed Won", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { key: "lost", label: "Closed Lost", color: "bg-red-50 text-red-500 border-red-100" }
];

export default function CrmDealsView({ websiteId }) {
  const [deals, setDeals] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("board");
  const [search, setSearch] = useState("");

  // Deletion Modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDealId, setDeletingDealId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [form, setForm] = useState({
    dealName: "", dealValue: 0, expectedCloseDate: "", probability: 20,
    stage: "qualified", pipelineId: "", companyId: "", primaryContactId: "",
    priority: "medium", description: ""
  });

  const activeStages = pipelines[0]?.stages?.length ? pipelines[0].stages : DEFAULT_STAGES;



  const fetchDeals = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page,
        search,
        websiteId,
        limit: 100 // larger limit for Kanban board
      }).toString();
      const res = await api(`/api/crm/deals?${q}`);
      setDeals(res.deals || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelines = async () => {
    try {
      const res = await api(`/api/crm/pipelines?websiteId=${websiteId}`);
      setPipelines(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRelations = async () => {
    try {
      const comRes = await api(`/api/crm/companies?websiteId=${websiteId}&limit=100`);
      setCompanies(comRes.companies || []);

      const conRes = await api(`/api/crm/contacts?websiteId=${websiteId}&limit=100`);
      setContacts(conRes.contacts || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [search, websiteId]);

  useEffect(() => {
    if (showModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showModal]);

  useEffect(() => {
    if (websiteId) {
      fetchPipelines();
      fetchRelations();
    }
  }, [websiteId]);

  const handleOpenCreate = () => {
    setEditingDeal(null);
    setForm({
      dealName: "",
      dealValue: 0,
      expectedCloseDate: "",
      probability: 20,
      stage: activeStages[0]?.key || "qualified",
      pipelineId: pipelines[0]?._id || "",
      companyId: "",
      primaryContactId: "",
      priority: "medium",
      description: ""
    });
    setShowModal(true);
  };

  const handleOpenEdit = (deal) => {
    setEditingDeal(deal);
    setForm({
      dealName: deal.dealName || "",
      dealValue: deal.dealValue || 0,
      expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.split("T")[0] : "",
      probability: deal.probability || 20,
      stage: deal.stage || "qualified",
      pipelineId: deal.pipelineId || pipelines[0]?._id || "",
      companyId: deal.companyId?._id || deal.companyId || "",
      primaryContactId: deal.primaryContactId?._id || deal.primaryContactId || "",
      priority: deal.priority || "medium",
      description: deal.description || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      websiteId
    };

    try {
      if (editingDeal) {
        await api(`/api/crm/deals/${editingDeal._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await api("/api/crm/deals", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setShowModal(false);
      fetchDeals();
    } catch (err) {
      alert("Failed to save deal: " + err.message);
    }
  };

  const handleUpdateStage = async (id, nextStage) => {
    try {
      await api(`/api/crm/deals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage: nextStage })
      });
      fetchDeals();
    } catch (err) {
      alert(err.message);
    }
  };

  const confirmDelete = (id) => {
    setDeletingDealId(id);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!deletingDealId) return;
    setDeleting(true);
    try {
      await api(`/api/crm/deals/${deletingDealId}`, { method: "DELETE" });
      fetchDeals();
      setShowDeleteConfirm(false);
      setDeletingDealId(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val || 0);
  };

  // Drag and Drop implementation
  const onDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = (e, targetStage) => {
    const id = e.dataTransfer.getData("text");
    if (id) {
      handleUpdateStage(id, targetStage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals..."
            className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3.5 text-xs font-bold outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 placeholder:text-slate-300"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => setViewMode("board")} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${viewMode === "board" ? "bg-slate-900 text-white shadow-sm" : "text-slate-400"}`}>Board</button>
            <button onClick={() => setViewMode("list")} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${viewMode === "list" ? "bg-slate-900 text-white shadow-sm" : "text-slate-400"}`}>List</button>
          </div>
          <button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
            <Plus size={14} /> Add Deal
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : viewMode === "list" ? (
        /* List Mode Table */
        <div className="bg-white border border-slate-200/80 rounded-[30px] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Deal Name</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Value</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Stage</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Company</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Close Date</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-5 font-black text-slate-900">
                    <div>{deal.dealName}</div>
                    {deal.primaryContactId?.displayName && <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{deal.primaryContactId.displayName}</div>}
                  </td>
                  <td className="p-5 font-bold text-indigo-600">{formatCurrency(deal.dealValue)}</td>
                  <td className="p-5">
                    <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                      {deal.stage}
                    </span>
                  </td>
                  <td className="p-5 font-bold text-slate-600">{deal.companyId?.companyName || "-"}</td>
                  <td className="p-5 font-bold text-slate-600">
                    {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                       <button onClick={() => handleOpenEdit(deal)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"><Edit3 size={14} /></button>
                       <button onClick={() => confirmDelete(deal._id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban Board Mode */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {activeStages.map((stage) => {
            const stageDeals = deals.filter(d => d.stage === stage.key);
            const totalValue = stageDeals.reduce((sum, d) => sum + (d.dealValue || 0), 0);

            return (
              <div
                key={stage.key}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, stage.key)}
                className="flex flex-col bg-slate-50/50 border border-slate-100 p-4 rounded-[24px] min-w-[220px] max-h-[600px] overflow-y-auto space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-800">{stage.label}</h5>
                    <p className="text-[9px] font-black text-indigo-600 mt-0.5">{formatCurrency(totalValue)}</p>
                  </div>
                  <span className="w-5 h-5 flex items-center justify-center bg-slate-200/60 rounded-lg text-[10px] font-black text-slate-700">
                    {stageDeals.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal._id}
                      draggable
                      onDragStart={(e) => onDragStart(e, deal._id)}
                      onClick={() => handleOpenEdit(deal)}
                      className="p-4 bg-white border border-slate-150 rounded-[20px] shadow-sm hover:shadow-md cursor-pointer transition-all space-y-3.5"
                    >
                      <div>
                        <h6 className="text-xs font-black text-slate-900 leading-tight hover:text-indigo-600 transition-colors">{deal.dealName}</h6>
                        {deal.companyId?.companyName && <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-wider">{deal.companyId.companyName}</p>}
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                        <span className="text-indigo-600 font-extrabold flex items-center gap-0.5"><DollarSign size={12} />{deal.dealValue}</span>
                        {deal.expectedCloseDate && <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(deal.expectedCloseDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${deal.priority === "high" ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500"}`}>{deal.priority}</span>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                           <button onClick={() => handleOpenEdit(deal)} className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg transition-all"><Edit3 size={11} /></button>
                           <button onClick={() => confirmDelete(deal._id)} className="p-1 bg-red-50 hover:bg-red-100 text-red-400 rounded-lg transition-all"><Trash2 size={11} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] p-4 sm:p-6 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto" onClick={() => setShowModal(false)} />
          <div className="relative z-10 pointer-events-auto w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 sm:px-8 py-5 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-black text-slate-900">{editingDeal ? "Edit Deal" : "Create Deal"}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Deal Name</label>
                <input
                  required
                  value={form.dealName}
                  onChange={(e) => setForm({ ...form, dealName: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Deal Value ($)</label>
                  <input
                    type="number"
                    required
                    value={form.dealValue}
                    onChange={(e) => setForm({ ...form, dealValue: Number(e.target.value) })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Win Probability (%)</label>
                  <input
                    type="number"
                    required
                    value={form.probability}
                    onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Expected Close Date</label>
                  <input
                    type="date"
                    value={form.expectedCloseDate}
                    onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Stage</label>
                  <select
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                  >
                    {activeStages.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Company</label>
                <select
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                >
                  <option value="">Select Company</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>{c.companyName}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Primary Contact</label>
                <select
                  value={form.primaryContactId}
                  onChange={(e) => setForm({ ...form, primaryContactId: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                >
                  <option value="">Select Contact</option>
                  {contacts.map((c) => (
                    <option key={c._id} value={c._id}>{c.displayName || `${c.firstName} ${c.lastName}`}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full py-4 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 mt-2">
                <Check size={16} /> Save Deal
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Deal"
        message="Are you sure you want to delete this deal permanently? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={executeDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeletingDealId(null); }}
      />
    </div>
  );
}
