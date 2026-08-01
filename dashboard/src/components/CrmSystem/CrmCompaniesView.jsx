import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Plus, Grid, List, Mail, Phone, Building2, Trash2, Edit3, X, Check, Globe } from "lucide-react";
import { api } from "../../api/client.js";
import ConfirmModal from "../ConfirmModal.jsx";

export default function CrmCompaniesView({ websiteId }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("list");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

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
      const q = new URLSearchParams({
        page,
        search,
        websiteId,
        limit: 10
      }).toString();
      const res = await api(`/api/crm/companies?${q}`);
      setCompanies(res.companies || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [page, search, websiteId]);

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

  const handleOpenEdit = (company) => {
    setEditingCompany(company);
    setForm({
      companyName: company.companyName || "",
      industry: company.industry || "",
      website: company.website || "",
      gstVat: company.gstVat || "",
      companyEmail: company.companyEmail || "",
      phone: company.phone || "",
      address: company.address || "",
      employees: company.employees || 0,
      annualRevenue: company.annualRevenue || 0
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
      if (editingCompany) {
        await api(`/api/crm/companies/${editingCompany._id}`, {
          method: "PATCH",
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
      alert("Failed to save company: " + err.message);
    }
  };

  const triggerDeleteConfirm = (id) => {
    setConfirmModalConfig({
      open: true,
      title: "Delete Company",
      message: "Are you sure you want to delete this company? This action cannot be undone.",
      loading: false,
      onConfirm: () => executeDeleteCompany(id)
    });
  };

  const executeDeleteCompany = async (id) => {
    setConfirmModalConfig(prev => ({ ...prev, loading: true }));
    try {
      await api(`/api/crm/companies/${id}`, { method: "DELETE" });
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
      message: `Are you sure you want to delete ${selectedIds.length} companies? This action cannot be undone.`,
      loading: false,
      onConfirm: executeBulkDeleteCompany
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

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
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
            placeholder="Search companies..."
            className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3.5 text-xs font-bold outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 placeholder:text-slate-300"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => setViewMode("list")} className={`p-2 rounded-xl ${viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}><List size={16} /></button>
            <button onClick={() => setViewMode("grid")} className={`p-2 rounded-xl ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}><Grid size={16} /></button>
          </div>
          {selectedIds.length > 0 && (
            <button onClick={triggerBulkDeleteConfirm} className="bg-red-50 text-red-600 hover:bg-red-100 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
              <Trash2 size={14} /> Delete Selected ({selectedIds.length})
            </button>
          )}
          <button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
            <Plus size={14} /> Add Company
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold text-xs uppercase tracking-widest">No companies found</div>
      ) : viewMode === "list" ? (
        /* List Mode */
        <div className="bg-white border border-slate-200/80 rounded-[30px] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="p-5 text-[10px] font-black uppercase text-slate-400 w-12 text-center">Select</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Company Name</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Industry</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Website</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">GST/VAT</th>
                <th className="p-5 text-[10px] font-black uppercase text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(company._id)}
                      onChange={() => toggleSelect(company._id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="p-5 font-black text-slate-900">
                    <div>{company.companyName}</div>
                  </td>
                  <td className="p-5 font-bold text-slate-600">{company.industry || "-"}</td>
                  <td className="p-5 font-bold text-slate-600">
                    {company.website ? (
                      <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1.5">
                        <Globe size={12} /> {company.website}
                      </a>
                    ) : "-"}
                  </td>
                  <td className="p-5 font-bold text-slate-600">{company.gstVat || "-"}</td>
                  <td className="p-5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenEdit(company)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"><Edit3 size={14} /></button>
                      <button onClick={() => triggerDeleteConfirm(company._id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div key={company._id} className="premium-card p-6 bg-white border border-slate-100 rounded-[28px] hover:shadow-lg transition-all space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900">{company.companyName}</h4>
                  {company.industry && <p className="text-[9px] font-black uppercase text-indigo-500 tracking-wider mt-1">{company.industry}</p>}
                </div>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(company._id)}
                  onChange={() => toggleSelect(company._id)}
                  className="rounded border-slate-300 text-indigo-600 w-4 h-4 cursor-pointer"
                />
              </div>
              <div className="space-y-2 text-xs font-bold text-slate-500">
                {company.companyEmail && <div className="flex items-center gap-2.5"><Mail size={14} className="text-slate-400" /> {company.companyEmail}</div>}
                {company.phone && <div className="flex items-center gap-2.5"><Phone size={14} className="text-slate-400" /> {company.phone}</div>}
                {company.website && <div className="flex items-center gap-2.5"><Building2 size={14} className="text-slate-400" /> {company.website}</div>}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                <button onClick={() => handleOpenEdit(company)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all"><Edit3 size={14} /></button>
                <button onClick={() => triggerDeleteConfirm(company._id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${page === p ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] p-4 sm:p-6 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto" onClick={() => setShowModal(false)} />
          <div className="relative z-10 pointer-events-auto w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 sm:px-8 py-5 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-black text-slate-900">{editingCompany ? "Edit Company" : "Create Company"}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Company Name</label>
                <input
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Industry</label>
                  <input
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Website</label>
                  <input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Company Email</label>
                  <input
                    type="email"
                    value={form.companyEmail}
                    onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Employees</label>
                  <input
                    type="number"
                    value={form.employees}
                    onChange={(e) => setForm({ ...form, employees: Number(e.target.value) })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">GST/VAT</label>
                  <input
                    value={form.gstVat}
                    onChange={(e) => setForm({ ...form, gstVat: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address</label>
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-2.5 text-xs font-bold min-h-[60px]"
                />
              </div>

              <button type="submit" className="w-full py-4 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 mt-2">
                <Check size={16} /> Save Company
              </button>
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
        onCancel={() => setConfirmModalConfig({ open: false, title: "", message: "", onConfirm: () => {}, loading: false })}
      />
    </div>
  );
}
