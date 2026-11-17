import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Plus,
  Grid,
  List,
  Mail,
  Phone,
  Building2,
  Trash2,
  Edit3,
  X,
  Globe,
  ShieldCheck,
  ChevronRight,
  Eye,
  DollarSign,
  MapPin,
  Users,
  Download,
  Printer,
  RefreshCw
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useCurrency } from "../../context/CurrencyContext.jsx";
import ConfirmModal from "../ConfirmModal.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

const isValidWebsiteId = (id) =>
  Boolean(id && id !== "all" && id !== "undefined" && id !== "null");

export default function CrmCompaniesView({ websiteId }) {
  const toast = useToast();
  const { formatCurrency, currencySymbol = "$" } = useCurrency();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    companyName: "",
    industry: "",
    website: "",
    gstVat: "",
    companyEmail: "",
    phone: "",
    address: "",
    employees: "",
    annualRevenue: ""
  });

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const qs = isValidWebsiteId(websiteId)
        ? `?websiteId=${encodeURIComponent(websiteId)}&limit=300`
        : "?limit=300";
      const res = await api(`/api/crm/companies${qs}`);
      const list = Array.isArray(res) ? res : res?.companies || res?.data || [];
      setCompanies(list);
    } catch (err) {
      console.error(err);
      toast?.error?.(err?.message || "Failed to load companies");
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
    const withVatCount = companies.filter((c) => Boolean(c.gstVat || c.trn)).length;
    const withWebsiteCount = companies.filter((c) => Boolean(c.website)).length;
    const withEmailCount = companies.filter((c) => Boolean(c.companyEmail || c.email)).length;

    return { totalCount, withVatCount, withWebsiteCount, withEmailCount };
  }, [companies]);

  // Dynamic industry options derived from actual records
  const industryOptions = useMemo(() => {
    const set = new Set();
    companies.forEach((c) => {
      if (c.industry && c.industry.trim()) set.add(c.industry.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [companies]);

  // Filtered & Paginated Companies
  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return companies.filter((c) => {
      const compName = (c.companyName || "").toLowerCase();
      const indStr = (c.industry || "").toLowerCase();
      const vatStr = (c.gstVat || c.trn || "").toLowerCase();
      const webStr = (c.website || "").toLowerCase();
      const emailStr = (c.companyEmail || c.email || "").toLowerCase();

      const matchesSearch =
        q === "" ||
        compName.includes(q) ||
        indStr.includes(q) ||
        vatStr.includes(q) ||
        webStr.includes(q) ||
        emailStr.includes(q);

      const matchesIndustry =
        industryFilter === "all" || indStr === industryFilter.toLowerCase();

      return matchesSearch && matchesIndustry;
    });
  }, [companies, search, industryFilter]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);

  const paginatedCompanies = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return filteredCompanies.slice(start, start + itemsPerPage);
  }, [filteredCompanies, safePage, itemsPerPage]);

  const allPageSelected =
    paginatedCompanies.length > 0 &&
    paginatedCompanies.every((c) => selectedIds.includes(c._id));

  const toggleSelectAllOnPage = () => {
    const pageIds = paginatedCompanies.map((c) => c._id);
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  useEffect(() => {
    if (showModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

  const handleOpenCreate = () => {
    setEditingCompany(null);
    setForm({
      companyName: "",
      industry: "",
      website: "",
      gstVat: "",
      companyEmail: "",
      phone: "",
      address: "",
      employees: "",
      annualRevenue: ""
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
      employees: company.employees || "",
      annualRevenue: company.annualRevenue || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    const payload = {
      companyName: form.companyName.trim(),
      industry: form.industry.trim() || undefined,
      website: form.website.trim() || undefined,
      gstVat: form.gstVat.trim() || undefined,
      companyEmail: form.companyEmail.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      employees: form.employees !== "" ? Number(form.employees) || 0 : undefined,
      annualRevenue: form.annualRevenue !== "" ? Number(form.annualRevenue) || 0 : undefined
    };
    if (isValidWebsiteId(websiteId)) {
      payload.websiteId = websiteId;
    }

    try {
      if (editingCompany) {
        await api(`/api/crm/companies/${editingCompany._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        toast?.success?.("Company updated");
      } else {
        await api("/api/crm/companies", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast?.success?.("Company created");
      }
      setShowModal(false);
      await fetchCompanies();
    } catch (err) {
      toast?.error?.(err?.message || "Failed to save company");
    } finally {
      setSaving(false);
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
    setConfirmModalConfig((prev) => ({ ...prev, loading: true }));
    try {
      await api(`/api/crm/companies/${id}`, { method: "DELETE" });
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      if (viewingCompany?._id === id) setViewingCompany(null);
      toast?.success?.("Company deleted");
      await fetchCompanies();
      setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false });
    } catch (err) {
      toast?.error?.(err?.message || "Failed to delete company");
      setConfirmModalConfig((prev) => ({ ...prev, loading: false }));
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
    setConfirmModalConfig((prev) => ({ ...prev, loading: true }));
    try {
      await Promise.all(selectedIds.map((id) => api(`/api/crm/companies/${id}`, { method: "DELETE" })));
      toast?.success?.(`${selectedIds.length} companies deleted`);
      setSelectedIds([]);
      await fetchCompanies();
      setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false });
    } catch (err) {
      toast?.error?.(err?.message || "Failed to delete selected companies");
      setConfirmModalConfig((prev) => ({ ...prev, loading: false }));
    }
  };

  const toggleSelect = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleExportCompaniesCSV = () => {
    const data = filteredCompanies.map((c) => ({
      "Company Name": c.companyName || "—",
      Industry: c.industry || "—",
      Website: c.website || "—",
      "GST / TRN": c.gstVat || c.trn || "—",
      "Corporate Email": c.companyEmail || c.email || "—",
      Phone: c.phone || "—",
      "Office Address": c.address || "—"
    }));
    exportToCSV(data, `Companies_Directory_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportCompaniesPDF = () => {
    const data = filteredCompanies.map((c) => ({
      "Company Name": c.companyName || "—",
      Industry: c.industry || "—",
      "TRN / Tax ID": c.gstVat || c.trn || "—",
      Website: c.website || "—",
      Email: c.companyEmail || c.email || "—"
    }));
    exportToPDF(
      data,
      `Companies_Directory_${new Date().toISOString().slice(0, 10)}`,
      "CORPORATE COMPANIES DIRECTORY REPORT"
    );
  };

  const hasActiveFilters = search.trim() !== "" || industryFilter !== "all";

  return (
    <div className="space-y-3 bg-white">
      {/* Compact Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2.5 border-slate-100">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Corporate Companies Directory
          </h3>
          <p className="text-[10px] font-medium text-slate-500 mt-0.5">
            Manage enterprise accounts, tax profiles, and corporate affiliations
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {selectedIds.length > 0 && (
            <span className="text-[9.5px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg">
              {selectedIds.length} selected
            </span>
          )}
          <button
            onClick={handleExportCompaniesCSV}
            disabled={filteredCompanies.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
            title="Export Companies Directory to CSV"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={handleExportCompaniesPDF}
            disabled={filteredCompanies.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
            title="Export Companies Directory to PDF"
          >
            <Printer size={12} /> Export PDF
          </button>
          <button
            onClick={fetchCompanies}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
            title="Refresh companies"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Compact KPI Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Total Companies
            </span>
            <span className="text-sm font-black text-slate-900">{metrics.totalCount} Accounts</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              TRN/VAT Registered
            </span>
            <span className="text-sm font-black text-emerald-700">{metrics.withVatCount} Verified</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Globe size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Active Websites
            </span>
            <span className="text-sm font-black text-blue-700">{metrics.withWebsiteCount} Domains</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Mail size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Corporate Emails
            </span>
            <span className="text-sm font-black text-amber-700">{metrics.withEmailCount} Accounts</span>
          </div>
        </div>
      </div>

      {/* Compact Action & Filter Bar */}
      <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl shadow-xs flex flex-col lg:flex-row gap-2 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search companies by name, industry, TRN, website, or email…"
            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          <select
            value={industryFilter}
            onChange={(e) => {
              setIndustryFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-40 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Industries</option>
            {industryOptions.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md ${
                viewMode === "list" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-400"
              }`}
              title="List view"
            >
              <List size={13} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md ${
                viewMode === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-400"
              }`}
              title="Grid view"
            >
              <Grid size={13} />
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch("");
                setIndustryFilter("all");
                setPage(1);
              }}
              className="px-2 py-1.5 text-[9.5px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            >
              Reset
            </button>
          )}

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const selectedCompanies = companies.filter((c) => selectedIds.includes(c._id));
                  const data = selectedCompanies.map((c) => ({
                    "Company Name": c.companyName || "—",
                    Industry: c.industry || "—",
                    Website: c.website || "—",
                    "GST / TRN": c.gstVat || c.trn || "—",
                    "Corporate Email": c.companyEmail || c.email || "—",
                    Phone: c.phone || "—"
                  }));
                  exportToCSV(data, `Selected_Companies_${selectedIds.length}_Items`);
                }}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                title="Export Selected Companies CSV"
              >
                <Download size={12} /> Export ({selectedIds.length})
              </button>
              <button
                onClick={triggerBulkDeleteConfirm}
                className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all"
              >
                <Trash2 size={12} /> Delete ({selectedIds.length})
              </button>
            </div>
          )}

          <button
            onClick={handleOpenCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs transition-all"
          >
            <Plus size={12} /> Add Company
          </button>
        </div>
      </div>

      {/* Loading / Empty / Data Views */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-10 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : paginatedCompanies.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-[10px] uppercase tracking-wider">
          No companies found matching filters
        </div>
      ) : viewMode === "list" ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-3 py-2 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      title="Select all on this page"
                    />
                  </th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    Company Name
                  </th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    Industry
                  </th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    Website
                  </th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    GST / TRN
                  </th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10.5px] font-semibold text-slate-700">
                {paginatedCompanies.map((company) => (
                  <tr
                    key={company._id}
                    onClick={() => setViewingCompany(company)}
                    className="hover:bg-indigo-50/20 cursor-pointer transition-colors group"
                  >
                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(company._id)}
                        onChange={(e) => toggleSelect(company._id, e)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="truncate max-w-[200px]">{company.companyName}</span>
                        <ChevronRight
                          size={12}
                          className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{company.industry || "—"}</td>
                    <td className="px-3 py-2 text-slate-600" onClick={(e) => e.stopPropagation()}>
                      {company.website ? (
                        <a
                          href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1 truncate max-w-[180px]"
                        >
                          <Globe size={11} className="shrink-0" /> {company.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-800">
                      {company.gstVat || company.trn || "—"}
                    </td>
                    <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingCompany(company);
                          }}
                          title="View Details"
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={(e) => handleOpenEdit(company, e)}
                          title="Edit Company"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={(e) => triggerDeleteConfirm(company._id, e)}
                          title="Delete Company"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Compact Pagination */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 text-[10px] font-bold text-slate-600">
            <span className="text-[9.5px] uppercase tracking-wider text-slate-400">
              Showing {(safePage - 1) * itemsPerPage + 1}–
              {Math.min(safePage * itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9.5px] font-black uppercase transition-all"
              >
                Prev
              </button>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9.5px] font-black">
                {safePage} / {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9.5px] font-black uppercase transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Compact Grid Mode */
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {paginatedCompanies.map((company) => (
              <div
                key={company._id}
                onClick={() => setViewingCompany(company)}
                className="p-3.5 bg-white border border-slate-200/80 rounded-xl hover:shadow-sm hover:border-indigo-200 cursor-pointer transition-all space-y-2.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {company.companyName}
                    </h4>
                    {company.industry && (
                      <p className="text-[9px] font-black uppercase text-indigo-500 tracking-wider mt-0.5 truncate">
                        {company.industry}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleOpenEdit(company, e)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shrink-0"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>

                <div className="space-y-1 text-[10px] font-semibold text-slate-600">
                  {(company.gstVat || company.trn) && (
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={11} className="text-slate-400 shrink-0" />
                      <span>TRN: {company.gstVat || company.trn}</span>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-1.5">
                      <Globe size={11} className="text-slate-400 shrink-0" />
                      <span className="text-indigo-600 truncate">{company.website}</span>
                    </div>
                  )}
                  {(company.companyEmail || company.email) && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">{company.companyEmail || company.email}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-[10px] font-bold text-slate-600">
            <span className="text-[9.5px] uppercase tracking-wider text-slate-400">
              Showing {(safePage - 1) * itemsPerPage + 1}–
              {Math.min(safePage * itemsPerPage, filteredCompanies.length)} of {filteredCompanies.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9.5px] font-black uppercase transition-all"
              >
                Prev
              </button>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9.5px] font-black">
                {safePage} / {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9.5px] font-black uppercase transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED 360 COMPANY PROFILE VIEW MODAL */}
      {viewingCompany &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingCompany(null);
            }}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black text-slate-900">{viewingCompany.companyName}</h3>
                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Corporate
                    </span>
                  </div>
                  {(viewingCompany.industry || viewingCompany.employees > 0) && (
                    <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {[
                        viewingCompany.industry,
                        viewingCompany.employees ? `${viewingCompany.employees} Employees` : ""
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewingCompany(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[10.5px] font-semibold text-slate-700">
              <div className="bg-slate-50/80 border border-slate-200/60 p-3 rounded-xl space-y-2">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block border-b pb-1.5 border-slate-200/50">
                  Tax &amp; Identifiers
                </span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                      <ShieldCheck size={12} />
                    </div>
                    <div>
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">GST / TRN</span>
                      <span className="font-bold text-slate-900">
                        {viewingCompany.gstVat || viewingCompany.trn || "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                      <Globe size={12} />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Website</span>
                      {viewingCompany.website ? (
                        <a
                          href={
                            viewingCompany.website.startsWith("http")
                              ? viewingCompany.website
                              : `https://${viewingCompany.website}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline truncate block font-bold"
                        >
                          {viewingCompany.website}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                  {viewingCompany.annualRevenue > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                        <DollarSign size={12} />
                      </div>
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase block">
                          Est. Revenue
                        </span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(Number(viewingCompany.annualRevenue))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50/80 border border-slate-200/60 p-3 rounded-xl space-y-2">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block border-b pb-1.5 border-slate-200/50">
                  Communication &amp; Address
                </span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                      <Mail size={12} />
                    </div>
                    <div className="overflow-hidden">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Email</span>
                      <span className="truncate block font-bold text-slate-900">
                        {viewingCompany.companyEmail || viewingCompany.email || "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                      <Phone size={12} />
                    </div>
                    <div>
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Direct Line</span>
                      <span className="font-bold text-slate-900">{viewingCompany.phone || "—"}</span>
                    </div>
                  </div>
                  {viewingCompany.address && (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 shrink-0">
                        <MapPin size={12} />
                      </div>
                      <div>
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Address</span>
                        <span className="font-bold text-slate-900">{viewingCompany.address}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl flex justify-between items-center text-[10px] font-bold text-slate-600">
              <div className="flex items-center gap-1.5">
                <Users size={13} className="text-indigo-600" />
                <span>
                  Created:{" "}
                  <span className="text-slate-900">
                    {viewingCompany.createdAt
                      ? new Date(viewingCompany.createdAt).toLocaleDateString()
                      : "—"}
                  </span>
                </span>
              </div>
              <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                {isValidWebsiteId(websiteId) ? "Scoped Website" : "All Websites"}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-2.5 border-slate-100 flex-wrap">
              <button
                onClick={() => {
                  exportSingleRecordPDF(
                    `COMPANY PROFILE - ${viewingCompany.companyName}`,
                    {
                      "Company Name": viewingCompany.companyName,
                      Industry: viewingCompany.industry || "—",
                      "TRN / Tax ID": viewingCompany.gstVat || viewingCompany.trn || "—",
                      Website: viewingCompany.website || "—",
                      "Corporate Email": viewingCompany.companyEmail || viewingCompany.email || "—",
                      Phone: viewingCompany.phone || "—",
                      "Office Address": viewingCompany.address || "—",
                      "Est. Annual Revenue": viewingCompany.annualRevenue
                        ? formatCurrency(Number(viewingCompany.annualRevenue))
                        : "—"
                    },
                    `Company_Profile_${(viewingCompany.companyName || "Record").replace(/\s+/g, "_")}`
                  );
                }}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black rounded-lg uppercase transition-all flex items-center gap-1"
              >
                <Printer size={12} /> Export PDF
              </button>
              <button
                onClick={(e) => {
                  const c = viewingCompany;
                  setViewingCompany(null);
                  handleOpenEdit(c, e);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-black rounded-lg uppercase transition-all"
              >
                Edit Company
              </button>
              <button
                onClick={() => setViewingCompany(null)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg uppercase transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE / EDIT COMPANY MODAL */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {editingCompany ? "Edit Company" : "Create New Company"}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Company Name *
                  </label>
                  <input
                    required
                    placeholder="e.g. Acme Global LLC"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Industry
                    </label>
                    <input
                      placeholder="e.g. Software / Retail"
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      GST / VAT (TRN)
                    </label>
                    <input
                      placeholder="e.g. TRN-100456789000003"
                      value={form.gstVat}
                      onChange={(e) => setForm({ ...form, gstVat: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Website URL
                  </label>
                  <input
                    placeholder="https://company.com"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Corporate Email
                    </label>
                    <input
                      type="email"
                      placeholder="info@company.com"
                      value={form.companyEmail}
                      onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Phone Line
                    </label>
                    <input
                      placeholder="+971 4 123 4567"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Employees
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50"
                      value={form.employees}
                      onChange={(e) => setForm({ ...form, employees: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Annual Revenue ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 250000"
                      value={form.annualRevenue}
                      onChange={(e) => setForm({ ...form, annualRevenue: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Office Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Street, Suite, City, Country..."
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black rounded-xl uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black rounded-xl uppercase shadow-sm transition-all"
                  >
                    {saving ? "Saving…" : editingCompany ? "Save Changes" : "Create Company"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <ConfirmModal
        open={confirmModalConfig.open}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        loading={confirmModalConfig.loading}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() =>
          setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false })
        }
      />
    </div>
  );
}
