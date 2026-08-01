import React, { useState, useEffect } from "react";
import {
  ShieldAlert, Calendar, Filter, AlertTriangle, AlertCircle, CheckCircle2, Clock, Users, Search, RefreshCw, ChevronRight, ShieldCheck,
  Plus, Edit3, Trash2, X, Save, Eye, RotateCw, Mail, Phone, Building2
} from "lucide-react";
import { api } from "../../api/client.js";
import SearchableCustomerSelect from "../SearchableCustomerSelect.jsx";

export default function TradeLicenseDashboard({ websiteId, teamMembers = [], onOpenCustomer }) {
  const [data, setData] = useState({ summary: {}, licenses: [] });
  const [loading, setLoading] = useState(true);
  const [consultantFilter, setConsultantFilter] = useState("");
  const [highlightFilter, setHighlightFilter] = useState(""); // "" | "red" | "orange" | "yellow" | "green"
  const [search, setSearch] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null); // null for Add, object for Edit
  const [inspectingLicense, setInspectingLicense] = useState(null); // Detailed License Profile Modal
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

  const handleRenewLicense = async (license, durationYears = 1) => {
    const currentExpiry = license.tradeLicenseExpiryDate ? new Date(license.tradeLicenseExpiryDate) : new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setFullYear(newExpiry.getFullYear() + durationYears);
    const newExpiryStr = newExpiry.toISOString().substring(0, 10);

    if (!confirm(`Confirm Trade License Renewal for "${license.companyName || license.name}"?\n\nNew Expiry Date will be set to: ${newExpiryStr} (+${durationYears} Year)\nWork Status will be updated to Completed & Healthy.`)) {
      return;
    }

    setSaving(true);
    try {
      try {
        await api(`/api/crm/compliance/trade-license/${license._id}`, {
          method: "PATCH",
          body: JSON.stringify({
            tradeLicenseExpiryDate: newExpiryStr,
            workStatus: "Completed"
          })
        });
      } catch {
        await api(`/api/crm/${license._id}`, {
          method: "PATCH",
          body: JSON.stringify({
            tradeLicenseExpiryDate: newExpiryStr,
            workStatus: "Completed"
          })
        });
      }
      alert(`✅ Trade License successfully renewed for "${license.companyName || license.name}"!\nNew Expiry Date: ${newExpiryStr}`);
      setInspectingLicense(null);
      fetchTlStats();
    } catch (err) {
      alert(err.message || "Failed to renew license");
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
            highlightFilter === "green" ? "bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-200" : "bg-white border-slate-200 hover:border-emerald-300"
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
          <table className="w-full text-left table-fixed min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[22%]">Client Company</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[14%]">Trade License No</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[13%]">Expiry Date</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[17%]">Days Remaining</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[16%]">Assigned Consultant</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 w-[18%] text-right">Actions</th>
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
                const days = license.daysRemaining !== undefined && license.daysRemaining !== null
                  ? license.daysRemaining
                  : (license.tradeLicenseExpiryDate ? Math.ceil((new Date(license.tradeLicenseExpiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null);

                const isRenewed = license.workStatus === "Completed";
                const category = isRenewed ? "green" : (license.alertLevel || (days === null ? "green" : days < 0 ? "red" : days <= 30 ? "orange" : days <= 60 ? "yellow" : "green"));

                return (
                  <tr
                    key={license._id}
                    onClick={() => setInspectingLicense(license)}
                    className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-900 group-hover:text-amber-600 transition-colors truncate">{license.companyName || license.name}</p>
                          {license.workStatus === "Completed" ? (
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-300 shrink-0">
                              ✓ RENEWED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-amber-100 text-amber-700 border border-amber-300 shrink-0">
                              PENDING RENEWAL
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{license.email || "No Email"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                        {license.tradeLicenseNumber || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap">
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
                      <span className="text-xs font-bold text-slate-700 truncate block">
                        {license.ownerId?.name || "Unassigned"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRenewLicense(license); }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase rounded-lg shadow-sm transition-all flex items-center gap-1 shrink-0"
                          title="Renew License (+1 Year)"
                        >
                          <RotateCw size={11} /> Renew
                        </button>

                        <button
                          onClick={(e) => openEditModal(license, e)}
                          className="p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg transition-colors shrink-0"
                          title="Edit Trade License & Expiry"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(license, e)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                          title="Delete License Record"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setInspectingLicense(license); }}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-lg transition-colors shrink-0"
                          title="View Trade License Details"
                        >
                          <Eye size={15} />
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
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 shadow-sm">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                    {editingLicense ? "Edit Trade License Schedule" : "Add New Trade License Record"}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">UAE Economic Department & Freezone Trade License Renewal Tracker</p>
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
                    tradeLicenseNumber: item.tradeLicenseNumber || prev.tradeLicenseNumber
                  }))}
                />
                <SearchableCustomerSelect
                  label="Client Contact Name"
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
                    tradeLicenseNumber: item.tradeLicenseNumber || prev.tradeLicenseNumber
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

      {/* 360 Trade License Inspection & Renewal Modal */}
      {inspectingLicense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{inspectingLicense.companyName || inspectingLicense.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">UAE Commercial Trade License Profile</p>
                </div>
              </div>
              <button onClick={() => setInspectingLicense(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-700">
              {/* Contact info */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Company & Contact</span>
                <div className="flex items-center gap-2 text-slate-900 font-extrabold"><Building2 size={14} className="text-amber-500 shrink-0" /><span>{inspectingLicense.companyName || inspectingLicense.name}</span></div>
                {inspectingLicense.email && <div className="flex items-center gap-2 text-slate-700"><Mail size={14} className="text-indigo-500 shrink-0" /><span>{inspectingLicense.email}</span></div>}
              </div>

              {/* License identifiers */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Trade License Schedule</span>
                <div className="flex justify-between items-center"><span className="text-slate-400">License Number:</span><span className="font-mono text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded border">{inspectingLicense.tradeLicenseNumber || "N/A"}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400">Issuing Authority:</span><span className="font-extrabold text-slate-800">{inspectingLicense.issuingAuthority || "DET Dubai"}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400">Expiry Date:</span><span className="font-mono font-black text-rose-600">{inspectingLicense.tradeLicenseExpiryDate ? new Date(inspectingLicense.tradeLicenseExpiryDate).toLocaleDateString() : "Not Specified"}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-400">Assigned Consultant:</span><span className="font-bold text-slate-800">{inspectingLicense.ownerId?.name || "Unassigned"}</span></div>
              </div>

              {/* Status Badge */}
              <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-amber-700 uppercase tracking-wider block">Health & Renewal Status</span>
                  <span className="text-xs font-black text-slate-900 mt-0.5 block">{inspectingLicense.workStatus || "Pending Renewal"}</span>
                </div>

                <button
                  onClick={() => handleRenewLicense(inspectingLicense, 1)}
                  disabled={saving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  <RotateCw size={13} className={saving ? "animate-spin" : ""} />
                  Renew +1 Year
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                onClick={(e) => {
                  const lic = inspectingLicense;
                  setInspectingLicense(null);
                  openEditModal(lic, e);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Edit3 size={13} /> Edit Details
              </button>
              <button onClick={() => setInspectingLicense(null)} className="px-5 py-2.5 bg-slate-900 text-white font-black text-xs uppercase rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
