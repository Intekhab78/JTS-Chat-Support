import React, { useState, useEffect } from "react";
import {
  Plus, Search, Edit2, Trash2, Save, X, User, Mail, Phone,
  Building2, Calendar, ShieldCheck, MapPin, Briefcase,
  DollarSign, Hash, Layers, Info, CheckCircle2, Clock, Eye
} from "lucide-react";
import { api } from "../api/client";
import Customer360View from "./CrmSystem/Customer360View.jsx";

const getDisplayTerritory = (item) => {
  if (item.territory && item.territory.trim() !== "") return item.territory;
  if (item.sourceDetails?.location && item.sourceDetails.location.trim() !== "") return item.sourceDetails.location;
  
  const siteName = item.websiteId?.websiteName || "";
  const nameUpper = siteName.toUpperCase();
  if (nameUpper.includes("UAE") || nameUpper.includes("MIDDLE EAST") || nameUpper.includes("DUBAI") || nameUpper.includes("ARAB")) {
    return "UAE";
  }
  if (nameUpper.includes("JTS") || nameUpper.includes("JBIN") || nameUpper.includes("INDIA")) {
    return "India";
  }
  return "Unassigned";
};

export default function CustomerManager({ websiteId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    industry: "",
    territory: "",
    requirement: "",
    leadValue: 0,
    budget: 0,
    pipelineStage: "new",
    isActive: true
  });

  const [portalAccess, setPortalAccess] = useState({ active: false, email: "" });
  const [portalLoading, setPortalLoading] = useState(false);
  const [selectedCustomerFor360, setSelectedCustomerFor360] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const data = await api(`/api/crm?websiteId=${websiteId}&limit=500`);
      setItems(Array.isArray(data) ? data : (data.customers || []));
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load customer data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [websiteId]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      setSuccess("");
      const payload = { ...form, websiteId };

      if (editingId) {
        await api(`/api/crm/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSuccess("Customer profile updated with high precision.");
      } else {
        await api(`/api/crm`, { method: "POST", body: JSON.stringify(payload) });
        setSuccess("New customer registered successfully.");
      }

      setShowDrawer(false);
      setEditingId("");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to synchronize profile.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to permanently remove this customer record?")) return;
    try {
      await api(`/api/crm/${id}`, { method: "DELETE" });
      setSuccess("Record purged from master registry.");
      await loadData();
    } catch (err) {
      setError(err.message || "Authorization failure or server error.");
    }
  }

  function formatDate(value) {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  const fetchPortalAccessStatus = async (id) => {
    setPortalLoading(true);
    try {
      const res = await api(`/api/crm/${id}/portal-access`);
      setPortalAccess(res || { active: false, email: "" });
    } catch (err) {
      console.error(err);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleGrantPortalAccess = async () => {
    if (!window.confirm("Are you sure you want to grant Client Portal access for this customer?")) return;
    try {
      const res = await api(`/api/crm/${editingId}/portal-access`, { method: "POST" });
      alert(res.message || "Portal access granted.");
      fetchPortalAccessStatus(editingId);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRevokePortalAccess = async () => {
    if (!window.confirm("Are you sure you want to revoke Client Portal access? This will delete their login credentials.")) return;
    try {
      const res = await api(`/api/crm/${editingId}/portal-access`, { method: "DELETE" });
      alert(res.message || "Portal access revoked.");
      fetchPortalAccessStatus(editingId);
    } catch (err) {
      alert(err.message);
    }
  };

  const openDrawer = async (item = null) => {
    if (item) {
      setEditingId(item._id);
      setForm({
        name: item.name || "",
        email: item.email || "",
        phone: item.phone || "",
        companyName: item.companyName || "",
        industry: item.industry || "",
        territory: item.territory || "",
        requirement: item.requirement || "",
        leadValue: item.leadValue || 0,
        budget: item.budget || 0,
        pipelineStage: item.pipelineStage || "new",
        isActive: item.isActive !== false
      });
      // Fetch portal status
      setPortalLoading(true);
      try {
        const res = await api(`/api/crm/${item._id}/portal-access`);
        setPortalAccess(res || { active: false, email: "" });
      } catch (err) {
        console.error(err);
      } finally {
        setPortalLoading(false);
      }
    } else {
      setEditingId("");
      setPortalAccess({ active: false, email: "" });
      setForm({
        name: "",
        email: "",
        phone: "",
        companyName: "",
        industry: "",
        territory: "",
        requirement: "",
        leadValue: 0,
        budget: 0,
        pipelineStage: "new",
        isActive: true
      });
    }
    setShowDrawer(true);
  };

  const [hideAnonymous, setHideAnonymous] = useState(false);

  const filteredItems = items.filter(item => {
    if (hideAnonymous) {
      const isAnon = item.name?.toLowerCase().includes("anonymous") || item.email?.toLowerCase().includes("anon-visitor");
      if (isAnon) return false;
    }
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.email?.toLowerCase().includes(query) ||
      item.companyName?.toLowerCase().includes(query) ||
      item.crn?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 relative">
      {/* Notifications */}
      <div className="fixed top-24 right-10 z-[60] space-y-3">
        {error && (
          <div className="p-4 bg-white border-l-4 border-rose-500 shadow-2xl rounded-r-2xl animate-in slide-in-from-right-full">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1 flex items-center gap-2">
              <X size={14} /> Critical Error
            </p>
            <p className="text-xs font-bold text-slate-500">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-white border-l-4 border-emerald-500 shadow-2xl rounded-r-2xl animate-in slide-in-from-right-full">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-2">
              <CheckCircle2 size={14} /> Your changes have been saved successfully.
            </p>
            <p className="text-xs font-bold text-slate-500">{success}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Elite Command Center</p>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Customer Master Registry</h3>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md mx-6">
          <div className="relative w-full group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Quick Search identity..."
              className="w-full bg-white border border-slate-200 rounded-[22px] pl-14 pr-5 py-3 text-[11px] font-bold outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => setHideAnonymous(prev => !prev)}
            className={`px-4 py-3 rounded-[22px] border text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              hideAnonymous 
                ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Toggle Anonymous Visitors"
          >
            {hideAnonymous ? "Verified Only" : "Show All"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => openDrawer()}
          className="rounded-[22px] bg-slate-950 px-6 py-3 text-white font-black text-[9px] uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 transition-all hover:bg-black group"
        >
          <Plus size={14} />
          Register Account
        </button>
      </div>

      {/* Main Table View */}
      <div className="premium-card overflow-hidden rounded-[42px] border border-slate-200/60 bg-white shadow-xl shadow-slate-200/40">
        <div className="min-h-0 overflow-x-auto">
          <table className="w-full table-fixed min-w-[1100px]">
            <thead className="bg-slate-50/80 backdrop-blur-sm">
              <tr className="text-left border-b border-slate-100">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 w-[25%]">Business Identity</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 w-[20%]">Contact Gateway</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Territory</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Ledger Status</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Registry Date</th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 w-32">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Synchronizing Global Databases...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto">
                        <Search size={32} className="text-slate-200" />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">No results match your search parameters</p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item._id} className="hover:bg-indigo-50/30 transition-all duration-300 group">
                  <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedCustomerFor360(item._id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-slate-200 group-hover:scale-105 transition-transform duration-500 relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        {item.name?.charAt(0).toUpperCase() || "C"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate tracking-tight hover:text-indigo-600 transition-colors">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Building2 size={10} className="text-slate-300" />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{item.companyName || "Private Account"}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100 group-hover:bg-white transition-colors w-fit max-w-full">
                        <Mail size={12} className="text-indigo-400 shrink-0" />
                        <span className="text-[10px] font-black truncate tracking-tight">{item.email}</span>
                      </div>
                      {item.phone && (
                        <div className="flex items-center gap-2 text-slate-400 px-2.5">
                          <Phone size={10} />
                          <span className="text-[9px] font-bold tracking-widest">{item.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-300" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        {getDisplayTerritory(item)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className={`inline-flex rounded-lg px-3 py-1 text-[8px] font-black uppercase tracking-[0.15em] border self-start ${item.isActive !== false ? "border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                        {item.isActive !== false ? "Active" : "Inactive"}
                      </span>
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest pl-1">
                        {item.recordType || "Lead"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={11} />
                      <span className="text-[10px] font-black tracking-tight">{formatDate(item.createdAt)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedCustomerFor360(item._id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        title="View 360° Profile & Vault"
                        aria-label="View 360 Degree Customer Profile"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => openDrawer(item)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                        title="Edit"
                        aria-label="Edit Customer Record"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all"
                        title="Purge"
                        aria-label="Delete Customer Record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Professional Side Drawer for Detailed Editing */}
      {showDrawer && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] animate-in fade-in duration-500"
            onClick={() => setShowDrawer(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-slate-50 shadow-[0_0_80px_rgba(0,0,0,0.15)] z-[101] animate-in slide-in-from-right-full duration-500 flex flex-col border-l border-slate-200">
            {/* Drawer Header */}
            <div className="bg-white px-8 py-8 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-xl shadow-indigo-100">
                  {form.name?.charAt(0).toUpperCase() || <User size={24} />}
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">Detailed Intelligence</p>
                  <h4 className="text-xl font-black text-slate-900 tracking-tight">
                    {editingId ? "Modify Profile" : "New Registration"}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{editingId ? `ID: ${editingId.substring(18)}` : "DRAFTING RECORD"}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body - Scrollable Form */}
            <form id="customerDetailForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar">

              {/* Section: Core Identity */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-500 shadow-sm"><User size={12} /></div>
                  <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Core Identity</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Legal Name</label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                      placeholder="Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Company</label>
                    <input
                      value={form.companyName}
                      onChange={e => setForm({ ...form, companyName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                      placeholder="Organization"
                    />
                  </div>
                </div>
              </section>

              {/* Section: Communications */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-500 shadow-sm"><Mail size={12} /></div>
                  <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Communications</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Email</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Mobile</label>
                    <input
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                      placeholder="+XX XXXXX"
                    />
                  </div>
                </div>
              </section>

              {/* Section: Strategic Metadata */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-500 shadow-sm"><Briefcase size={12} /></div>
                  <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Strategic Profile</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Industry</label>
                    <input
                      value={form.industry}
                      onChange={e => setForm({ ...form, industry: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-indigo-500 transition-all"
                      placeholder="Vertical"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Territory</label>
                    <input
                      value={form.territory}
                      onChange={e => setForm({ ...form, territory: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold outline-none focus:border-indigo-500 transition-all"
                      placeholder="Region"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Lead Value</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><DollarSign size={12} /></div>
                      <input
                        type="number"
                        value={form.leadValue}
                        onChange={e => setForm({ ...form, leadValue: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[11px] font-black outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Budget</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><DollarSign size={12} /></div>
                      <input
                        type="number"
                        value={form.budget}
                        onChange={e => setForm({ ...form, budget: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[11px] font-black outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Requirements</label>
                    <textarea
                      value={form.requirement}
                      onChange={e => setForm({ ...form, requirement: e.target.value })}
                      rows={3}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[11px] font-bold outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
                      placeholder="Scope and needs..."
                    />
                  </div>
                </div>
              </section>

              {/* Status & Governance */}
              <section className="bg-white rounded-2xl p-5 border border-slate-100 flex items-center justify-between shadow-sm">
                <div className="space-y-0.5">
                  <h6 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Active Governance</h6>
                  <p className="text-[9px] font-bold text-slate-400 tracking-widest">Life-cycle state</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </section>

              {/* Section: Client Portal Access */}
              {editingId && (
                <section className="bg-white rounded-2xl p-5 border border-slate-100 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b pb-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm"><ShieldCheck size={12} /></div>
                    <h6 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Client Portal Access</h6>
                  </div>
                  {portalLoading ? (
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Synchronizing Portal Credentials...</p>
                  ) : (
                    <div className="space-y-4 text-xs font-bold text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-slate-400">Portal Link Status</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${portalAccess.active ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                          {portalAccess.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {portalAccess.active ? (
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-500">Authorized User: <strong className="text-slate-800 block mt-0.5 truncate">{portalAccess.email}</strong></p>
                          <button
                            type="button"
                            onClick={handleRevokePortalAccess}
                            className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black uppercase rounded-xl transition-all"
                          >
                            Revoke Portal Access
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGrantPortalAccess}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase rounded-xl transition-all shadow-md"
                        >
                          Grant Portal Access
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}

              <div className="h-4" />
            </form>

            {/* Drawer Footer */}
            <div className="bg-white px-8 py-6 border-t border-slate-100 flex items-center justify-end gap-4 shrink-0">
              <button
                onClick={() => setShowDrawer(false)}
                className="px-6 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                form="customerDetailForm"
                type="submit"
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <Save size={14} />
                {editingId ? "Save Updates" : "Register"}
              </button>
            </div>
          </div>
        </>
      )}

      {selectedCustomerFor360 && (
        <Customer360View
          customerId={selectedCustomerFor360}
          websiteId={websiteId}
          onClose={() => setSelectedCustomerFor360(null)}
        />
      )}
    </div>
  );
}
