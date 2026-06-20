import { useEffect, useState } from "react";
import { Edit2, Trash2, Plus, X, Save, RefreshCw } from "lucide-react";
import { api } from "../api/client.js";
import EmptyState from "./EmptyState.jsx";

export default function MasterManager({ type, websiteId, title, label }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]); // for subcategory category selection
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({ name: "", categoryId: "", isActive: true });

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
      setForm({ name: "", categoryId: "", isActive: true });
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
    <div className="space-y-6">
      {error ? <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100">{error}</div> : null}
      {success ? <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">{success}</div> : null}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-500">{title}</p>
          <h3 className="text-2xl font-black tracking-tight text-slate-900">Manage {label} Master</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setEditingId("");
            setForm({ name: "", categoryId: "", isActive: true });
          }}
          className="rounded-[24px] bg-slate-900 px-6 py-3 text-white font-black text-[10px] uppercase tracking-[0.22em] shadow-xl flex items-center gap-2 transition-all hover:-translate-y-0.5"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : `Add ${label}`}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="premium-card p-6 bg-white border border-slate-200 rounded-[32px] space-y-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="space-y-2">
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
              <label className="space-y-2">
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
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.isActive} 
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })} 
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Status</span>
            </label>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-3">
            <Save size={16} />
            {editingId ? "Update Master" : "Save Master"}
          </button>
        </form>
      ) : null}

      <div className="premium-card overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm">
        <div className="min-h-0 overflow-x-auto">
          <table className="w-full table-fixed min-w-[700px]">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 w-[35%]">Name</th>
                {type === "subcategory" && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Main Category</th>}
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Created Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={type === "subcategory" ? 5 : 4} className="py-10 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={type === "subcategory" ? 5 : 4} className="py-10 text-center text-[10px] font-black uppercase tracking-widest text-slate-300"><EmptyState /></td></tr>
              ) : items.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-slate-900">{item.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {item._id.slice(-6)}</p>
                  </td>
                  {type === "subcategory" && (
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-600 border border-indigo-100">
                        {categories.find(c => c._id === item.categoryId)?.name || "Unknown"}
                      </span>
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
                          setForm({ name: item.name, categoryId: item.categoryId || "", isActive: item.isActive !== false });
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
