import React, { useState, useEffect } from "react";
import {
  Plus, Search, Edit2, Trash2, Save, X, User, Mail, Phone,
  Building2, Calendar, ShieldCheck, MapPin, Briefcase,
  DollarSign, Hash, Layers, Info, CheckCircle2, Clock, Eye, AlertCircle, FileSpreadsheet
} from "lucide-react";
import { api } from "../api/client";
import Customer360View from "./CrmSystem/Customer360View.jsx";
import { useDataSync } from "../hooks/useDataSync.js";
import { exportToCsv } from "../utils/exportUtils.js";

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
      const rawList = Array.isArray(data) ? data : (data.customers || []);

      const seenEmails = new Set();
      const uniqueList = rawList.filter(item => {
        if (!item.email || item.email.endsWith('@anonymous.local')) return true;
        const lowerEmail = item.email.toLowerCase().trim();
        if (seenEmails.has(lowerEmail)) return false;
        seenEmails.add(lowerEmail);
        return true;
      });

      setItems(uniqueList);
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

  useDataSync({
    entities: ["customer", "crm"],
    websiteId,
    onSync: () => loadData()
  });

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
    setError("");
    setSuccess("");
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

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-4 py-3.5 sm:px-5 sm:py-4 text-white border border-indigo-500/20 shadow-md">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-60 h-60 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-wider rounded-md border border-indigo-500/30 inline-flex items-center gap-1">
                <ShieldCheck size={11} className="text-indigo-400" /> Customer & Account Directory
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              Customer Master Registry
            </h2>
            <p className="text-[11px] text-slate-300 font-medium leading-normal">
              Manage accounts, multi-territory business identities, CRM stages & portal authorization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-0.5">Records</span>
                <span className="text-xs font-black text-white">{filteredItems.length}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const columns = [
                  { key: "name", label: "Customer Name" },
                  { key: "email", label: "Email Gateway" },
                  { key: "phone", label: "Phone" },
                  { key: "companyName", label: "Company Name" },
                  { key: "territory", label: "Territory", accessor: i => getDisplayTerritory(i) },
                  { key: "pipelineStage", label: "CRM Stage" },
                  { key: "budget", label: "Budget (AED)" }
                ];
                exportToCsv(filteredItems, columns, "Customer_Master_Registry");
              }}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
            >
              <FileSpreadsheet size={13} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => openDrawer()}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] flex items-center gap-1.5 shrink-0"
            >
              <Plus size={13} />
              <span>Register Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Compact Search & Filter Bar ── */}
      <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search business identity, email, or phone..."
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        <button
          type="button"
          onClick={() => setHideAnonymous(prev => !prev)}
          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            hideAnonymous 
              ? "bg-indigo-600 text-white shadow-xs" 
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          {hideAnonymous ? "Verified Only" : "Show All Accounts"}
        </button>
      </div>

      {/* ── Main Table View (Zero Gaps) ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="min-h-0 overflow-x-auto">
          <table className="w-full table-fixed min-w-[1000px]">
            <thead className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-white/5">
              <tr className="text-left">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[26%]">Business Identity</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[22%]">Contact Gateway</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Territory</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Ledger Status</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Registry Date</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400 w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-bold">
                    No matching customer accounts found.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs shrink-0">
                          {item.name?.charAt(0).toUpperCase() || <Building2 size={14} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white truncate text-xs">{item.name || "Anonymous Visitor"}</p>
                          <p className="text-[10px] text-slate-400 truncate">{item.companyName || "Individual Client"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
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
              ))
            )}
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

              {error && (
                <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-700 font-bold text-xs flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

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
