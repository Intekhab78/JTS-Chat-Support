import React, { useState, useEffect } from "react";
import {
  Calculator, Calendar, Filter, AlertCircle, CheckCircle2, Clock, Users, Search, RefreshCw, ChevronRight, Timer,
  Plus, Edit3, Trash2, X, Save
} from "lucide-react";
import { api } from "../../api/client.js";

export default function CorporateTaxDashboard({ websiteId, teamMembers = [], onOpenCustomer }) {
  const [data, setData] = useState({ summary: {}, filings: [] });
  const [loading, setLoading] = useState(true);
  const [consultantFilter, setConsultantFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingFiling, setEditingFiling] = useState(null); // null for Add, object for Edit
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    name: "",
    email: "",
    trn: "",
    financialYear: "2025-2026",
    corporateTaxPeriod: "FY 2025-2026",
    corporateTaxDueDate: "",
    serviceType: "Corporate Tax Filing",
    workStatus: "Pending",
    ownerId: ""
  });

  const fetchCtStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (websiteId) params.append("websiteId", websiteId);
      if (consultantFilter) params.append("consultantId", consultantFilter);

      const res = await api(`/api/crm/compliance/corporate-tax?${params.toString()}`);
      setData(res || { summary: {}, filings: [] });
    } catch (err) {
      console.error("Failed to fetch Corporate Tax stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCtStats();
  }, [websiteId, consultantFilter]);

  const openAddModal = () => {
    setEditingFiling(null);
    setFormData({
      companyName: "",
      name: "",
      email: "",
      trn: "",
      financialYear: "2025-2026",
      corporateTaxPeriod: "FY 2025-2026",
      corporateTaxDueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      serviceType: "Corporate Tax Filing",
      workStatus: "Pending",
      ownerId: teamMembers[0]?._id || ""
    });
    setShowModal(true);
  };

  const openEditModal = (filing, e) => {
    e.stopPropagation();
    setEditingFiling(filing);
    setFormData({
      companyName: filing.companyName || "",
      name: filing.name || "",
      email: filing.email || "",
      trn: filing.trn || "",
      financialYear: filing.financialYear || "2025-2026",
      corporateTaxPeriod: filing.corporateTaxPeriod || "FY 2025-2026",
      corporateTaxDueDate: filing.corporateTaxDueDate ? new Date(filing.corporateTaxDueDate).toISOString().substring(0, 10) : "",
      serviceType: filing.serviceType || "Corporate Tax Filing",
      workStatus: filing.workStatus || "Pending",
      ownerId: filing.ownerId?._id || filing.ownerId || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (filing, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete Corporate Tax schedule for "${filing.companyName || filing.name}"?`)) return;
    try {
      await api(`/api/crm/compliance/corporate-tax/${filing._id}`, { method: "DELETE" });
      fetchCtStats();
    } catch (err) {
      alert(err.message || "Failed to delete record");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.companyName && !formData.name) {
      alert("Please enter Company Name or Client Name");
      return;
    }
    setSaving(true);
    try {
      if (editingFiling) {
        // Update Existing Record
        await api(`/api/crm/compliance/corporate-tax/${editingFiling._id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...formData, websiteId })
        });
      } else {
        // Create New Record
        await api("/api/crm/compliance/corporate-tax", {
          method: "POST",
          body: JSON.stringify({ ...formData, websiteId })
        });
      }
      setShowModal(false);
      fetchCtStats();
    } catch (err) {
      alert(err.message || "Failed to save Corporate Tax record");
    } finally {
      setSaving(false);
    }
  };

  const filteredFilings = (data.filings || []).filter(f => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      (f.name && f.name.toLowerCase().includes(query)) ||
      (f.companyName && f.companyName.toLowerCase().includes(query)) ||
      (f.trn && f.trn.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Upper Title Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Calculator size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Corporate Tax Dashboard</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            UAE Corporate Tax registration & annual tax return filing deadlines
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Add CT Client Button */}
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Add CT Filing Record
          </button>

          {/* Consultant Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <Users size={14} className="text-slate-400" />
            <select
              value={consultantFilter}
              onChange={(e) => setConsultantFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none"
            >
              <option value="">All Consultants</option>
              {teamMembers.map(m => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchCtStats}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
            title="Refresh Stats"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-2">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total CT Clients</p>
          <p className="text-2xl font-black text-slate-900">{data.summary?.totalFilings || 0}</p>
          <p className="text-[9px] font-bold text-slate-400">Under Corporate Tax Scope</p>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-2">
          <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest">Pending Filings</p>
          <p className="text-2xl font-black text-amber-600">{data.summary?.pendingCount || 0}</p>
          <p className="text-[9px] font-bold text-slate-400">Awaiting Submission</p>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-2">
          <p className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Completed Filings</p>
          <p className="text-2xl font-black text-emerald-600">{data.summary?.completedCount || 0}</p>
          <p className="text-[9px] font-bold text-slate-400">Returns Filed Cleanly</p>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm space-y-2">
          <p className="text-[9px] font-black uppercase text-rose-500 tracking-widest">Overdue Filings</p>
          <p className="text-2xl font-black text-rose-600">{data.summary?.overdueCount || 0}</p>
          <p className="text-[9px] font-bold text-rose-500">Action Immediately Required</p>
        </div>
      </div>

      {/* Main Corporate Tax Filings & Countdown Table */}
      <div className="bg-white border border-slate-200 rounded-[28px] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Corporate Tax Deadlines & Countdown</h3>
            <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">Live countdown & filing status tracking for corporate tax clients</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Company, TRN..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[24%]">Client Company</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[16%]">CT Due Date</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[20%]">Countdown (Days Remaining)</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[14%]">Status</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[14%]">Assigned Consultant</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[12%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded-lg w-1/2" /></td>
                  </tr>
                ))
              ) : filteredFilings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                    No Corporate Tax filings found. Click <span className="text-emerald-600 cursor-pointer font-black" onClick={openAddModal}>"+ Add CT Filing Record"</span> to create one.
                  </td>
                </tr>
              ) : filteredFilings.map((filing) => {
                const days = filing.daysRemaining;
                const isOverdue = filing.isOverdue;

                return (
                  <tr
                    key={filing._id}
                    onClick={() => onOpenCustomer && onOpenCustomer(filing)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs font-black text-slate-900">{filing.companyName || filing.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{filing.email || "No Email"} {filing.trn ? `• TRN: ${filing.trn}` : ""}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className={isOverdue ? "text-rose-500" : "text-slate-400"} />
                        <span className={`text-xs font-black ${isOverdue ? "text-rose-600" : "text-slate-700"}`}>
                          {filing.corporateTaxDueDate ? new Date(filing.corporateTaxDueDate).toLocaleDateString() : "TBA"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {days === null ? (
                        <span className="text-xs font-bold text-slate-400">No Deadline Set</span>
                      ) : isOverdue ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl w-fit">
                          <AlertCircle size={13} />
                          <span className="text-xs font-black uppercase">Overdue ({Math.abs(days)}d ago)</span>
                        </div>
                      ) : filing.workStatus === "Completed" ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl w-fit">
                          <CheckCircle2 size={13} />
                          <span className="text-xs font-black uppercase">Completed</span>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border w-fit ${
                          days <= 30 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}>
                          <Timer size={13} />
                          <span className="text-xs font-black uppercase">{days} Days Remaining</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                        filing.workStatus === "Completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                        filing.workStatus === "In Progress" ? "bg-sky-50 text-sky-600 border border-sky-200" :
                        filing.workStatus === "Under Review" ? "bg-purple-50 text-purple-600 border border-purple-200" :
                        "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>
                        {filing.workStatus || "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-700">
                        {filing.ownerId?.name || "Unassigned"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => openEditModal(filing, e)}
                          className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                          title="Edit CT Schedule & Deadline"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(filing, e)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete CT Record"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-lg transition-colors">
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Corporate Tax Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Calculator size={20} />
                </div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                  {editingFiling ? "Edit Corporate Tax Schedule" : "Add New Corporate Tax Record"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="e.g. Gulf E-Commerce Ventures"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Client Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Aisha M"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="aisha.m@gulfcommerce.ae"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    CT TRN Number
                  </label>
                  <input
                    type="text"
                    value={formData.trn}
                    onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                    placeholder="100987654300003"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Financial Year
                  </label>
                  <input
                    type="text"
                    value={formData.financialYear}
                    onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                    placeholder="e.g. 2025-2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    CT Filing Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.corporateTaxDueDate}
                    onChange={(e) => setFormData({ ...formData, corporateTaxDueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Work Status
                  </label>
                  <select
                    value={formData.workStatus}
                    onChange={(e) => setFormData({ ...formData, workStatus: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Assigned Tax Consultant
                  </label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(m => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {editingFiling ? "Save Changes" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
