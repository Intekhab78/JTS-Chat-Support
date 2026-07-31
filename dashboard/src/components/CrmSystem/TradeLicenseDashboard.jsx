import React, { useState, useEffect } from "react";
import {
  ShieldAlert, Calendar, Filter, AlertTriangle, AlertCircle, CheckCircle2, Clock, Users, Search, RefreshCw, ChevronRight, ShieldCheck,
  Plus, Edit3, Trash2, X, Save
} from "lucide-react";
import { api } from "../../api/client.js";

export default function TradeLicenseDashboard({ websiteId, teamMembers = [], onOpenCustomer }) {
  const [data, setData] = useState({ summary: {}, licenses: [] });
  const [loading, setLoading] = useState(true);
  const [consultantFilter, setConsultantFilter] = useState("");
  const [highlightFilter, setHighlightFilter] = useState(""); // "" | "red" | "orange" | "yellow" | "green"
  const [search, setSearch] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null); // null for Add, object for Edit
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    name: "",
    email: "",
    tradeLicenseNumber: "",
    issuingAuthority: "DET Dubai",
    tradeLicenseExpiryDate: "",
    serviceType: "Trade License Renewal",
    workStatus: "Pending",
    ownerId: ""
  });

  const fetchTlStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (websiteId) params.append("websiteId", websiteId);
      if (consultantFilter) params.append("consultantId", consultantFilter);
      if (highlightFilter) params.append("highlight", highlightFilter);

      const res = await api(`/api/crm/compliance/trade-license?${params.toString()}`);
      setData(res || { summary: {}, licenses: [] });
    } catch (err) {
      console.error("Failed to fetch Trade License stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTlStats();
  }, [websiteId, consultantFilter, highlightFilter]);

  const openAddModal = () => {
    setEditingLicense(null);
    setFormData({
      companyName: "",
      name: "",
      email: "",
      tradeLicenseNumber: "",
      issuingAuthority: "DET Dubai",
      tradeLicenseExpiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      serviceType: "Trade License Renewal",
      workStatus: "Pending",
      ownerId: teamMembers[0]?._id || ""
    });
    setShowModal(true);
  };

  const openEditModal = (license, e) => {
    e.stopPropagation();
    setEditingLicense(license);
    setFormData({
      companyName: license.companyName || "",
      name: license.name || "",
      email: license.email || "",
      tradeLicenseNumber: license.tradeLicenseNumber || "",
      issuingAuthority: license.issuingAuthority || "DET Dubai",
      tradeLicenseExpiryDate: license.tradeLicenseExpiryDate ? new Date(license.tradeLicenseExpiryDate).toISOString().substring(0, 10) : "",
      serviceType: license.serviceType || "Trade License Renewal",
      workStatus: license.workStatus || "Pending",
      ownerId: license.ownerId?._id || license.ownerId || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (license, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete Trade License for "${license.companyName || license.name}"?`)) return;
    try {
      await api(`/api/crm/compliance/trade-license/${license._id}`, { method: "DELETE" });
      fetchTlStats();
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
      if (editingLicense) {
        // Update Existing Record
        await api(`/api/crm/compliance/trade-license/${editingLicense._id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...formData, websiteId })
        });
      } else {
        // Create New Record
        await api("/api/crm/compliance/trade-license", {
          method: "POST",
          body: JSON.stringify({ ...formData, websiteId })
        });
      }
      setShowModal(false);
      fetchTlStats();
    } catch (err) {
      alert(err.message || "Failed to save Trade License record");
    } finally {
      setSaving(false);
    }
  };

  const filteredLicenses = (data.licenses || []).filter(l => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      (l.name && l.name.toLowerCase().includes(query)) ||
      (l.companyName && l.companyName.toLowerCase().includes(query)) ||
      (l.tradeLicenseNumber && l.tradeLicenseNumber.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Upper Title Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ShieldAlert size={20} />
            </div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">Trade License Expiry Dashboard</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            UAE Commercial Trade License expiry tracking & renewal workflows
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Add Trade License Button */}
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-600/20 flex items-center gap-2"
          >
            <Plus size={16} /> Add Trade License
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
            onClick={fetchTlStats}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
            title="Refresh Stats"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Color Highlight Bucket Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Red: Expired */}
        <div
          onClick={() => setHighlightFilter(highlightFilter === "red" ? "" : "red")}
          className={`p-6 rounded-[24px] border transition-all cursor-pointer ${
            highlightFilter === "red" ? "bg-rose-500 text-white border-rose-600 shadow-lg shadow-rose-200" : "bg-white border-slate-200 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-[9px] font-black uppercase tracking-widest ${highlightFilter === "red" ? "text-rose-100" : "text-rose-500"}`}>Already Expired</p>
            <div className={`w-3 h-3 rounded-full bg-rose-500 ${highlightFilter === "red" ? "ring-2 ring-white" : ""}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${highlightFilter === "red" ? "text-white" : "text-slate-900"}`}>{data.summary?.red || 0}</p>
          <p className={`text-[9px] font-bold mt-1 ${highlightFilter === "red" ? "text-rose-100" : "text-slate-400"}`}>Urgent Renewal Required</p>
        </div>

        {/* Orange: Expiring within 30 Days */}
        <div
          onClick={() => setHighlightFilter(highlightFilter === "orange" ? "" : "orange")}
          className={`p-6 rounded-[24px] border transition-all cursor-pointer ${
            highlightFilter === "orange" ? "bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-200" : "bg-white border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-[9px] font-black uppercase tracking-widest ${highlightFilter === "orange" ? "text-amber-100" : "text-amber-600"}`}>Expiring &lt;30 Days</p>
            <div className={`w-3 h-3 rounded-full bg-amber-500 ${highlightFilter === "orange" ? "ring-2 ring-white" : ""}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${highlightFilter === "orange" ? "text-white" : "text-slate-900"}`}>{data.summary?.orange || 0}</p>
          <p className={`text-[9px] font-bold mt-1 ${highlightFilter === "orange" ? "text-amber-100" : "text-slate-400"}`}>Action Priority High</p>
        </div>

        {/* Yellow: Expiring within 60 Days */}
        <div
          onClick={() => setHighlightFilter(highlightFilter === "yellow" ? "" : "yellow")}
          className={`p-6 rounded-[24px] border transition-all cursor-pointer ${
            highlightFilter === "yellow" ? "bg-yellow-500 text-white border-yellow-600 shadow-lg shadow-yellow-200" : "bg-white border-slate-200 hover:border-yellow-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-[9px] font-black uppercase tracking-widest ${highlightFilter === "yellow" ? "text-yellow-100" : "text-yellow-600"}`}>Expiring &lt;60 Days</p>
            <div className={`w-3 h-3 rounded-full bg-yellow-400 ${highlightFilter === "yellow" ? "ring-2 ring-white" : ""}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${highlightFilter === "yellow" ? "text-white" : "text-slate-900"}`}>{data.summary?.yellow || 0}</p>
          <p className={`text-[9px] font-bold mt-1 ${highlightFilter === "yellow" ? "text-yellow-100" : "text-slate-400"}`}>Upcoming Renewal Window</p>
        </div>

        {/* Green: Active / >60 Days */}
        <div
          onClick={() => setHighlightFilter(highlightFilter === "green" ? "" : "green")}
          className={`p-6 rounded-[24px] border transition-all cursor-pointer ${
            highlightFilter === "green" ? "bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-500/20" : "bg-white border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-[9px] font-black uppercase tracking-widest ${highlightFilter === "green" ? "text-emerald-100" : "text-emerald-600"}`}>Active / Healthy</p>
            <div className={`w-3 h-3 rounded-full bg-emerald-500 ${highlightFilter === "green" ? "ring-2 ring-white" : ""}`} />
          </div>
          <p className={`text-2xl font-black mt-2 ${highlightFilter === "green" ? "text-white" : "text-slate-900"}`}>{data.summary?.green || 0}</p>
          <p className={`text-[9px] font-bold mt-1 ${highlightFilter === "green" ? "text-emerald-100" : "text-slate-400"}`}>&gt;60 Days Validity</p>
        </div>
      </div>

      {/* Main Trade License Renewal Grid Table */}
      <div className="bg-white border border-slate-200 rounded-[28px] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Trade License Renewal Ledger</h3>
            <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">Showing license expiry dates, days remaining, and renewal status</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Company, License No..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[24%]">Client Company</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[16%]">Trade License No</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Expiry Date</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[18%]">Days Remaining</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[15%]">Assigned Consultant</th>
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
              ) : filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-xs font-bold text-slate-400">
                    No Trade Licenses found. Click <span className="text-amber-600 cursor-pointer font-black" onClick={openAddModal}>"+ Add Trade License"</span> to create one.
                  </td>
                </tr>
              ) : filteredLicenses.map((license) => {
                const category = license.highlightCategory;
                const days = license.daysRemaining;

                return (
                  <tr
                    key={license._id}
                    onClick={() => onOpenCustomer && onOpenCustomer(license)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs font-black text-slate-900">{license.companyName || license.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{license.email || "No Email"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {license.tradeLicenseNumber || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className={category === "red" ? "text-rose-500" : "text-slate-400"} />
                        <span className={`text-xs font-black ${
                          category === "red" ? "text-rose-600" :
                          category === "orange" ? "text-amber-600" : "text-slate-700"
                        }`}>
                          {license.tradeLicenseExpiryDate ? new Date(license.tradeLicenseExpiryDate).toLocaleDateString() : "Not Specified"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {days === null ? (
                        <span className="text-xs font-bold text-slate-400">No Expiry Date</span>
                      ) : category === "red" ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500 text-white rounded-xl w-fit shadow-sm">
                          <AlertCircle size={13} />
                          <span className="text-xs font-black uppercase">Expired ({Math.abs(days)}d ago)</span>
                        </div>
                      ) : category === "orange" ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white rounded-xl w-fit shadow-sm">
                          <AlertTriangle size={13} />
                          <span className="text-xs font-black uppercase">&lt;30 Days ({days}d left)</span>
                        </div>
                      ) : category === "yellow" ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400 text-slate-900 rounded-xl w-fit shadow-sm">
                          <Clock size={13} />
                          <span className="text-xs font-black uppercase">&lt;60 Days ({days}d left)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl w-fit">
                          <ShieldCheck size={13} />
                          <span className="text-xs font-black uppercase">Healthy ({days}d left)</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-700">
                        {license.ownerId?.name || "Unassigned"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => openEditModal(license, e)}
                          className="p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                          title="Edit Trade License & Expiry"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(license, e)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete License Record"
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

      {/* Add / Edit Trade License Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <ShieldAlert size={20} />
                </div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                  {editingLicense ? "Edit Trade License Schedule" : "Add New Trade License Record"}
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
                    placeholder="e.g. Royal Trading LLC"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20"
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
                    placeholder="e.g. Salim Al Mansoori"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20"
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
                    placeholder="info@royaltrading.ae"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Trade License Number
                  </label>
                  <input
                    type="text"
                    value={formData.tradeLicenseNumber}
                    onChange={(e) => setFormData({ ...formData, tradeLicenseNumber: e.target.value })}
                    placeholder="e.g. 584920 / CN-10293"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Issuing Authority
                  </label>
                  <select
                    value={formData.issuingAuthority}
                    onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="DET Dubai">DET Dubai (DED)</option>
                    <option value="IFZA">IFZA Freezone</option>
                    <option value="DMCC">DMCC Dubai</option>
                    <option value="ADGM">ADGM Abu Dhabi</option>
                    <option value="SHAMS">SHAMS Sharjah</option>
                    <option value="RAKEZ">RAKEZ Ras Al Khaimah</option>
                    <option value="DDA">DDA (Dubai Development Authority)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Trade License Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tradeLicenseExpiryDate}
                    onChange={(e) => setFormData({ ...formData, tradeLicenseExpiryDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="Pending">Pending Renewal</option>
                    <option value="In Progress">In Progress (Government)</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Completed">Renewed / Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">
                    Assigned Consultant
                  </label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20"
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
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2"
                >
                  {saving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {editingLicense ? "Save Changes" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
