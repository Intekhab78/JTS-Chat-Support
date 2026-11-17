import { useEffect, useState, useMemo } from "react";
import {
  Edit2, Trash2, Plus, X, RefreshCw, Search, SlidersHorizontal,
  CheckCircle2, AlertCircle, Layers
} from "lucide-react";
import { api } from "../api/client.js";
import EmptyState from "./EmptyState.jsx";
import MasterModal from "./MasterModal.jsx";

export default function MasterManager({ type, websiteId, title, label }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    rate: 0,
    taxCode: "",
    description: "",
    isActive: true,
    createDashboard: true
  });

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
  const pluralLabel = label.endsWith("y") ? `${label.slice(0, -1)}ies` : `${label}s`;
  const activeCount = useMemo(() => items.filter((i) => i.isActive !== false).length, [items]);
  const inactiveCount = useMemo(() => items.filter((i) => i.isActive === false).length, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === "active" && item.isActive === false) return false;
      if (statusFilter === "inactive" && item.isActive !== false) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesCode = item.taxCode?.toLowerCase().includes(q);
        const catName = categories.find((c) => c._id === item.categoryId)?.name?.toLowerCase();
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
        await api(`/api/inventory/masters/${type}/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setSuccess(`${label} updated successfully.`);
      } else {
        await api(`/api/inventory/masters/${type}`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setSuccess(`${label} created successfully.`);
      }
      setShowForm(false);
      setEditingId("");
      setForm({
        name: "",
        categoryId: "",
        rate: 0,
        taxCode: "",
        description: "",
        isActive: true,
        createDashboard: true
      });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save.");
    }
  }

  async function handleToggleActive(item) {
    setBusyId(item._id);
    setError("");
    setSuccess("");
    try {
      await api(`/api/inventory/masters/${type}/${item._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: item.isActive === false, websiteId })
      });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    setBusyId(id);
    setError("");
    setSuccess("");
    try {
      await api(`/api/inventory/masters/${type}/${id}`, { method: "DELETE" });
      setConfirmDeleteId(null);
      setSuccess(`${label} deleted successfully.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete.");
    } finally {
      setBusyId(null);
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
    <div className="space-y-4">
      {error ? (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
            <X size={13} />
          </button>
        </div>
      ) : null}
      {success ? (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="text-emerald-500 hover:text-emerald-700">
            <X size={13} />
          </button>
        </div>
      ) : null}

      {/* Compact Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => setStatusFilter("all")}
          className={`text-left rounded-2xl border transition-all p-3.5 shadow-sm ${
            statusFilter === "all"
              ? "bg-white text-slate-900 border-indigo-400 ring-2 ring-indigo-500/10 shadow-md"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === "all" ? "text-indigo-600" : "text-slate-400"}`}>
              Total {pluralLabel}
            </p>
            <Layers size={15} className={statusFilter === "all" ? "text-indigo-500" : "text-slate-300"} />
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="text-xl font-black tracking-tight text-slate-900">{totalCount}</p>
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
              statusFilter === "all" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : "bg-slate-100 text-slate-500"
            }`}>
              All Records
            </span>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter("active")}
          className={`text-left rounded-2xl border transition-all p-3.5 shadow-sm ${
            statusFilter === "active"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === "active" ? "text-emerald-100" : "text-emerald-600"}`}>
              Active Status
            </p>
            <CheckCircle2 size={15} className={statusFilter === "active" ? "text-white" : "text-emerald-500"} />
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="text-xl font-black tracking-tight">{activeCount}</p>
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
              statusFilter === "active" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            }`}>
              Active
            </span>
          </div>
        </button>

        <button
          onClick={() => setStatusFilter("inactive")}
          className={`text-left rounded-2xl border transition-all p-3.5 shadow-sm ${
            statusFilter === "inactive"
              ? "bg-white text-slate-900 border-rose-400 ring-2 ring-rose-500/10 shadow-md"
              : "bg-white border-slate-200/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === "inactive" ? "text-rose-600" : "text-slate-400"}`}>
              Inactive / Archived
            </p>
            <AlertCircle size={15} className={statusFilter === "inactive" ? "text-rose-500" : "text-slate-300"} />
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <p className="text-xl font-black tracking-tight text-slate-900">{inactiveCount}</p>
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
              statusFilter === "inactive" ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-slate-100 text-slate-500"
            }`}>
              Disabled
            </span>
          </div>
        </button>
      </div>

      {/* Compact Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-indigo-500">{title}</p>
          <h3 className="text-sm font-black tracking-tight text-slate-900">Manage {label} Master</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setEditingId("");
              setForm({
                name: "",
                categoryId: "",
                rate: 0,
                taxCode: "",
                description: "",
                isActive: true,
                createDashboard: true
              });
            }}
            className="rounded-lg bg-slate-900 hover:bg-black px-3.5 py-2 text-white font-bold text-[11px] uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition"
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Cancel" : `Add ${label}`}
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${pluralLabel.toLowerCase()} by name or keyword...`}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg">
          <SlidersHorizontal size={12} className="text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none uppercase cursor-pointer"
          >
            <option value="all">All ({totalCount})</option>
            <option value="active">Active ({activeCount})</option>
            <option value="inactive">Inactive ({inactiveCount})</option>
          </select>
        </div>
      </div>

      <MasterModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId("");
          setForm({
            name: "",
            categoryId: "",
            rate: 0,
            taxCode: "",
            description: "",
            isActive: true,
            createDashboard: true
          });
        }}
        title={editingId ? `Edit ${label}` : `Add New ${label}`}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Update Master" : "Save Master"}
      >
        <div className="grid grid-cols-1 gap-3.5">
          <label className="space-y-1 block">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label} Name *</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500"
              placeholder={`e.g. ${type === "size" ? "XL" : type === "color" ? "Navy Blue" : type === "supplier" ? "Global Tech Supplies" : "Standard"}`}
              required
            />
          </label>

          {type === "subcategory" && (
            <label className="space-y-1 block">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Main Category *</span>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500"
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
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tax Rate (%) *</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500"
                  placeholder="e.g. 18"
                  required
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tax Code</span>
                <input
                  value={form.taxCode}
                  onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500"
                  placeholder="e.g. GST18"
                />
              </label>
            </div>
          )}

          <label className="space-y-1 block">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Notes / Description</span>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500"
              placeholder={`Optional details for this ${label.toLowerCase()}...`}
            />
          </label>

          {type === "category" && (
            <div
              className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-2.5 cursor-pointer"
              onClick={() => setForm((prev) => ({ ...prev, createDashboard: !prev.createDashboard }))}
            >
              <input
                type="checkbox"
                id="createDashboard"
                checked={form.createDashboard !== false}
                onChange={(e) => setForm({ ...form, createDashboard: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded text-indigo-600 border-slate-300 cursor-pointer"
              />
              <div>
                <label htmlFor="createDashboard" className="text-xs font-bold text-slate-900 cursor-pointer block">
                  Auto-Generate Category Analytics Dashboard
                </label>
                <p className="text-[10px] text-slate-500">
                  Maps a dedicated analytics view for this category and its items.
                </p>
              </div>
            </div>
          )}

          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active Status
          </label>
        </div>
      </MasterModal>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Name</th>
                {type === "subcategory" && <th className="px-4 py-2.5">Main Category</th>}
                {type === "tax" && <th className="px-4 py-2.5">Rate (%)</th>}
                {type === "tax" && <th className="px-4 py-2.5">Code</th>}
                <th className="px-4 py-2.5">Created Date</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={type === "subcategory" || type === "tax" ? 6 : 4} className="py-8 text-center text-xs text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={type === "subcategory" || type === "tax" ? 6 : 4} className="py-10 text-center text-xs text-slate-400">
                    {searchQuery || statusFilter !== "all" ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-600">
                          No {pluralLabel.toLowerCase()} found matching your filters
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded-lg uppercase"
                        >
                          Clear Filters
                        </button>
                      </div>
                    ) : (
                      <EmptyState />
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-bold text-slate-900">{item.name}</p>
                      {item.description ? (
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{item.description}</p>
                      ) : null}
                    </td>
                    {type === "subcategory" && (
                      <td className="px-4 py-2.5">
                        <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-100">
                          {categories.find((c) => c._id === item.categoryId)?.name || "Unknown"}
                        </span>
                      </td>
                    )}
                    {type === "tax" && (
                      <td className="px-4 py-2.5">
                        <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          {item.rate !== undefined ? item.rate : item.taxRate || 0}%
                        </span>
                      </td>
                    )}
                    {type === "tax" && (
                      <td className="px-4 py-2.5 text-[11px] font-mono text-slate-600">
                        {item.taxCode || "-"}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-[11px] text-slate-500">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        disabled={busyId === item._id}
                        title="Click to toggle status"
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider transition ${
                          item.isActive !== false
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {item.isActive !== false ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingId(item._id);
                            setForm({
                              name: item.name,
                              categoryId: item.categoryId || "",
                              rate: item.rate !== undefined ? item.rate : item.taxRate || 0,
                              taxCode: item.taxCode || "",
                              description: item.description || "",
                              isActive: item.isActive !== false,
                              createDashboard: item.createDashboard !== false
                            });
                            setShowForm(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>

                        {confirmDeleteId === item._id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(item._id)}
                              disabled={busyId === item._id}
                              className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold uppercase"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(item._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                            title="Delete"
                          >
                            <Trash2 size={13} />
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
      </div>
    </div>
  );
}
