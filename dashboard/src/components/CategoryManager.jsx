import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Check, X, Layers, Tag } from "lucide-react";
import { api } from "../api/client.js";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";

export default function CategoryManager({ websiteId }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  
  const [formData, setFormData] = useState({
    department: "general",
    name: "",
    subcategories: [""]
  });

  const fetchCategories = async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const data = await api(`/api/categories?websiteId=${websiteId}`);
      setCategories(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [websiteId]);

  useEffect(() => {
    setPage(1);
  }, [websiteId, categories.length]);

  const handleAddSub = () => {
    setFormData(prev => ({ ...prev, subcategories: [...prev.subcategories, ""] }));
  };

  const handleRemoveSub = (index) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index)
    }));
  };

  const handleSubChange = (index, value) => {
    const newSubs = [...formData.subcategories];
    newSubs[index] = value;
    setFormData(prev => ({ ...prev, subcategories: newSubs }));
  };

  const handleEdit = (cat) => {
    setEditingId(cat._id);
    setFormData({
      department: cat.department || "general",
      name: cat.name,
      subcategories: cat.subcategories.length > 0 ? [...cat.subcategories] : [""]
    });
    setIsAdding(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        websiteId,
        subcategories: formData.subcategories.filter(s => s.trim() !== "")
      };

      if (editingId) {
        await api(`/api/categories/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await api("/api/categories", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      setIsAdding(false);
      setEditingId(null);
      setFormData({ department: "general", name: "", subcategories: [""] });
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!websiteId) {
    return (
      <div className="p-20 text-center bg-slate-50 dark:bg-white/5 rounded-[40px] border-2 border-dashed border-slate-100 dark:border-white/5">
        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
           <Layers className="text-slate-300" size={32} />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Select an ecosystem asset to manage categories</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="heading-md dark:text-white">Taxonomy Control</h3>
          <p className="small-label dark:text-slate-500">Define ticket classifications and sub-tiers for this domain.</p>
        </div>
        <button
          onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            setFormData({ department: "general", name: "", subcategories: [""] });
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95"
        >
          {isAdding ? <X size={16} /> : <Plus size={16} />}
          {isAdding ? "Cancel" : "Add Category"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="premium-card p-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 animate-in zoom-in-95 duration-500">
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="small-label dark:text-slate-400">Department</label>
              <input
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value.toLowerCase() })}
                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-xs font-black focus:border-indigo-500/50 outline-none transition-all dark:text-white"
                placeholder="e.g. technical / billing / sales"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="small-label dark:text-slate-400">Primary Category Name</label>
              <input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 text-xs font-black focus:border-indigo-500/50 outline-none transition-all dark:text-white"
                placeholder="e.g. Technical Support"
                required
              />
            </div>

            <div className="space-y-4">
              <label className="small-label dark:text-slate-400">Sub-Categories</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.subcategories.map((sub, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={sub}
                      onChange={e => handleSubChange(idx, e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-black/10 border border-slate-100 dark:border-white/5 rounded-xl px-5 py-3 text-[11px] font-bold outline-none focus:border-indigo-500/30 dark:text-slate-300"
                      placeholder={`Subcategory ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSub(idx)}
                      className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddSub}
                className="w-full py-4 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl text-[10px] font-black text-slate-400 hover:border-indigo-200 hover:text-indigo-500 transition-all uppercase tracking-widest"
              >
                + Add Sub-tier
              </button>
            </div>

            <button type="submit" className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3">
              <Check size={18} /> {editingId ? "Update Taxonomy" : "Save Category"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
           <div className="col-span-full py-20 text-center opacity-30">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
           </div>
        ) : getPaginationMeta(categories, page).pageItems.map(cat => (
          <div key={cat._id} className="premium-card p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 hover:border-indigo-100 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <Tag size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{cat.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cat.department || "general"} department</p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(cat)}
                  className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  <Edit2 size={14} />
                </button>
                <button 
                  onClick={() => handleDelete(cat._id)}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest">
                {cat.department || "general"}
              </span>
              {cat.subcategories?.map((sub, i) => (
                <span key={i} className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-lg border border-slate-100 dark:border-white/5">
                  {sub}
                </span>
              ))}
              {cat.subcategories?.length === 0 && (
                <span className="text-[9px] font-black text-slate-300 uppercase italic">No sub-levels defined</span>
              )}
            </div>
          </div>
        ))}
        {!loading && categories.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-30">
            <p className="text-[10px] font-black uppercase tracking-[.3em]">Structural Void Detected</p>
          </div>
        )}
      </div>
      {!loading && (
        <PaginationControls
          currentPage={getPaginationMeta(categories, page).currentPage}
          totalPages={getPaginationMeta(categories, page).totalPages}
          totalItems={getPaginationMeta(categories, page).totalItems}
          itemLabel="categories"
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
