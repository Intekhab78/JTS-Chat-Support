import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  UserPlus, Mail, Shield, Activity, Search, Trash2, Settings, BarChart2,
  CheckCircle2, X, Globe, Layers, Check, AlertCircle, Lock, UserCheck,
  Building2, Tag, RefreshCw
} from "lucide-react";
import { api } from "../api/client.js";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { useDataSync } from "../hooks/useDataSync.js";

export default function AgentManager({ websiteId = "" }) {
  const [agents, setAgents] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState(["general"]);
  const [loading, setLoading] = useState(true);
  const [dynamicRoles, setDynamicRoles] = useState([]);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const formRef = useRef(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    department: "general",
    assignedCategories: [],
    websiteIds: []
  });

  const toggleMultiValue = (field, value) => {
    setFormData((prev) => {
      const currentValues = Array.isArray(prev[field]) ? prev[field] : [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return { ...prev, [field]: nextValues };
    });
  };

  const fetchAgents = async () => {
    try {
      const url = websiteId ? `/api/users/agents?websiteId=${websiteId}` : "/api/users/agents";
      const [agentData, websiteData, roleData] = await Promise.all([
        api(url),
        api("/api/websites"),
        api("/api/roles")
      ]);
      setAgents(Array.isArray(agentData) ? agentData : []);
      setWebsites(Array.isArray(websiteData) ? websiteData : []);
      setDynamicRoles(roleData?.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [websiteId]);

  useDataSync({
    entities: ["user", "agent"],
    websiteId,
    onSync: () => fetchAgents()
  });

  useEffect(() => {
    async function loadCategoriesForWebsites() {
      if (!formData.websiteIds.length) {
        setCategoryOptions([]);
        setDepartmentOptions(["general"]);
        return;
      }
      try {
        const categorySets = await Promise.all(
          formData.websiteIds.map((webId) => api(`/api/categories?websiteId=${webId}`))
        );
        const merged = [];
        const seen = new Set();
        const departments = new Set(["general"]);
        for (const categoryList of categorySets) {
          for (const category of categoryList || []) {
            const key = String(category.name || "").trim().toLowerCase();
            if (!key || seen.has(key)) continue;
            seen.add(key);
            merged.push({ label: category.name, value: key });
            if (category.department) {
              departments.add(String(category.department).trim().toLowerCase());
            }
          }
        }
        setCategoryOptions(merged);
        const nextDepartments = [...departments].sort((a, b) => a.localeCompare(b));
        setDepartmentOptions(nextDepartments);
        setFormData((prev) => {
          if (!prev.department || nextDepartments.includes(prev.department)) {
            return prev;
          }
          return { ...prev, department: "general" };
        });
      } catch (err) {
        setError(err.message);
      }
    }
    loadCategoriesForWebsites();
  }, [formData.websiteIds]);

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", email: "", password: "", role: "", department: "general", assignedCategories: [], websiteIds: [] });
    setCategoryOptions([]);
    setDepartmentOptions(["general"]);
  };

  const handleEdit = (agent) => {
    setError("");
    setEditingId(agent._id);
    setFormData({
      name: agent.name || "",
      email: agent.email || "",
      password: "",
      role: agent.role || "agent",
      department: agent.department || "general",
      assignedCategories: agent.assignedCategories || [],
      websiteIds: (agent.websiteIds || []).map((website) => typeof website === "string" ? website : website._id)
    });
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to completely revoke this agent's clearance and delete them?")) return;
    try {
      await api(`/api/users/agents/${id}`, { method: "DELETE" });
      fetchAgents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;
      
      if (editingId) {
        await api(`/api/users/agents/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await api("/api/users/agents", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      handleCancel();
      fetchAgents();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredAgents = useMemo(() => {
    return agents.filter(agent => 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.role && agent.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (agent.department && agent.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [agents, searchTerm]);

  const pageSize = 12;
  const paginatedAgents = getPaginationMeta(filteredAgents, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, agents.length]);

  const onlineCount = agents.filter(a => a.isOnline).length;
  const readyCount = agents.filter(a => a.isAvailable).length;

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw size={14} className="animate-spin text-indigo-500" />
        <span>Synchronizing personnel command directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      
      {/* ── Compact Executive Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Shield size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Team Personnel Command</span>
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20">
              {filteredAgents.length} Agents
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            Manage security-cleared support personnel, roles, and routing assignments.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Quick Stats Pill */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/5 text-[9.5px] font-bold">
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{onlineCount} Online</span>
            </div>
            <div className="w-px h-3 bg-slate-200 dark:bg-white/10" />
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span>{readyCount} Ready</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name, email, role..."
              className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-lg pl-7 pr-6 py-1 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 w-44 sm:w-56 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={10} />
              </button>
            )}
          </div>

          {/* Add Personnel Button */}
          <button 
            onClick={() => {
              if (isAdding) handleCancel();
              else {
                setError("");
                setIsAdding(true);
              }
            }}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10.5px] uppercase tracking-wider rounded-lg transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <UserPlus size={12} />
            <span>Add Personnel</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={13} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── High-Density 4-Column Agent Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
        {paginatedAgents.pageItems.map((agent) => {
          const initials = (agent.name || "Agent")
            .split(" ")
            .map(n => n[0])
            .join("")
            .slice(0, 3)
            .toUpperCase();

          return (
            <div
              key={agent._id}
              className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 hover:border-indigo-400/50 dark:hover:border-indigo-500/30 transition-all shadow-xs hover:shadow-md flex flex-col justify-between space-y-2 group"
            >
              {/* Header: Avatar, Info, Status & Actions */}
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-900 to-indigo-950 dark:from-slate-800 dark:to-indigo-900 text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-xs border border-white/10 group-hover:bg-indigo-600 transition-colors">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase truncate tracking-tight leading-snug">
                        {agent.name}
                      </h4>
                      <p className="text-[9.5px] text-slate-400 truncate flex items-center gap-1 font-medium">
                        <Mail size={9} className="shrink-0" />
                        <span className="truncate">{agent.email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider ${
                        agent.isOnline
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      }`}
                    >
                      {agent.isOnline ? "Online" : "Offline"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEdit(agent)}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                      title="Edit Personnel"
                    >
                      <Settings size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(agent._id)}
                      className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                      title="Revoke Clearance"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* 3-Cell Metrics Strip */}
                <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-800/40 p-1.5 rounded-lg border border-slate-100 dark:border-white/5 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 block leading-none">Role</span>
                    <p className="text-[9.5px] font-black text-slate-900 dark:text-white truncate capitalize">
                      {agent.role || "agent"}
                    </p>
                  </div>
                  <div className="space-y-0.5 border-x border-slate-200/60 dark:border-white/5 px-1">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 block leading-none">Workload</span>
                    <p className="text-[9.5px] font-black text-slate-900 dark:text-white flex items-center justify-center gap-0.5">
                      <span className={agent.activeChats > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}>
                        {agent.activeChats || 0}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">/</span>
                      <span className="text-slate-400">{agent.maxWorkload || 5}</span>
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 block leading-none">Status</span>
                    <div className="flex items-center justify-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${agent.isAvailable ? 'bg-emerald-500 shadow-xs' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <span className="text-[9px] font-black uppercase text-slate-900 dark:text-white">
                        {agent.isAvailable ? 'Ready' : 'Standby'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Department & Categories */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-1">
                      <Building2 size={9} /> Department: <strong className="text-slate-700 dark:text-slate-200">{agent.department || "general"}</strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {agent.assignedCategories?.length > 0 ? (
                      agent.assignedCategories.map((cat) => (
                        <span
                          key={cat}
                          className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[8px] font-black uppercase tracking-wider border border-emerald-200/50 dark:border-emerald-500/20"
                        >
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="text-[8.5px] font-medium text-slate-400 italic">No categories mapped</span>
                    )}
                  </div>
                </div>

                {/* Assigned Websites */}
                <div className="space-y-1 pt-0.5">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Globe size={9} /> Websites:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {agent.websiteIds?.length > 0 ? (
                      agent.websiteIds.map((web) => (
                        <span
                          key={web._id || web}
                          className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[8px] font-black uppercase tracking-wider border border-indigo-200/50 dark:border-indigo-500/20"
                        >
                          {web.websiteName || web}
                        </span>
                      ))
                    ) : (
                      <span className="text-[8.5px] font-medium text-slate-400 italic">All tenant websites</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Action Bar */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleEdit(agent)}
                  className="flex-1 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 text-[9.5px] font-black uppercase tracking-wider transition-colors border border-indigo-200/60 dark:border-indigo-500/20 text-center"
                >
                  Edit Access
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(agent._id)}
                  className="px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 text-[9.5px] font-black uppercase tracking-wider transition-colors border border-red-200/60 dark:border-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {filteredAgents.length === 0 && (
          <div className="col-span-full py-16 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-center space-y-2">
            <Activity size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">No personnel found</p>
            <p className="text-[10px] text-slate-400">Click "+ Add Personnel" above to create an agent account.</p>
          </div>
        )}
      </div>

      {/* ── Compact Pagination Controls ── */}
      {paginatedAgents.totalPages > 1 && (
        <PaginationControls
          currentPage={paginatedAgents.currentPage}
          totalPages={paginatedAgents.totalPages}
          totalItems={paginatedAgents.totalItems}
          itemLabel="personnel"
          onPageChange={setPage}
        />
      )}

      {/* ── Add / Edit Personnel Modal via createPortal to document.body ── */}
      {isAdding && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 my-auto space-y-3.5 animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <UserPlus size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {editingId ? "Update Personnel Clearance" : "Create Support Personnel"}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {editingId
                      ? "Modify role, website scope, department, and category routing."
                      : "Create a new agent account with scoped access and routing credentials."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={14} />
              </button>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Identity Name</span>
                  <span className="text-[8.5px] text-indigo-500 font-bold">Required</span>
                </label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Secure Email</span>
                  <span className="text-[8.5px] text-indigo-500 font-bold">Required</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  placeholder="agent@company.com"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Access Password</span>
                  <span className="text-[8.5px] text-slate-400 font-bold">{editingId ? 'Optional (leave blank)' : 'Required'}</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  placeholder={editingId ? "••••••••" : "Create password"}
                  required={!editingId}
                />
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Role Clearance</span>
                  <span className="text-[8.5px] text-indigo-500 font-bold">Required</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">Select a role...</option>
                  {dynamicRoles.filter(r => r.isActive).map(role => (
                    <option key={role._id} value={role.name.toLowerCase()}>{role.name}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Department Routing</span>
                  <span className="text-[8.5px] text-slate-400">Determined from website categories</span>
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  disabled={!formData.websiteIds.length}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-50"
                  required
                >
                  {departmentOptions.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Website Assignment */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Website Scoped Access</span>
                  <span className="text-[8.5px] text-indigo-500 font-bold">Click to assign</span>
                </label>
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40 p-2.5 max-h-36 overflow-y-auto">
                  {websites.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {websites.map((web) => {
                        const isSelected = formData.websiteIds.includes(web._id);
                        return (
                          <button
                            key={web._id}
                            type="button"
                            onClick={() => toggleMultiValue("websiteIds", web._id)}
                            className={`p-2 rounded-lg border text-left transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase truncate">{web.websiteName}</p>
                              <p className="text-[8.5px] text-slate-400 truncate">{web.domain}</p>
                            </div>
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase shrink-0 ${
                              isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                            }`}>
                              {isSelected ? "Active" : "Off"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">No websites configured in ecosystem.</p>
                  )}
                </div>
              </div>

              {/* Ticket Categories */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex justify-between">
                  <span>Mapped Ticket Categories</span>
                  <span className="text-[8.5px] text-slate-400">Auto-routes tickets</span>
                </label>
                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40 p-2.5 max-h-32 overflow-y-auto">
                  {categoryOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {categoryOptions.map((cat) => {
                        const isSelected = formData.assignedCategories.includes(cat.value);
                        return (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => toggleMultiValue("assignedCategories", cat.value)}
                            className={`px-2 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                              isSelected
                                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {isSelected && <Check size={9} />}
                            <span>{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">Select at least one website above to load its categories.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/5 pt-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
              >
                {editingId ? "Update Identity" : "Confirm Clearance"}
              </button>
            </div>

          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
