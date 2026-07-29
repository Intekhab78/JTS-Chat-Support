import React, { useState, useEffect } from "react";
import {
  FileText, Calendar, Filter, AlertTriangle, CheckCircle2, Clock, Users, Search, RefreshCw, ChevronRight,
  Plus, Edit3, Trash2, X, Save
} from "lucide-react";
import { api } from "../../api/client.js";
import SearchableCustomerSelect from "../SearchableCustomerSelect.jsx";

export default function VatFilingDashboard({ websiteId, teamMembers = [], onOpenCustomer }) {
  const [data, setData] = useState({ summary: {}, upcomingFilingDates: [], clients: [] });
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(""); // YYYY-MM
  const [consultantFilter, setConsultantFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null); // null for Add, client object for Edit
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    name: "",
    email: "",
    trn: "",
    vatFilingPeriod: "Q1 2026",
    vatFilingDueDate: "",
    serviceType: "VAT Filing",
    workStatus: "Pending",
    ownerId: ""
  });

  const fetchVatStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (websiteId) params.append("websiteId", websiteId);
      if (monthFilter) params.append("month", monthFilter);
      if (consultantFilter) params.append("consultantId", consultantFilter);

      const res = await api(`/api/crm/compliance/vat?${params.toString()}`);
      setData(res || { summary: {}, upcomingFilingDates: [], clients: [] });
    } catch (err) {
      console.error("Failed to fetch VAT compliance stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVatStats();
  }, [websiteId, monthFilter, consultantFilter]);

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({
      companyName: "",
      name: "",
      email: "",
      trn: "",
      vatFilingPeriod: "Q1 2026",
      vatFilingDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      serviceType: "VAT Filing",
      workStatus: "Pending",
      ownerId: teamMembers[0]?._id || ""
    });
    setShowModal(true);
  };

  const openEditModal = (client, e) => {
    e.stopPropagation();
    setEditingClient(client);
    setFormData({
      companyName: client.companyName || "",
      name: client.name || "",
      email: client.email || "",
      trn: client.trn || "",
      vatFilingPeriod: client.vatFilingPeriod || "Q1 2026",
      vatFilingDueDate: client.vatFilingDueDate ? new Date(client.vatFilingDueDate).toISOString().substring(0, 10) : "",
      serviceType: client.serviceType || "VAT Filing",
      workStatus: client.workStatus || "Pending",
      ownerId: client.ownerId?._id || client.ownerId || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (client, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete VAT Filing schedule for "${client.companyName || client.name}"?`)) return;
    try {
      await api(`/api/crm/compliance/vat/${client._id}`, { method: "DELETE" });
      fetchVatStats();
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
      if (editingClient) {
        // Update Existing Record
        await api(`/api/crm/compliance/vat/${editingClient._id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...formData, websiteId })
        });
      } else {
        // Create New Record
        await api("/api/crm/compliance/vat", {
          method: "POST",
          body: JSON.stringify({ ...formData, websiteId })
        });
      }
      setShowModal(false);
      fetchVatStats();
    } catch (err) {
      alert(err.message || "Failed to save VAT Filing record");
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = (data.clients || []).filter(c => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.companyName && c.companyName.toLowerCase().includes(query)) ||
      (c.trn && c.trn.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Upper Title Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">VAT Filing Dashboard</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            UAE Value Added Tax compliance schedules & deadline management
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Add VAT Filing Button */}
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Add VAT Filing Record
          </button>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none"
            />
            {monthFilter && (
              <button onClick={() => setMonthFilter("")} className="text-[9px] font-black text-rose-500 uppercase">Clear</button>
            )}
          </div>

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
            onClick={fetchVatStats}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
            title="Refresh Stats"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-1.5">
          <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total VAT Filings</p>
          <p className="text-xl font-black text-slate-900">{data.summary?.totalClients || 0}</p>
          <p className="text-[8px] font-bold text-slate-400">Active VAT Scope</p>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-1.5">
          <p className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Pending Filings</p>
          <p className="text-xl font-black text-amber-600">{data.summary?.pending || 0}</p>
          <p className="text-[8px] font-bold text-slate-400">Awaiting Action</p>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-1.5">
          <p className="text-[8px] font-black uppercase text-emerald-500 tracking-widest">Completed Filings</p>
          <p className="text-xl font-black text-emerald-600">{data.summary?.completed || 0}</p>
          <p className="text-[8px] font-bold text-slate-400">Submitted Cleanly</p>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-1.5">
          <p className="text-[8px] font-black uppercase text-rose-500 tracking-widest">Overdue Filings</p>
          <p className="text-xl font-black text-rose-600">{data.summary?.overdue || 0}</p>
          <p className="text-[8px] font-bold text-rose-500">Passed Deadline</p>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-1.5">
          <p className="text-[8px] font-black uppercase text-sky-500 tracking-widest">Due This Week</p>
          <p className="text-xl font-black text-sky-600">{data.summary?.upcomingThisWeek || 0}</p>
          <p className="text-[8px] font-bold text-slate-400">Next 7 Days</p>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-1.5">
          <p className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">Due This Month</p>
          <p className="text-xl font-black text-indigo-600">{data.summary?.upcomingThisMonth || 0}</p>
          <p className="text-[8px] font-bold text-slate-400">Next 30 Days</p>
        </div>
      </div>

      {/* Main Client VAT Filing Schedule Table */}
      <div className="bg-white border border-slate-200 rounded-[28px] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">VAT Filing Schedule & Status</h3>
            <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">Comprehensive list of clients with VAT filing schedules</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Company, TRN, Name..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[24%]">Client Company</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[18%]">TRN Number</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%]">VAT Due Date</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Work Status</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Assigned Consultant</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[13%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded-lg w-1/2" /></td>
                  </tr>
                ))
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                    No VAT filing clients found. Click <span className="text-indigo-600 cursor-pointer font-black" onClick={openAddModal}>"+ Add VAT Filing Record"</span> to create one.
                  </td>
                </tr>
              ) : filteredClients.map((client) => {
                const isOverdue = client.vatFilingDueDate && new Date(client.vatFilingDueDate) < new Date() && client.workStatus !== "Completed";
                return (
                  <tr
                    key={client._id}
                    onClick={() => onOpenCustomer && onOpenCustomer(client)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs font-black text-slate-900">{client.companyName || client.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{client.email || "No Email"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {client.trn || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className={isOverdue ? "text-rose-500" : "text-slate-400"} />
                        <span className={`text-xs font-black ${isOverdue ? "text-rose-600" : "text-slate-700"}`}>
                          {client.vatFilingDueDate ? new Date(client.vatFilingDueDate).toLocaleDateString() : "Not Set"}
                        </span>
                        {isOverdue && (
                          <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-rose-100 text-rose-700 rounded">Overdue</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                        client.workStatus === "Completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                        client.workStatus === "In Progress" ? "bg-sky-50 text-sky-600 border border-sky-200" :
                        client.workStatus === "Under Review" ? "bg-purple-50 text-purple-600 border border-purple-200" :
                        "bg-amber-50 text-amber-600 border border-amber-200"
                      }`}>
                        {client.workStatus || "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-700">
                        {client.ownerId?.name || "Unassigned"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => openEditModal(client, e)}
                          className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors"
                          title="Edit VAT Schedule"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(client, e)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete VAT Record"
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

      {/* Add / Edit VAT Filing Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                    {editingClient ? "Edit VAT Filing Schedule" : "Add New VAT Filing Record"}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">UAE Value Added Tax Quarterly & Monthly Return Schedules</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <SearchableCustomerSelect
                  label="Company Name *"
                  required
                  mode="company"
                  value={formData.companyName}
                  websiteId={websiteId}
                  placeholder="Search or add company..."
                  onChange={(val) => setFormData(prev => ({ ...prev, companyName: val }))}
                  onSelectEntity={(item) => setFormData(prev => ({
                    ...prev,
                    companyName: item.companyName || item.name,
                    name: item.name || prev.name,
                    email: item.email || prev.email,
                    trn: item.trn || prev.trn
                  }))}
                />
                <SearchableCustomerSelect
                  label="Client Name"
                  mode="customer"
                  value={formData.name}
                  websiteId={websiteId}
                  placeholder="Search or add contact..."
                  onChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
                  onSelectEntity={(item) => setFormData(prev => ({
                    ...prev,
                    name: item.name || prev.name,
                    companyName: item.companyName || prev.companyName,
                    email: item.email || prev.email,
                    trn: item.trn || prev.trn
                  }))}
                />
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
                    placeholder="client@company.ae"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    TRN Number (UAE VAT TRN)
                  </label>
                  <input
                    type="text"
                    value={formData.trn}
                    onChange={(e) => setFormData({ ...formData, trn: e.target.value })}
                    placeholder="100345678900003"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Filing Period
                  </label>
                  <input
                    type="text"
                    value={formData.vatFilingPeriod}
                    onChange={(e) => setFormData({ ...formData, vatFilingPeriod: e.target.value })}
                    placeholder="e.g. Q1 2026 or Jan 2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    VAT Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.vatFilingDueDate}
                    onChange={(e) => setFormData({ ...formData, vatFilingDueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {editingClient ? "Save Changes" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
