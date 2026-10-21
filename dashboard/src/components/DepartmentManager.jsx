import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { 
  Layers, 
  Users, 
  Tag, 
  Plus, 
  Edit2, 
  Power, 
  RotateCcw, 
  Save, 
  X, 
  Search, 
  Check, 
  Building2,
  FolderTree,
  UserCheck
} from "lucide-react";
import { api } from "../api/client.js";
import { useDataSync } from "../hooks/useDataSync.js";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";

function normalizeDepartmentName(value) {
  return String(value || "").trim().toLowerCase();
}

export default function DepartmentManager({ websiteId }) {
  const [categories, setCategories] = useState([]);
  const [people, setPeople] = useState([]);
  const [departmentRecords, setDepartmentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [formName, setFormName] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const toggleCategorySelection = (categoryId) => {
    setSelectedCategoryIds((prev) => (
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    ));
  };

  const load = async () => {
    if (!websiteId) {
      setCategories([]);
      setPeople([]);
      setDepartmentRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [cats, users, deps] = await Promise.all([
        api(`/api/categories?websiteId=${websiteId}`),
        api(`/api/users/agents?websiteId=${websiteId}`),
        api(`/api/departments?websiteId=${websiteId}`)
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setPeople(Array.isArray(users) ? users : []);
      setDepartmentRecords(Array.isArray(deps) ? deps : []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load department structure.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [websiteId]);

  useDataSync({
    entities: ["department", "category", "user"],
    websiteId,
    onSync: () => load()
  });

  // Modal scroll lock & Escape key
  useEffect(() => {
    if (showForm) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") resetForm();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = orig;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showForm]);

  const departments = useMemo(() => {
    const grouped = new Map();

    for (const department of departmentRecords) {
      const key = normalizeDepartmentName(department.name || "general");
      grouped.set(key, {
        key,
        recordId: department._id,
        isActive: department.isActive !== false,
        categories: [],
        people: []
      });
    }

    for (const category of categories) {
      const key = normalizeDepartmentName(category.department || "general");
      if (!grouped.has(key)) {
        grouped.set(key, { key, recordId: null, isActive: true, categories: [], people: [] });
      }
      grouped.get(key).categories.push(category);
    }

    for (const person of people) {
      const hasWebsite = (person.websiteIds || []).some((website) => String(website._id || website) === String(websiteId));
      if (!hasWebsite) continue;
      const key = normalizeDepartmentName(person.department || "general");
      if (!grouped.has(key)) {
        grouped.set(key, { key, recordId: null, isActive: true, categories: [], people: [] });
      }
      grouped.get(key).people.push(person);
    }

    return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [categories, people, departmentRecords, websiteId]);

  // Search & Status filtering
  const filteredDepartments = useMemo(() => {
    return departments.filter(dep => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = 
        !q ||
        dep.key.includes(q) ||
        dep.categories.some(c => c.name?.toLowerCase().includes(q)) ||
        dep.people.some(p => p.name?.toLowerCase().includes(q));

      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "active" && dep.isActive) ||
        (statusFilter === "disabled" && !dep.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [departments, searchQuery, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, websiteId, departments.length]);

  const resetForm = () => {
    setShowForm(false);
    setEditingDepartment(null);
    setFormName("");
    setSelectedCategoryIds([]);
  };

  const handleCreate = () => {
    setEditingDepartment(null);
    setFormName("");
    setSelectedCategoryIds([]);
    setShowForm(true);
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setFormName(department.key);
    setSelectedCategoryIds((department.categories || []).map((category) => category._id));
    setShowForm(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    const name = normalizeDepartmentName(formName);
    if (!name || !websiteId) return;
    setSaving(true);
    setError("");
    try {
      const previousDepartmentName = editingDepartment?.key || null;
      if (editingDepartment?.recordId) {
        await api(`/api/departments/${editingDepartment.recordId}`, {
          method: "PATCH",
          body: JSON.stringify({ name })
        });
      } else {
        await api("/api/departments", {
          method: "POST",
          body: JSON.stringify({ name, websiteId })
        });
      }

      const categoriesToMoveIntoDepartment = categories.filter((category) => selectedCategoryIds.includes(category._id));
      const categoriesToRemoveFromDepartment = categories.filter((category) => {
        if (!previousDepartmentName) return false;
        return normalizeDepartmentName(category.department) === previousDepartmentName && !selectedCategoryIds.includes(category._id);
      });

      await Promise.all([
        ...categoriesToMoveIntoDepartment.map((category) => (
          api(`/api/categories/${category._id}`, {
            method: "PATCH",
            body: JSON.stringify({ department: name })
          })
        )),
        ...categoriesToRemoveFromDepartment.map((category) => (
          api(`/api/categories/${category._id}`, {
            method: "PATCH",
            body: JSON.stringify({ department: "general" })
          })
        ))
      ]);

      setSuccess(editingDepartment ? "Department updated successfully." : "Department created successfully.");
      setTimeout(() => setSuccess(""), 2500);
      resetForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDepartment = async (department) => {
    if (!department.recordId) {
      setError("Create this department record first before disabling it.");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/departments/${department.recordId}/toggle`, { method: "PATCH" });
      setSuccess(department.isActive ? "Department disabled successfully." : "Department reactivated successfully.");
      setTimeout(() => setSuccess(""), 2500);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
          Select a website above to configure departments and ticket routing
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* ── Control Header Bar ───────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-xs text-white shrink-0">
            <Building2 size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Department Routing
              </h3>
              <span className="px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 text-[8px] font-black rounded-md uppercase">
                {departments.length} {departments.length === 1 ? "Department" : "Departments"}
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Manage ticket routing, linked categories, and assigned support staff
            </p>
          </div>
        </div>

        {/* Filter, Search & Add Department */}
        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer shrink-0 focus:border-indigo-400"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="disabled">Disabled Only</option>
          </select>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-44">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search departments..."
              className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-medium text-slate-700 dark:text-slate-200 outline-none focus:bg-white focus:border-indigo-400 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Add Department Button */}
          <button
            type="button"
            onClick={handleCreate}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus size={13} />
            Add Department
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-bold border border-rose-100 dark:border-rose-900/40">
          {error}
        </div>
      )}

      {success && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/40">
          {success}
        </div>
      )}

      {/* ── Compact Department Cards Grid ────────────────────── */}
      {(() => {
        const pagination = getPaginationMeta(filteredDepartments, page, 16);
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Loading departments...</p>
          </div>
        ) : pagination.pageItems.map((department) => (
          <div
            key={department.key}
            className={`bg-white dark:bg-slate-900 border rounded-2xl p-3.5 hover:shadow-md transition-all group flex flex-col justify-between ${
              department.isActive 
                ? "border-slate-200/80 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/40" 
                : "border-amber-200/80 dark:border-amber-900/40 bg-amber-50/10 dark:bg-amber-950/10 opacity-80"
            }`}
          >
            <div>
              {/* Top Row: Icon + Name + Actions */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
                    <Layers size={14} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {department.key}
                    </h4>
                    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider">
                      <span className={`w-1.5 h-1.5 rounded-full ${department.isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span className={department.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                        {department.isActive ? "Active" : "Disabled"}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(department)}
                    title="Edit Department"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-all cursor-pointer"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDepartment(department)}
                    disabled={saving}
                    title={department.isActive ? "Disable Department" : "Reactivate Department"}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      department.isActive
                        ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    }`}
                  >
                    {department.isActive ? <Power size={12} /> : <RotateCcw size={12} />}
                  </button>
                </div>
              </div>

              {/* Compact Inline Stats */}
              <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-center">
                  <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Categories</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{department.categories.length}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-center">
                  <p className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest">Staff</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{department.people.length}</p>
                </div>
              </div>

              {/* Linked Categories List */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Category Map ({department.categories.length})
                  </span>
                </div>
                {department.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {department.categories.slice(0, 3).map((category) => (
                      <span 
                        key={category._id} 
                        className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-[8px] font-bold rounded border border-indigo-100 dark:border-indigo-900/40 truncate max-w-[110px]"
                      >
                        {category.name}
                      </span>
                    ))}
                    {department.categories.length > 3 && (
                      <span 
                        title={department.categories.slice(3).map(c => c.name).join(", ")}
                        className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200 text-[8px] font-black rounded cursor-help"
                      >
                        +{department.categories.length - 3}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[8px] font-medium text-slate-300 dark:text-slate-600 italic">
                    No categories linked yet
                  </span>
                )}
              </div>

              {/* Assigned Staff Avatars / List */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Assigned Staff ({department.people.length})
                  </span>
                </div>
                {department.people.length > 0 ? (
                  <div className="space-y-1">
                    {department.people.slice(0, 2).map((person) => (
                      <div key={person._id} className="flex items-center justify-between p-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-[9px] font-black text-slate-700 dark:text-slate-300 shrink-0">
                            {person.name?.[0]?.toUpperCase() || "U"}
                          </div>
                          <p className="text-[9px] font-bold text-slate-800 dark:text-slate-200 truncate">{person.name}</p>
                        </div>
                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider shrink-0 pr-1">
                          {person.role}
                        </span>
                      </div>
                    ))}
                    {department.people.length > 2 && (
                      <p 
                        title={department.people.slice(2).map(p => `${p.name} (${p.role})`).join("\n")}
                        className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 cursor-help pt-0.5 pl-1"
                      >
                        +{department.people.length - 2} more staff members
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-[8px] font-medium text-slate-300 dark:text-slate-600 italic">
                    No staff assigned yet
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {!loading && filteredDepartments.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
            <Layers size={20} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {searchQuery || statusFilter !== "all" ? "No matching departments found" : "No Departments Registered"}
            </p>
            <p className="text-[9px] font-medium text-slate-400 mt-0.5">
              {searchQuery || statusFilter !== "all" ? "Try adjusting your search query or status filter." : "Click Add Department to configure your organization's routing structure."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredDepartments.length > 0 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={16}
          itemLabel="departments"
          onPageChange={setPage}
        />
      )}
          </>
        );
      })()}

      {/* ── Compact Add/Edit Department Modal via createPortal ── */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto p-2 sm:p-4 md:p-6 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity" 
            onClick={resetForm} 
          />
          <div className="relative z-10 my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10">
            
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shadow-xs text-white shrink-0">
                  <Building2 size={13} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {editingDepartment ? "Modify Department Routing" : "Configure Department"}
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    Manage department name and category linkages
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={resetForm} 
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={submitForm} className="p-4 space-y-3.5 overflow-y-auto max-h-[calc(90vh-110px)] custom-scrollbar">
              {/* Department Name */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                  Department Name
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. technical / billing / sales"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none transition-all dark:text-white placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Linked Categories Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    Assign Categories ({selectedCategoryIds.length} Selected)
                  </label>
                  <span className="text-[8px] font-medium text-slate-400">Click to toggle</span>
                </div>
                
                <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-2.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {categories.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((category) => {
                        const isSelected = selectedCategoryIds.includes(category._id);
                        const currentDepartment = normalizeDepartmentName(category.department || "general");
                        const targetDepartment = normalizeDepartmentName(formName || editingDepartment?.key || "");
                        return (
                          <button
                            key={category._id}
                            type="button"
                            onClick={() => toggleCategorySelection(category._id)}
                            className={`px-2.5 py-1.5 rounded-xl border text-[9px] font-bold transition-all text-left cursor-pointer ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                                : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
                            }`}
                          >
                            <span className="block truncate max-w-[130px]">{category.name}</span>
                            <span className={`block text-[7.5px] font-black uppercase tracking-wider mt-0.5 ${
                              isSelected
                                ? "text-indigo-200"
                                : currentDepartment === targetDepartment
                                  ? "text-emerald-500"
                                  : "text-slate-400"
                            }`}>
                              {currentDepartment === targetDepartment ? "Current" : currentDepartment}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[9px] font-medium text-slate-400 text-center py-2">
                      No categories registered for this domain yet.
                    </p>
                  )}
                </div>
                <p className="text-[8px] font-medium text-slate-400">
                  Selected categories will automatically route to this department.
                </p>
              </div>

              {/* Submit & Cancel Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Save size={13} />
                  {editingDepartment ? "Update Department" : "Save Department"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
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
