import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
  Plus, Search, Edit2, Trash2, Save, X, User, Mail, Phone,
  Building2, Calendar, ShieldCheck, MapPin, Briefcase, RefreshCw,
  DollarSign, Hash, Layers, Info, CheckCircle2, Clock, Eye, AlertCircle, FileSpreadsheet,
  ChevronLeft, ChevronRight
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmPortalAction, setConfirmPortalAction] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      const query = websiteId ? `websiteId=${encodeURIComponent(websiteId)}&limit=500` : "limit=500";
      const data = await api(`/api/crm?${query}`);
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

  useEffect(() => {
    const targetCustomerId = searchParams.get("customerId");
    if (!targetCustomerId) return;
    setSelectedCustomerFor360(targetCustomerId);
    const next = new URLSearchParams(searchParams);
    next.delete("customerId");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!showDrawer) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setShowDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", onKey);
    };
  }, [showDrawer]);

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
    try {
      setError("");
      await api(`/api/crm/${id}`, { method: "DELETE" });
      setConfirmDeleteId(null);
      setSuccess("Record purged from master registry.");
      await loadData();
    } catch (err) {
      setError(err.message || "Authorization failure or server error.");
    }
  }

  function formatDate(value) {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  const fetchPortalAccessStatus = async (id) => {
    setPortalLoading(true);
    try {
      const res = await api(`/api/crm/${id}/portal-access`);
      setPortalAccess(res || { active: false, email: "" });
    } catch (err) {
      setError(err.message || "Failed to fetch portal access status.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleGrantPortalAccess = async () => {
    try {
      setError("");
      const res = await api(`/api/crm/${editingId}/portal-access`, { method: "POST" });
      setConfirmPortalAction(null);
      setSuccess(res.message || "Portal access granted.");
      fetchPortalAccessStatus(editingId);
    } catch (err) {
      setError(err.message || "Failed to grant portal access.");
    }
  };

  const handleRevokePortalAccess = async () => {
    try {
      setError("");
      const res = await api(`/api/crm/${editingId}/portal-access`, { method: "DELETE" });
      setConfirmPortalAction(null);
      setSuccess(res.message || "Portal access revoked.");
      fetchPortalAccessStatus(editingId);
    } catch (err) {
      setError(err.message || "Failed to revoke portal access.");
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
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const territories = useMemo(() => {
    const set = new Set(items.map(getDisplayTerritory).filter(Boolean));
    return [...set].sort();
  }, [items]);

  const dashboardStats = useMemo(() => {
    const total = items.length;
    const customers = items.filter(i => String(i.recordType || "").toLowerCase() === "customer").length;
    const leads = total - customers;
    const active = items.filter(i => i.isActive !== false).length;
    const pipelineValue = items.reduce((sum, i) => sum + (Number(i.leadValue) || Number(i.budget) || 0), 0);
    return { total, customers, leads, active, inactive: total - active, pipelineValue };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (hideAnonymous) {
        const isAnon = item.name?.toLowerCase().includes("anonymous") || item.email?.toLowerCase().includes("anon-visitor");
        if (isAnon) return false;
      }
      if (typeFilter !== "all") {
        const recType = String(item.recordType || "lead").toLowerCase();
        if (recType !== typeFilter) return false;
      }
      if (statusFilter !== "all") {
        const isAct = item.isActive !== false;
        if (statusFilter === "active" && !isAct) return false;
        if (statusFilter === "inactive" && isAct) return false;
      }
      if (territoryFilter !== "all" && getDisplayTerritory(item) !== territoryFilter) {
        return false;
      }
      if (!search) return true;
      const query = search.toLowerCase();
      return (
        item.name?.toLowerCase().includes(query) ||
        item.email?.toLowerCase().includes(query) ||
        item.phone?.toLowerCase().includes(query) ||
        item.companyName?.toLowerCase().includes(query) ||
        item.crn?.toLowerCase().includes(query)
      );
    });
  }, [items, hideAnonymous, typeFilter, statusFilter, territoryFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [search, hideAnonymous, typeFilter, statusFilter, territoryFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safePage, pageSize]);

  return (
    <div className="space-y-4 relative">
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

      {/* Clean White Enterprise Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white px-4 py-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight text-slate-900 uppercase leading-tight">
              Customer Master Registry
            </h2>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Accounts, Multi-Territory Identities, CRM Stages & Portal Authorization
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
            title="Refresh Accounts"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            type="button"
            onClick={() => {
              const columns = [
                { key: "name", label: "Customer Name" },
                { key: "email", label: "Email Gateway" },
                { key: "phone", label: "Phone" },
                { key: "companyName", label: "Company Name" },
                { key: "territory", label: "Territory", accessor: i => getDisplayTerritory(i) },
                { key: "recordType", label: "Type" },
                { key: "pipelineStage", label: "CRM Stage" },
                { key: "budget", label: "Budget" }
              ];
              exportToCsv(filteredItems, columns, "Customer_Master_Registry");
            }}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet size={13} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => openDrawer()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus size={13} />
            <span>Register Account</span>
          </button>
        </div>
      </div>

      {/* KPI Dashboard Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Accounts</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-black text-slate-900">{dashboardStats.total}</h3>
            <span className="text-[10px] font-bold text-indigo-600">{filteredItems.length} shown</span>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Customers / Leads</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-black text-indigo-600">{dashboardStats.customers}</h3>
            <span className="text-[10px] font-bold text-slate-500">{dashboardStats.leads} leads</span>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Active Status</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-black text-emerald-600">{dashboardStats.active}</h3>
            <span className="text-[10px] font-bold text-slate-400">{dashboardStats.inactive} inactive</span>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Pipeline / Budget Value</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-black text-slate-900">${dashboardStats.pipelineValue.toLocaleString()}</h3>
            <span className="text-[10px] font-bold text-slate-400">{territories.length} territories</span>
          </div>
        </div>
      </div>

      {/* ── Compact Search & Multi-Filter Bar ── */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search business identity, email, phone, or CRN..."
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500"
        >
          <option value="all">All Types</option>
          <option value="customer">Customers</option>
          <option value="lead">Leads</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={territoryFilter}
          onChange={e => setTerritoryFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500"
        >
          <option value="all">All Territories</option>
          {territories.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setHideAnonymous(prev => !prev)}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border ${
            hideAnonymous 
              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
              : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
          }`}
        >
          {hideAnonymous ? "Verified Only" : "Show All"}
        </button>

        {(search || typeFilter !== "all" || statusFilter !== "all" || territoryFilter !== "all" || hideAnonymous) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTypeFilter("all");
              setStatusFilter("all");
              setTerritoryFilter("all");
              setHideAnonymous(false);
            }}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Main Table View ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="min-h-0 overflow-x-auto">
          <table className="w-full table-fixed min-w-[920px]">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr className="text-left">
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[26%]">Business Identity</th>
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[24%]">Contact Gateway</th>
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[14%]">Territory</th>
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[14%]">Ledger Status</th>
                <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 w-[12%]">Registry Date</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-wider text-slate-400 w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 font-bold">
                    No matching customer accounts found.
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black text-[11px] shrink-0">
                          {item.name?.charAt(0).toUpperCase() || <Building2 size={13} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate text-xs">{item.name || "Anonymous Visitor"}</p>
                          <p className="text-[10px] text-slate-400 truncate">{item.companyName || "Individual Client"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 rounded-lg px-2 py-1 border border-slate-200/60 w-fit max-w-full">
                          <Mail size={11} className="text-indigo-500 shrink-0" />
                          <span className="text-[10px] font-bold truncate">{item.email}</span>
                        </div>
                        {item.phone && (
                          <div className="flex items-center gap-1.5 text-slate-400 px-1">
                            <Phone size={10} />
                            <span className="text-[10px] font-semibold">{item.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                          {getDisplayTerritory(item)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-black uppercase border ${item.isActive !== false ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                          {item.isActive !== false ? "Active" : "Inactive"}
                        </span>
                        <span className="text-[9px] font-black text-indigo-600 uppercase">
                          {item.recordType || "Lead"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock size={11} />
                      <span className="text-[10px] font-black tracking-tight">{formatDate(item.createdAt)}</span>
                    </div>
                  </td>
                    <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
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
                      {confirmDeleteId === item._id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[9px] font-black uppercase"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[9px] font-black uppercase"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(item._id)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-all"
                          title="Purge"
                          aria-label="Delete Customer Record"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Showing {filteredItems.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredItems.length)} of {filteredItems.length}
            </span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="px-2 text-slate-700">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 transition-colors"
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Centered Compact Modal for Detailed Editing (Portal, No Scroll) */}
      {showDrawer && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowDrawer(false)}
          />
          <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                  {form.name?.charAt(0).toUpperCase() || <User size={15} />}
                </div>
                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-900">
                    {editingId ? "Modify Profile" : "New Registration"}
                  </h4>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-bold uppercase">
                    {editingId ? `ID: ${editingId.substring(18)}` : "DRAFTING RECORD"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body - Compact 3-Column Grid (No Scroll) */}
            <form id="customerDetailForm" onSubmit={handleSubmit} className="px-5 py-3.5 space-y-3">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-semibold text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Legal Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Company</label>
                  <input
                    value={form.companyName}
                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="Organization"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="email@example.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Mobile</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="+XX XXXXX"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Industry</label>
                  <input
                    value={form.industry}
                    onChange={e => setForm({ ...form, industry: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="Vertical"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Territory</label>
                  <input
                    value={form.territory}
                    onChange={e => setForm({ ...form, territory: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="Region"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Lead Value</label>
                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={12} /></div>
                    <input
                      type="number"
                      value={form.leadValue}
                      onChange={e => setForm({ ...form, leadValue: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Budget</label>
                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={12} /></div>
                    <input
                      type="number"
                      value={form.budget}
                      onChange={e => setForm({ ...form, budget: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Active Status</label>
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <span className="text-xs font-medium text-slate-700">{form.isActive ? "Active" : "Inactive"}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={e => setForm({ ...form, isActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Requirements</label>
                  <input
                    value={form.requirement}
                    onChange={e => setForm({ ...form, requirement: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    placeholder="Scope and needs..."
                  />
                </div>
              </div>

              {/* Compact Client Portal Access Bar */}
              {editingId && (
                <div className="bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0"><ShieldCheck size={12} /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-800">Client Portal Access</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${portalAccess.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                          {portalLoading ? "Syncing..." : portalAccess.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {portalAccess.active && portalAccess.email && (
                        <p className="text-[10px] text-slate-500 truncate">{portalAccess.email}</p>
                      )}
                    </div>
                  </div>

                  {!portalLoading && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {portalAccess.active ? (
                        confirmPortalAction === "revoke" ? (
                          <>
                            <button type="button" onClick={handleRevokePortalAccess} className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold uppercase rounded-md cursor-pointer">Confirm Revoke</button>
                            <button type="button" onClick={() => setConfirmPortalAction(null)} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-md cursor-pointer">Cancel</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setConfirmPortalAction("revoke")} className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold uppercase rounded-md cursor-pointer">Revoke Access</button>
                        )
                      ) : confirmPortalAction === "grant" ? (
                        <>
                          <button type="button" onClick={handleGrantPortalAccess} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase rounded-md cursor-pointer">Confirm Grant</button>
                          <button type="button" onClick={() => setConfirmPortalAction(null)} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-md cursor-pointer">Cancel</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirmPortalAction("grant")} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase rounded-md cursor-pointer">Grant Portal Access</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="bg-slate-50/80 px-5 py-2.5 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="px-3.5 py-1.5 text-[11px] font-bold uppercase text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                form="customerDetailForm"
                type="submit"
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-bold text-[11px] uppercase shadow-xs hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={13} />
                {editingId ? "Save Updates" : "Register"}
              </button>
            </div>
          </div>
        </div>,
        document.body
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
