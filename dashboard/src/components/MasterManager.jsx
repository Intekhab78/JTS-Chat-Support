import { useEffect, useState, useMemo } from "react";
import { Edit2, Trash2, Plus, X, Save, RefreshCw, Search, SlidersHorizontal, CheckCircle2, AlertCircle, Layers } from "lucide-react";
import { api } from "../api/client.js";
import EmptyState from "./EmptyState.jsx";
import MasterModal from "./MasterModal.jsx";

export default function MasterManager({ type, websiteId, title, label }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]); // for subcategory category selection
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ name: "", categoryId: "", rate: 0, taxCode: "", description: "", isActive: true });

  async function loadData() {
    if (!websiteId) return;
    setLoading(true);
    try {
      const data = await api(`/api/inventory/masters/${type}?websiteId=${websiteId}`);
      setItems(Array.isArray(data) ? data : []);
      
      if (type === "subcategory") {
        const catData = await api(`/api/inventory/masters/category?websiteId=${websiteId}`);
        setCategories(Array.isArray(catData) ? catData : []);
      }
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load master data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [websiteId, type]);

  const totalCount = items.length;
  const activeCount = useMemo(() => items.filter((i) => i.isActive !== false).length, [items]);
  const inactiveCount = useMemo(() => items.filter((i) => i.isActive === false).length, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (statusFilter === "active" && item.isActive === false) return false;
      if (statusFilter === "inactive" && item.isActive !== false) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesCode = item.taxCode?.toLowerCase().includes(q);
        const catName = categories.find(c => c._id === item.categoryId)?.name?.toLowerCase();
        const matchesCat = catName?.includes(q);
        return matchesName || matchesDesc || matchesCode || matchesCat;
      }
      return true;
    });
  }, [items, searchQuery, statusFilter, categories]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      setSuccess("");
      const payload = { ...form, websiteId };
      if (editingId) {
        await api(`/api/inventory/masters/${type}/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSuccess(`${label} updated successfully.`);
      } else {
        await api(`/api/inventory/masters/${type}`, { method: "POST", body: JSON.stringify(payload) });
        setSuccess(`${label} created successfully.`);
      }
      setShowForm(false);
      setEditingId("");
      setForm({ name: "", categoryId: "", rate: 0, taxCode: "", description: "", isActive: true });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(`Delete this ${label}?`)) return;
    try {
      await api(`/api/inventory/masters/${type}/${id}`, { method: "DELETE" });
      setSuccess(`${label} deleted successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete.");
    }
  }

  function formatDate(value) {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {error ? <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100">{error}</div> : null}
      {success ? <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">{success}</div> : null}

      {/* Metric Dashboard Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setStatusFilter("all")}
          className={`text-left rounded-[28px] border transition-all p-5 shadow-sm ${
            statusFilter === "all" ? "bg-slate-900 text-white border-slate-800 shadow-xl" : "bg-white border-slate-200/70 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${statusFilter === "all" ? "text-indigo-300" : "text-slate-400"}`}>
              Total {label}s
            </p>
            <Layers size={18} className={statusFilter === "all" ? "text-indigo-400" : "text-slate-300"} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-3xl font-black tracking-tight">{totalCount}</p>

            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl ${
              statusFilter === "all" ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              All Records
            </span>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter("active")}
          className={`text-left rounded-[28px] border transition-all p-5 shadow-sm ${
            statusFilter === "active" ? "bg-emerald-600 text-white border-emerald-500 shadow-xl" : "bg-white border-slate-200/70 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${statusFilter === "active" ? "text-emerald-100" : "text-emerald-600"}`}>
              Active Status
            </p>
            <CheckCircle2 size={18} className={statusFilter === "active" ? "text-white" : "text-emerald-500"} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-3xl font-black tracking-tight">{activeCount}</p>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl ${
              statusFilter === "active" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            }`}>
              Operational
            </span>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter("inactive")}
          className={`text-left rounded-[28px] border transition-all p-5 shadow-sm ${
            statusFilter === "inactive" ? "bg-slate-800 text-white border-slate-700 shadow-xl" : "bg-white border-slate-200/70 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${statusFilter === "inactive" ? "text-rose-300" : "text-slate-400"}`}>
              Inactive / Archived
            </p>
            <AlertCircle size={18} className={statusFilter === "inactive" ? "text-rose-400" : "text-slate-300"} />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="text-3xl font-black tracking-tight">{inactiveCount}</p>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl ${
              statusFilter === "inactive" ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              Disabled
            </span>
          </div>
        </button>
      </div>

      {/* Header and Add Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-500">{title}</p>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">Manage {label} Master</h3>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setEditingId("");
              setForm({ name: "", categoryId: "", rate: 0, taxCode: "", description: "", isActive: true });
            }}
            className="rounded-[24px] bg-slate-900 hover:bg-black px-6 py-3.5 text-white font-black text-[10px] uppercase tracking-[0.22em] shadow-xl flex items-center gap-2 transition-all hover:-translate-y-0.5"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancel" : `Add ${label}`}
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-2.5 rounded-[24px] border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}s by name or keyword...`}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-extrabold text-slate-800 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-700 outline-none uppercase tracking-wider cursor-pointer"
            >
              <option value="all">All Statuses ({totalCount})</option>
              <option value="active">Active Only ({activeCount})</option>
              <option value="inactive">Inactive Only ({inactiveCount})</option>
            </select>
          </div>
        </div>
      </div>

      <MasterModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId("");
          setForm({ name: "", categoryId: "", rate: 0, taxCode: "", description: "", isActive: true });
        }}
        title={editingId ? `Edit ${label}` : `Add New ${label}`}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Update Master" : "Save Master"}
      >
        <div className="grid grid-cols-1 gap-5">
          <label className="space-y-2 block">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label} Name</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:border-indigo-500"
              placeholder={`e.g. ${type === "size" ? "XL" : type === "color" ? "Red" : "Electronics"}`}
              required
            />
          </label>
          {type === "subcategory" && (
            <label className="space-y-2 block">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Main Category</span>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:border-indigo-500"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </label>
          )}

          {type === "tax" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2 block">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VAT Rate (%)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:border-indigo-500"
                    placeholder="e.g. 5"
                    required
                  />
                </label>
                <label className="space-y-2 block">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VAT Code / Identifier</span>
                  <input
                    value={form.taxCode}
                    onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:border-indigo-500"
                    placeholder="e.g. VAT5"
                  />
                </label>
              </div>
              <label className="space-y-2 block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description / UAE FTA Rule Note</span>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:border-indigo-500"
                  placeholder="e.g. Standard 5% UAE VAT rate applicable for domestic supplies"
                />
              </label>
            </>
          )}

          <div className="flex items-center gap-3 pt-2">
            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.isActive} 
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })} 
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Status</span>
            </label>
          </div>
        </div>
      </MasterModal>

      <div className="premium-card overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm">
        <div className="min-h-0 overflow-x-auto">
          <table className="w-full table-fixed min-w-[700px]">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 w-[30%]">Name</th>
                {type === "subcategory" && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Main Category</th>}
                {type === "tax" && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">VAT Rate (%)</th>}
                {type === "tax" && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">VAT Code</th>}
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Created Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={type === "subcategory" || type === "tax" ? 6 : 4} className="py-10 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">Loading...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={type === "subcategory" || type === "tax" ? 6 : 4} className="py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {searchQuery || statusFilter !== "all" ? (
                      <div className="space-y-2">
                        <p className="text-xs font-extrabold text-slate-700">No {label.toLowerCase()}s found matching your search/filters</p>
                        <button
                          onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black rounded-xl uppercase tracking-wider transition-all"
                        >
                          Clear Filters
                        </button>
                      </div>
                    ) : <EmptyState />}
                  </td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                    {item.description ? <p className="text-[10px] font-bold text-slate-400 truncate max-w-xs">{item.description}</p> : null}
                  </td>
                  {type === "subcategory" && (
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-600 border border-indigo-100">
                        {categories.find(c => c._id === item.categoryId)?.name || "Unknown"}
                      </span>
                    </td>
                  )}
                  {type === "tax" && (
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 border border-emerald-200">
                        {item.rate !== undefined ? item.rate : (item.taxRate || 0)}%
                      </span>
                    </td>
                  )}
                  {type === "tax" && (
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">
                      {item.taxCode || "-"}
                    </td>
                  )}
                  <td className="px-6 py-4 text-[11px] font-bold text-slate-500">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-xl border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${item.isActive !== false ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
                      {item.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(item._id);
                          setForm({ name: item.name, categoryId: item.categoryId || "", rate: item.rate !== undefined ? item.rate : (item.taxRate || 0), taxCode: item.taxCode || "", description: item.description || "", isActive: item.isActive !== false });
                          setShowForm(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
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
    </div>
  );
}
