import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Layers, 
  Tag, 
  Search, 
  FolderTree, 
  Sparkles,
  BarChart2
} from "lucide-react";
import { api } from "../api/client.js";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { useDataSync } from "../hooks/useDataSync.js";

export default function CategoryManager({ websiteId }) {
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  
  const [formData, setFormData] = useState({
    department: "general",
    name: "",
    subcategories: [""],
    createDashboard: true
  });

  const fetchCategories = async () => {
    if (!websiteId) return;
    setLoading(true);
    try {
      const [categoriesData, departmentsData] = await Promise.all([
        api(`/api/categories?websiteId=${websiteId}`),
        api(`/api/departments?websiteId=${websiteId}`)
      ]);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [websiteId]);

  useDataSync({
    entities: ["category", "department", "master"],
    websiteId,
    onSync: () => fetchCategories()
  });

  // Modal scroll lock & Escape key
  useEffect(() => {
    if (isAdding) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setIsAdding(false);
          setEditingId(null);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = orig;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isAdding]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = 
        !q ||
        cat.name?.toLowerCase().includes(q) ||
        cat.department?.toLowerCase().includes(q) ||
        cat.subcategories?.some(s => s && s.toLowerCase().includes(q));
      
      const matchesDept = deptFilter === "all" || (cat.department || "general") === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [categories, searchQuery, deptFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, deptFilter, websiteId, categories.length]);

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
      name: cat.name || "",
      subcategories: cat.subcategories && cat.subcategories.length > 0 ? [...cat.subcategories] : [""],
      createDashboard: typeof cat.createDashboard !== "undefined" ? cat.createDashboard : true
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
      setFormData({ department: "general", name: "", subcategories: [""], createDashboard: true });
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
      <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 my-4">
        <div className="w-10 h-10 bg-indigo-50 dark:bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-xs text-indigo-600 dark:text-indigo-400">
          <Layers size={18} />
        </div>
        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
          Select an ecosystem website
        </p>
        <p className="text-[9px] font-medium text-slate-400 mt-0.5">
          Choose a domain above to configure ticket taxonomy & categories
        </p>
      </div>
    );
  }

  const pagination = getPaginationMeta(filteredCategories, page, 16);

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* ── Control Header Bar ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs text-white shrink-0">
            <FolderTree size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Taxonomy Control
              </h3>
              <span className="px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 text-[8px] font-black rounded-md uppercase">
                {categories.length} {categories.length === 1 ? "Category" : "Categories"}
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Define ticket classifications and sub-tiers for efficient triaging
            </p>
          </div>
        </div>

        {/* Filter, Search & Add Category */}
        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          {/* Department Filter Dropdown */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer shrink-0 focus:border-indigo-400"
          >
            <option value="all">All Departments</option>
            <option value="general">general</option>
            {departments.map(d => (
              <option key={d._id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-44">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search taxonomy..."
              className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-medium text-slate-700 dark:text-slate-200 outline-none focus:bg-white focus:border-indigo-400 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Add Category Button */}
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setFormData({ department: "general", name: "", subcategories: [""], createDashboard: true });
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus size={13} />
            Add Category
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-bold border border-rose-100 dark:border-rose-900/40">
          {error}
        </div>
      )}

      {/* ── Compact Cards Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Loading taxonomy...</p>
          </div>
        ) : pagination.pageItems.map(cat => (
          <div 
            key={cat._id} 
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              {/* Top Row: Icon + Title + Actions */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
                    <Tag size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {cat.name}
                    </h4>
                    <span className="inline-block text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                      {cat.department || "general"} Dept
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button 
                    onClick={() => handleEdit(cat)}
                    title="Edit Category"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-all cursor-pointer"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    onClick={() => handleDelete(cat._id)}
                    title="Delete Category"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Badges: Department & Auto-Dashboard */}
              <div className="flex flex-wrap items-center gap-1 mb-2.5">
                <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[8px] font-black rounded uppercase tracking-wider">
                  {cat.department || "general"}
                </span>
                {cat.createDashboard && (
                  <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-300 text-[8px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                    <BarChart2 size={10} className="text-emerald-500" />
                    Dashboard
                  </span>
                )}
              </div>

              {/* Sub-tiers preview */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Sub-Tiers ({cat.subcategories?.length || 0})
                  </span>
                </div>
                {cat.subcategories && cat.subcategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {cat.subcategories.slice(0, 3).map((sub, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[9px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                        {sub}
                      </span>
                    ))}
                    {cat.subcategories.length > 3 && (
                      <span 
                        title={cat.subcategories.slice(3).join(", ")}
                        className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-[8px] font-black text-indigo-600 dark:text-indigo-300 cursor-help"
                      >
                        +{cat.subcategories.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[9px] font-medium text-slate-300 dark:text-slate-600 italic">
                    No sub-levels defined
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {!loading && filteredCategories.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
            <Tag size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {searchQuery || deptFilter !== "all" ? "No matching categories found" : "No Categories Registered"}
            </p>
            <p className="text-[9px] font-medium text-slate-400 mt-0.5">
              {searchQuery || deptFilter !== "all" ? "Try adjusting your search query or department filter." : "Click Add Category to create your first ticket classification."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredCategories.length > 0 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={16}
          itemLabel="categories"
          onPageChange={setPage}
        />
      )}

      {/* ── Compact Add/Edit Category Modal via createPortal to document.body ── */}
      {isAdding && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto p-2 sm:p-4 md:p-6 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity" 
            onClick={() => { setIsAdding(false); setEditingId(null); }} 
          />
          <div className="relative z-10 my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
            
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-xs text-white shrink-0">
                  <Tag size={13} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingId ? "Modify Taxonomy Category" : "Add Ticket Classification"}
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    Department routing and sub-tier classification
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { setIsAdding(false); setEditingId(null); }} 
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto max-h-[calc(90vh-110px)] custom-scrollbar">
              {/* Department */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none transition-all dark:text-white cursor-pointer"
                  required
                >
                  <option value="general">general</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Primary Category Name */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  Category Name
                </label>
                <input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                  placeholder="e.g. Technical Support, Billing Inquiry"
                  required
                />
              </div>

              {/* Sub-Categories */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Sub-Tiers ({formData.subcategories.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSub}
                    className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline cursor-pointer"
                  >
                    + Add Sub-tier
                  </button>
                </div>
                
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {formData.subcategories.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        value={sub}
                        onChange={e => handleSubChange(idx, e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-[11px] font-medium outline-none focus:border-indigo-500 transition-all dark:text-slate-200 placeholder:text-slate-400"
                        placeholder={`Subcategory ${idx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSub(idx)}
                        disabled={formData.subcategories.length === 1 && !sub}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-Generate Dashboard Checkbox */}
              <div 
                className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2.5 cursor-pointer select-none" 
                onClick={() => setFormData(prev => ({ ...prev, createDashboard: !prev.createDashboard }))}
              >
                <input
                  type="checkbox"
                  id="createDashboard"
                  checked={formData.createDashboard}
                  onChange={e => setFormData({ ...formData, createDashboard: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-white/20 cursor-pointer"
                />
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="createDashboard" className="text-[10px] font-black text-slate-900 dark:text-white cursor-pointer uppercase tracking-tight">
                      Auto-Generate Category Analytics Dashboard
                    </label>
                    <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[7px] font-black uppercase tracking-wider flex items-center gap-0.5">
                      <Sparkles size={8} /> Recommended
                    </span>
                  </div>
                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    Automatically builds & maps a dedicated analytics dashboard for this category and all its mapped items.
                  </p>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Check size={13} /> {editingId ? "Synchronize Category" : "Save Category"}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setIsAdding(false); setEditingId(null); }} 
                  className="px-4 py-2.5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
