import { useEffect, useMemo, useState } from "react";
import { Layers, Users, Tag, Plus, Edit2, Power, RotateCcw, Save, X } from "lucide-react";
import { api } from "../api/client.js";

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
      const [categoryData, peopleData, departmentData] = await Promise.all([
        api(`/api/categories?websiteId=${websiteId}`),
        api("/api/users/agents"),
        api(`/api/departments?websiteId=${websiteId}`)
      ]);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setPeople(Array.isArray(peopleData) ? peopleData : []);
      setDepartmentRecords(Array.isArray(departmentData) ? departmentData : []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [websiteId]);

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
      <div className="p-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <Layers className="text-slate-300" size={32} />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Select a website to manage departments</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 animate-pulse text-slate-400 font-black uppercase text-[10px] tracking-widest">Loading departments...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="heading-md">Department Routing</h3>
          <p className="small-label">Client can add, rename, and disable departments for this website.</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 flex items-center gap-2 transition-all"
        >
          <Plus size={14} />
          Add Department
        </button>
      </div>

      {showForm ? (
        <form onSubmit={submitForm} className="premium-card p-6 bg-white border border-slate-100 space-y-5">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Department Name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="technical / billing / sales"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categories</label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const isSelected = selectedCategoryIds.includes(category._id);
                    const currentDepartment = normalizeDepartmentName(category.department || "general");
                    const targetDepartment = normalizeDepartmentName(formName || editingDepartment?.key || "");
                    return (
                      <button
                        key={category._id}
                        type="button"
                        onClick={() => toggleCategorySelection(category._id)}
                        className={`px-3 py-2 rounded-xl border text-[10px] font-black transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                            : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/40"
                        }`}
                      >
                        <span className="block">{category.name}</span>
                        <span className={`block mt-1 text-[8px] font-black uppercase tracking-widest ${
                          isSelected
                            ? "text-indigo-100"
                            : currentDepartment === targetDepartment
                              ? "text-emerald-500"
                              : "text-slate-300"
                        }`}>
                          {currentDepartment === targetDepartment ? "Current department" : currentDepartment}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] font-bold text-slate-400">No categories available for this website yet.</p>
              )}
            </div>
            <p className="text-[10px] font-bold text-slate-400">
              Select the categories that should belong to this department.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2"
            >
              <X size={13} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={13} />
              {editingDepartment ? "Update Department" : "Create Department"}
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
          {success}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {departments.map((department) => (
          <section
            key={department.key}
            className={`premium-card p-8 bg-white border transition-all ${department.isActive ? "border-slate-100" : "border-amber-200 opacity-80"}`}
          >
            <div className="flex items-center justify-between mb-6 gap-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Department</p>
                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-1">{department.key}</h4>
                <p className={`text-[9px] font-black uppercase tracking-widest mt-2 ${department.isActive ? "text-emerald-500" : "text-amber-500"}`}>
                  {department.isActive ? "Active" : "Disabled"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(department)}
                  className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-all"
                  title="Edit department"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleDepartment(department)}
                  disabled={saving}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    department.isActive
                      ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  }`}
                  title={department.isActive ? "Disable department" : "Reactivate department"}
                >
                  {department.isActive ? <Power size={16} /> : <RotateCcw size={16} />}
                </button>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers size={20} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Categories</p>
                <p className="text-2xl font-black text-slate-900 mt-2">{department.categories.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Staff</p>
                <p className="text-2xl font-black text-slate-900 mt-2">{department.people.length}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Category Map</p>
                <div className="flex flex-wrap gap-2">
                  {department.categories.length > 0 ? department.categories.map((category) => (
                    <span key={category._id} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100">
                      <Tag size={10} className="inline mr-1" />
                      {category.name}
                    </span>
                  )) : (
                    <span className="text-[10px] font-bold text-slate-300">No categories linked yet</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Assigned Staff</p>
                <div className="space-y-2">
                  {department.people.length > 0 ? department.people.map((person) => (
                    <div key={person._id} className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-700 font-black">
                          {person.name?.[0] || "U"}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{person.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{person.role}</p>
                        </div>
                      </div>
                      <Users size={14} className="text-slate-300" />
                    </div>
                  )) : (
                    <span className="text-[10px] font-bold text-slate-300">No staff assigned yet</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
