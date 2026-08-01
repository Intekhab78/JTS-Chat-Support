import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, Plus, Grid, List, Mail, Phone, Building2, Trash2, Edit3, X, Check, Globe, ShieldCheck, ChevronRight, Eye, DollarSign, MapPin, Users, Download, Printer } from "lucide-react";
import { api } from "../../api/client.js";
import ConfirmModal from "../ConfirmModal.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

export default function CrmCompaniesView({ websiteId }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  // Detail View State
  const [viewingCompany, setViewingCompany] = useState(null);

  // Confirmation modal states
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
    loading: false
  });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form, setForm] = useState({
    companyName: "", industry: "", website: "", gstVat: "",
    companyEmail: "", phone: "", address: "", employees: 0,
    annualRevenue: 0
  });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const qWebsite = (websiteId && websiteId !== "undefined" && websiteId !== "null") ? websiteId : "";
      const res = await api(`/api/crm/companies?websiteId=${qWebsite}&limit=300`);
      const list = Array.isArray(res) ? res : (res?.companies || res?.data || []);
      setCompanies(list);
    } catch (err) {
      console.error(err);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [websiteId]);

  // KPI Analytics Metrics for Companies
  const metrics = useMemo(() => {
    const totalCount = companies.length;
    const withVatCount = companies.filter(c => c.gstVat || c.trn).length;
    const withWebsiteCount = companies.filter(c => c.website).length;
    const withEmailCount = companies.filter(c => c.companyEmail || c.email).length;

    return { totalCount, withVatCount, withWebsiteCount, withEmailCount };
  }, [companies]);

  // Filtered & Paginated Companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const compName = (c.companyName || "").toLowerCase();
      const indStr = (c.industry || "").toLowerCase();
      const vatStr = (c.gstVat || c.trn || "").toLowerCase();
      const webStr = (c.website || "").toLowerCase();

      const matchesSearch = search.trim() === "" ||
        compName.includes(search.toLowerCase()) ||
        indStr.includes(search.toLowerCase()) ||
        vatStr.includes(search.toLowerCase()) ||
        webStr.includes(search.toLowerCase());

      const matchesIndustry = industryFilter === "all" ||
        indStr.includes(industryFilter.toLowerCase());

      return matchesSearch && matchesIndustry;
    });
  }, [companies, search, industryFilter]);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage) || 1;

  const paginatedCompanies = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredCompanies.slice(start, start + itemsPerPage);
  }, [filteredCompanies, page, itemsPerPage]);

  useEffect(() => {
    if (showModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showModal]);

  const handleOpenCreate = () => {
    setEditingCompany(null);
    setForm({
      companyName: "", industry: "", website: "", gstVat: "",
      companyEmail: "", phone: "", address: "", employees: 0,
      annualRevenue: 0
    });
    setShowModal(true);
  };

  const handleOpenEdit = (company, e) => {
    if (e) e.stopPropagation();
    setEditingCompany(company);
    setForm({
      companyName: company.companyName || "",
      industry: company.industry || "",
      website: company.website || "",
      gstVat: company.gstVat || company.trn || "",
      companyEmail: company.companyEmail || company.email || "",
      phone: company.phone || "",
      address: company.address || "",
      employees: company.employees || 0,
      annualRevenue: company.annualRevenue || 0
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, websiteId };

    try {
      if (editingCompany) {
        await api(`/api/crm/companies/${editingCompany._id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await api("/api/crm/companies", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setShowModal(false);
      fetchCompanies();
    } catch (err) {
      alert(err.message);
    }
  };

  const triggerDeleteConfirm = (id, e) => {
    if (e) e.stopPropagation();
    setConfirmModalConfig({
      open: true,
      title: "Delete Company",
      message: "Are you sure you want to delete this company? This action cannot be undone.",
      onConfirm: () => executeDeleteCompany(id),
      loading: false
    });
  };

  const executeDeleteCompany = async (id) => {
    setConfirmModalConfig(prev => ({ ...prev, loading: true }));
    try {
      await api(`/api/crm/companies/${id}`, { method: "DELETE" });
      setSelectedIds(prev => prev.filter(x => x !== id));
      if (viewingCompany?._id === id) setViewingCompany(null);
      fetchCompanies();
      setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false });
    } catch (err) {
      alert(err.message);
      setConfirmModalConfig(prev => ({ ...prev, loading: false }));
    }
  };

  const triggerBulkDeleteConfirm = () => {
    setConfirmModalConfig({
      open: true,
      title: "Bulk Delete Companies",
      message: `Are you sure you want to delete ${selectedIds.length} selected companies?`,
      onConfirm: executeBulkDeleteCompany,
      loading: false
    });
  };

  const executeBulkDeleteCompany = async () => {
    setConfirmModalConfig(prev => ({ ...prev, loading: true }));
    try {
      for (const id of selectedIds) {
        await api(`/api/crm/companies/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      fetchCompanies();
      setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false });
    } catch (err) {
      alert(err.message);
      setConfirmModalConfig(prev => ({ ...prev, loading: false }));
    }
  };

  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleExportCompaniesCSV = () => {
    const data = filteredCompanies.map(c => ({
      "Company Name": c.companyName || "-",
      "Industry": c.industry || "-",
      "Website": c.website || "-",
      "GST / TRN": c.gstVat || c.trn || "Not Registered",
      "Corporate Email": c.companyEmail || c.email || "-",
      "Phone": c.phone || "-",
      "Office Address": c.address || "-"
    }));
    exportToCSV(data, `Companies_Directory_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportCompaniesPDF = () => {
    const data = filteredCompanies.map(c => ({
      "Company Name": c.companyName || "-",
      "Industry": c.industry || "-",
      "TRN / Tax ID": c.gstVat || c.trn || "-",
      "Website": c.website || "-",
      "Email": c.companyEmail || c.email || "-"
    }));
    exportToPDF(data, `Companies_Directory_${new Date().toISOString().slice(0, 10)}`, "CORPORATE COMPANIES DIRECTORY REPORT");
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Corporate Companies Directory</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Manage enterprise accounts, tax profiles, and corporate affiliations</p>
        </div>
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wide">Accounts Hub</span>
      </div>

      {/* KPI Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Total Companies</span>
            <span className="text-lg font-black text-slate-900">{metrics.totalCount} Accounts</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">TRN/VAT Registered</span>
            <span className="text-lg font-black text-emerald-700">{metrics.withVatCount} Verified</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Globe size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Active Web Sites</span>
            <span className="text-lg font-black text-blue-700">{metrics.withWebsiteCount} Domains</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Mail size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Corporate Emails</span>
            <span className="text-lg font-black text-amber-700">{metrics.withEmailCount} Accounts</span>
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-[28px] shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search companies by name, industry, TRN, or website…"
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
        </div>

        {/* Filters and View Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExportCompaniesCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Companies Directory to Excel CSV"
          >
            <Download size={13} /> Export CSV
          </button>
          <button 
            onClick={handleExportCompaniesPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Companies Directory to PDF"
          >
            <Printer size={13} /> Export PDF
          </button>

          <select
            value={industryFilter}
            onChange={(e) => { setIndustryFilter(e.target.value); setPage(1); }}
            className="w-full sm:w-44 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Industries</option>
            <option value="technology">Technology & Software</option>
            <option value="finance">Financial Services</option>
            <option value="real estate">Real Estate</option>
            <option value="retail">Retail & E-commerce</option>
            <option value="healthcare">Healthcare</option>
          </select>

          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg ${viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}><List size={16} /></button>
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}><Grid size={16} /></button>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => {
                  const selectedCompanies = companies.filter(c => selectedIds.includes(c._id));
                  const data = selectedCompanies.map(c => ({
                    "Company Name": c.companyName || "-",
                    "Industry": c.industry || "-",
                    "Website": c.website || "-",
                    "GST / TRN": c.gstVat || c.trn || "Not Registered",
                    "Corporate Email": c.companyEmail || c.email || "-",
                    "Phone": c.phone || "-"
                  }));
                  exportToCSV(data, `Selected_Companies_${selectedIds.length}_Items`);
                }}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                title="Export Selected Companies CSV"
              >
                <Download size={13} /> Export Selected ({selectedIds.length})
              </button>
              <button onClick={triggerBulkDeleteConfirm} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all">
                <Trash2 size={13} /> Delete ({selectedIds.length})
              </button>
            </div>
          )}

          <button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-indigo-100 transition-all">
            <Plus size={13} /> Add Company
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : paginatedCompanies.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold text-xs uppercase tracking-widest">
          No companies found matching filters
        </div>
      ) : viewMode === "list" ? (
        /* List Mode */
        <div className="bg-white border border-slate-200/80 rounded-[30px] overflow-hidden shadow-sm flex flex-col justify-between min-h-[420px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 w-12 text-center">Select</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Company Name</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Industry</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Website</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400">GST / TRN</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-xs text-slate-700">
              {paginatedCompanies.map((company) => (
                <tr
                  key={company._id}
                  onClick={() => setViewingCompany(company)}
                  className="hover:bg-indigo-50/20 cursor-pointer transition-colors group"
                >
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(company._id)}
                      onChange={(e) => toggleSelect(company._id, e)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-4">
                    <div className="font-black text-slate-900 flex items-center gap-2">
                      <span>{company.companyName}</span>
                      <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-slate-600">{company.industry || "—"}</td>
                  <td className="p-4 font-semibold text-slate-600" onClick={(e) => e.stopPropagation()}>
                    {company.website ? (
                      <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1.5">
                        <Globe size={12} /> {company.website}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="p-4 font-extrabold text-slate-800">{company.gstVat || company.trn || "—"}</td>
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); setViewingCompany(company); }} title="View Details" className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all"><Eye size={13} /></button>
                      <button onClick={(e) => handleOpenEdit(company, e)} title="Edit Company" className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"><Edit3 size={13} /></button>
                      <button onClick={(e) => triggerDeleteConfirm(company._id, e)} title="Delete Company" className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {filteredCompanies.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs font-bold text-slate-600 mt-auto">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Showing {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length} Companies
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                >
                  Prev
                </button>
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid Mode */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCompanies.map((company) => (
              <div
                key={company._id}
                onClick={() => setViewingCompany(company)}
                className="p-6 bg-white border border-slate-200/80 rounded-[28px] hover:shadow-lg cursor-pointer transition-all space-y-4 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{company.companyName}</h4>
                    {company.industry && <p className="text-[9px] font-black uppercase text-indigo-500 tracking-wider mt-0.5">{company.industry}</p>}
                  </div>
                  <button onClick={(e) => handleOpenEdit(company, e)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={14} /></button>
                </div>

                <div className="space-y-2 text-xs font-semibold text-slate-600">
                  {(company.gstVat || company.trn) && <div className="flex items-center gap-2"><ShieldCheck size={13} className="text-slate-400 shrink-0" /><span>TRN: {company.gstVat || company.trn}</span></div>}
                  {company.website && <div className="flex items-center gap-2"><Globe size={13} className="text-slate-400 shrink-0" /><span className="text-indigo-600">{company.website}</span></div>}
                  {company.companyEmail && <div className="flex items-center gap-2"><Mail size={13} className="text-slate-400 shrink-0" /><span>{company.companyEmail}</span></div>}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {filteredCompanies.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-white border border-slate-200/80 rounded-[24px] text-xs font-bold text-slate-600">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Showing {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length} Companies
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                >
                  Prev
                </button>
                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAILED 360 COMPANY PROFILE VIEW MODAL */}
      {viewingCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-2xl w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-200">
                  <Building2 size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{viewingCompany.companyName}</h3>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">Corporate Account</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {viewingCompany.industry || "General Enterprise"} {viewingCompany.employees ? `• ${viewingCompany.employees} Employees` : ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingCompany(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all"><X size={20} /></button>
            </div>

            {/* Profile Grid (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-slate-700">
              {/* Left Column: Tax & Corporate Reg Info */}
              <div className="bg-slate-50/80 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b pb-2 border-slate-200/50">Tax & Corporate Identifiers</span>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0"><ShieldCheck size={14} /></div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">GST / TRN Number</span>
                      <span className="font-extrabold text-slate-900">{viewingCompany.gstVat || viewingCompany.trn || "Not Registered"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0"><Globe size={14} /></div>
                    <div className="overflow-hidden">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Corporate Website</span>
                      {viewingCompany.website ? (
                        <a href={viewingCompany.website.startsWith("http") ? viewingCompany.website : `https://${viewingCompany.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate block font-extrabold">
                          {viewingCompany.website}
                        </a>
                      ) : <span className="text-slate-400 font-medium">—</span>}
                    </div>
                  </div>

                  {viewingCompany.annualRevenue > 0 && (
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0"><DollarSign size={14} /></div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Est. Annual Revenue</span>
                        <span className="font-extrabold text-emerald-700">${Number(viewingCompany.annualRevenue).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Contact Channels & Location */}
              <div className="bg-slate-50/80 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b pb-2 border-slate-200/50">Communication & Address</span>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0"><Mail size={14} /></div>
                    <div className="overflow-hidden">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Corporate Email</span>
                      <span className="truncate block font-extrabold text-slate-900">{viewingCompany.companyEmail || viewingCompany.email || "No email logged"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0"><Phone size={14} /></div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Direct Line</span>
                      <span className="font-extrabold text-slate-900">{viewingCompany.phone || "No phone logged"}</span>
                    </div>
                  </div>

                  {viewingCompany.address && (
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0"><MapPin size={14} /></div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Office Address</span>
                        <span className="font-extrabold text-slate-900">{viewingCompany.address}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Company Metadata Bar */}
            <div className="bg-indigo-50/40 border border-indigo-100/60 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-3 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-600" />
                <span>Account Created: <span className="font-black text-slate-900">{viewingCompany.createdAt ? new Date(viewingCompany.createdAt).toLocaleDateString() : "Active"}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100/80 border border-indigo-200 px-3 py-1 rounded-full">
                  Website ID: {websiteId ? "Scoped Asset" : "Global Asset"}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t pt-4 border-slate-100 flex-wrap">
              <button
                onClick={() => {
                  exportSingleRecordPDF(
                    `COMPANY PROFILE - ${viewingCompany.companyName}`,
                    {
                      "Company Name": viewingCompany.companyName,
                      "Industry": viewingCompany.industry || "-",
                      "TRN / Tax ID": viewingCompany.gstVat || viewingCompany.trn || "Not Registered",
                      "Website": viewingCompany.website || "-",
                      "Corporate Email": viewingCompany.companyEmail || viewingCompany.email || "-",
                      "Phone": viewingCompany.phone || "-",
                      "Office Address": viewingCompany.address || "-",
                      "Est. Annual Revenue": viewingCompany.annualRevenue ? `$${Number(viewingCompany.annualRevenue).toLocaleString()}` : "-"
                    },
                    `Company_Profile_${(viewingCompany.companyName || "Record").replace(/\s+/g, '_')}`
                  );
                }}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black rounded-xl uppercase transition-all flex items-center gap-1.5"
                title="Export single company record profile PDF"
              >
                <Printer size={13} /> Export Single PDF
              </button>
              <button
                onClick={(e) => { const c = viewingCompany; setViewingCompany(null); handleOpenEdit(c, e); }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl uppercase transition-all"
              >
                Edit Company
              </button>
              <button
                onClick={() => setViewingCompany(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase shadow-lg shadow-indigo-100 transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT COMPANY MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{editingCompany ? "Edit Company" : "Create New Company"}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Company Name</label>
                <input
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Industry</label>
                  <input
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">GST/VAT (TRN)</label>
                  <input
                    value={form.gstVat}
                    onChange={(e) => setForm({ ...form, gstVat: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Website URL</label>
                <input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Corporate Email</label>
                  <input
                    type="email"
                    value={form.companyEmail}
                    onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Phone Line</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Office Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 min-h-[70px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl uppercase transition-all">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl uppercase shadow-lg shadow-indigo-100 transition-all">{editingCompany ? "Save Changes" : "Create Company"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmModalConfig.open}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        loading={confirmModalConfig.loading}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false })}
      />
    </div>
  );
}
