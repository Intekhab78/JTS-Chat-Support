import { useState, useEffect, useRef } from "react";
import { UserPlus, Mail, Shield, Activity, Search, Trash2, Settings, BarChart2 } from "lucide-react";
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
      setAgents(agentData);
      setWebsites(websiteData);
      setDynamicRoles(roleData.data || []);
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
          formData.websiteIds.map((websiteId) => api(`/api/categories?websiteId=${websiteId}`))
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
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
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

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedAgents = getPaginationMeta(filteredAgents, page);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, agents.length]);

  if (loading) return <div className="text-center py-20 animate-pulse text-slate-400 font-black uppercase text-[10px] tracking-widest">Synchronizing Force...</div>;

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="space-y-1">
            <h3 className="heading-md dark:text-white">Team Command</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Manage security cleared support personnel and managers.</p>
         </div>
         <div className="flex gap-4">
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter agents..."
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl pl-10 pr-6 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all w-64 shadow-sm dark:text-white"
               />
            </div>
            <button 
               onClick={() => isAdding ? handleCancel() : setIsAdding(true)}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-100 flex items-center gap-3"
            >
               <UserPlus size={16} />
               {editingId ? "Close Edit" : isAdding ? "Cancel" : "Add Personnel"}
            </button>
         </div>
      </div>

      {isAdding && (
         <form ref={formRef} onSubmit={handleSubmit} className="premium-card p-10 animate-in zoom-in-95 duration-500 bg-white dark:bg-slate-900/50 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
               <div className="space-y-1">
                  <h4 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900 dark:text-white">
                     {editingId ? "Update Personnel" : "Create Personnel"}
                  </h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                     {editingId
                       ? "Edit role, website access, department, and category routing for this staff account."
                       : "Create a new staff login and assign secure routing access."}
                  </p>
               </div>
               {editingId && (
                 <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                    Editing existing personnel
                 </div>
               )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               <div className="space-y-1.5">
                  <label className="small-label text-slate-400 flex justify-between">
                     Identity Name <span className="text-[9px] text-indigo-400 font-bold uppercase">Required</span>
                  </label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder-slate-300 dark:text-white"
                    placeholder="John Doe"
                    required
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="small-label text-slate-400 flex justify-between">
                     Secure Email <span className="text-[9px] text-indigo-400 font-bold uppercase">Required</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder-slate-300 dark:text-white"
                    placeholder="agent@example.com"
                    required
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="small-label text-slate-400 flex justify-between">
                     Access Password <span className="text-[9px] text-slate-300 font-bold uppercase">{editingId ? 'Optional' : 'Required'}</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder-slate-300 dark:text-white"
                    placeholder={editingId ? "Leave blank to keep current" : "••••••••"}
                    required={!editingId}
                  />
               </div>
               <div className="space-y-1.5">
                  <label className="small-label text-slate-400 flex justify-between">
                     Role Assignment <span className="text-[9px] text-indigo-400 font-bold uppercase">Required</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all dark:text-white"
                  >
                     <option value="">Select a role...</option>
                     {dynamicRoles.filter(r => r.isActive).map(role => (
                       <option key={role._id} value={role.name.toLowerCase()}>{role.name}</option>
                     ))}
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="small-label text-slate-400 flex justify-between">
                     Department <span className="text-[9px] text-indigo-400 font-bold uppercase">Routing</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    disabled={!formData.websiteIds.length}
                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  >
                    {departmentOptions.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] font-bold text-slate-400">
                    {!formData.websiteIds.length
                      ? "Select at least one website first to enable department routing."
                      : "Departments come from the categories mapped to the selected websites."}
                  </p>
               </div>
               <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                  <label className="small-label text-slate-400 flex justify-between">
                     Website Assignment <span className="text-[9px] text-indigo-400 font-bold uppercase">Scoped Access</span>
                  </label>
                  <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 p-4">
                    {websites.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {websites.map((website) => {
                          const isSelected = formData.websiteIds.includes(website._id);
                          return (
                            <button
                              key={website._id}
                              type="button"
                              onClick={() => toggleMultiValue("websiteIds", website._id)}
                              className={`text-left rounded-2xl border px-4 py-3 transition-all ${
                                isSelected
                                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:border-indigo-400 dark:text-indigo-300"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-white/5 dark:bg-slate-900 dark:text-slate-300"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[11px] font-black uppercase tracking-wider truncate">{website.websiteName}</p>
                                  <p className="text-[10px] font-bold normal-case text-slate-400 dark:text-slate-500 truncate">{website.domain}</p>
                                </div>
                                <span className={`mt-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border text-[9px] font-black uppercase px-1.5 ${
                                  isSelected
                                    ? "border-indigo-500 bg-indigo-600 text-white"
                                    : "border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/5"
                                }`}>
                                  {isSelected ? "On" : "Off"}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-slate-400">No websites available yet.</p>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">
                    Click one or more websites. This user will only work inside the selected websites.
                  </p>
               </div>
               <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                  <label className="small-label text-slate-400 flex justify-between">
                     Ticket Categories <span className="text-[9px] text-indigo-400 font-bold uppercase">Department Match</span>
                  </label>
                  <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 p-4">
                    {categoryOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {categoryOptions.map((category) => {
                          const isSelected = formData.assignedCategories.includes(category.value);
                          return (
                            <button
                              key={category.value}
                              type="button"
                              onClick={() => toggleMultiValue("assignedCategories", category.value)}
                              className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-400 dark:text-emerald-300"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/40 dark:border-white/5 dark:bg-slate-900 dark:text-slate-300"
                              }`}
                            >
                              {category.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-slate-400">Select a website first to load its categories.</p>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400">
                    Client can map this person to ticket categories. Matching tickets will auto-route to this department when available.
                  </p>
               </div>
            </div>
            <div className="pt-8 border-t border-slate-100 dark:border-white/5 flex flex-col-reverse sm:flex-row justify-end gap-3">
               <button type="button" onClick={handleCancel} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] px-8 py-4 rounded-2xl transition-all min-w-[180px]">
                  Cancel
               </button>
               <button type="submit" className="bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-[0.2em] px-10 py-4 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none transition-all flex items-center justify-center min-w-[200px] hover:scale-105 active:scale-95">
                  {editingId ? "Update Identity" : "Confirm Clearance"}
               </button>
            </div>
         </form>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 px-6 py-4 rounded-2xl text-[11px] font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginatedAgents.pageItems.map((agent) => {
          const rawName = (agent.name || "").trim();
          const words = rawName.split(/\s+/).filter(Boolean);
          const avatarText = words.length > 1
            ? words.map(w => w[0]).join("").toUpperCase()
            : rawName.toUpperCase();

          const fontClass = 
            avatarText.length <= 2 ? "text-xl" :
            avatarText.length === 3 ? "text-base" :
            avatarText.length === 4 ? "text-xs tracking-tight" :
            "text-[10px] tracking-tighter";

          return (
            <div key={agent._id} className="premium-card p-8 group hover:shadow-2xl hover:shadow-indigo-500/5 transition-all relative bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
               <div className="flex items-start justify-between mb-8">
                  <div className={`w-14 h-14 rounded-2xl bg-slate-900 dark:bg-black flex items-center justify-center text-white font-black shadow-xl group-hover:bg-indigo-600 transition-all border border-white/5 whitespace-nowrap px-1 overflow-hidden ${fontClass}`}>
                     {avatarText}
                  </div>
                <div className="relative h-10 flex items-center justify-end w-[100px]">
                   <div className={`absolute right-0 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm transition-all duration-300 pointer-events-none group-hover:opacity-0 group-hover:translate-x-4 ${agent.isOnline ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-slate-50 dark:bg-white/5 text-slate-400'}`}>
                      {agent.isOnline ? 'Active' : 'Offline'}
                   </div>
                   <div className="absolute right-0 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex gap-1">
                      <button type="button" onClick={() => handleEdit(agent)} className="p-2.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-white/5 rounded-xl transition-all">
                         <Settings size={15} />
                      </button>
                      <button type="button" onClick={() => handleDelete(agent._id)} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/5 rounded-xl transition-all">
                         <Trash2 size={15} />
                      </button>
                   </div>
                </div>
             </div>
             
             <div className="space-y-4">
                <div className="space-y-1">
                   <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">{agent.name}</h4>
                   <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                      <div className="flex items-center gap-1.5 truncate">
                         <Mail size={12} />
                         {agent.email}
                      </div>
                   </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-white/5 grid grid-cols-3 gap-2">
                   <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Role</span>
                      <p className="text-[10px] font-black text-slate-950 dark:text-white flex items-center gap-1.5 lowercase">
                         <Shield size={10} className="text-indigo-400" />
                         {agent.role}
                      </p>
                   </div>
                   <div className="space-y-1 text-center border-x border-slate-50 dark:border-white/5 px-2">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Workload</span>
                      <p className="text-[10px] font-black text-slate-950 dark:text-white flex items-center justify-center gap-1">
                         <BarChart2 size={10} className="text-indigo-400" />
                         <span className={`${agent.activeChats > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>{agent.activeChats || 0}</span>
                         <span className="text-slate-300 dark:text-slate-700">/</span>
                         <span className="text-slate-400 dark:text-slate-600">{agent.maxWorkload || 5}</span>
                      </p>
                   </div>
                   <div className="space-y-1 text-right">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Status</span>
                      <div className="flex items-center justify-end gap-1.5">
                         <span className={`w-1.5 h-1.5 rounded-full ${agent.isAvailable ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></span>
                         <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase">{agent.isAvailable ? 'Ready' : 'Standby'}</span>
                      </div>
                   </div>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Department</span>
                   <p className="text-[10px] font-black text-slate-950 dark:text-white mt-2 uppercase tracking-widest">
                      {agent.department || "general"}
                   </p>
                   <div className="flex flex-wrap gap-1.5 mt-2">
                      {agent.assignedCategories?.length > 0 ? agent.assignedCategories.map((category) => (
                         <span key={category} className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                            {category}
                         </span>
                      )) : (
                         <span className="text-[9px] font-bold text-slate-300">No categories mapped</span>
                      )}
                   </div>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Websites</span>
                   <div className="flex flex-wrap gap-1.5 mt-2">
                      {agent.websiteIds?.length > 0 ? agent.websiteIds.map((website) => (
                         <span key={website._id || website} className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
                            {website.websiteName || website}
                         </span>
                      )) : (
                         <span className="text-[9px] font-bold text-slate-300">All tenant websites (legacy user)</span>
                      )}
                   </div>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-2">
                   <button
                     type="button"
                     onClick={() => handleEdit(agent)}
                     className="flex-1 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 transition-all hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
                   >
                     Edit
                   </button>
                   <button
                     type="button"
                     onClick={() => handleDelete(agent._id)}
                     className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-red-600 transition-all hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                   >
                     Delete
                   </button>
                </div>
             </div>
           </div>
        ); 
      })}

        {filteredAgents.length === 0 && !isAdding && (
          <div className="col-span-full p-24 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[40px] text-center space-y-4">
             <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto text-slate-300">
                <Activity size={32} />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No personnel found.</p>
          </div>
        )}
      </div>
      <PaginationControls
        currentPage={paginatedAgents.currentPage}
        totalPages={paginatedAgents.totalPages}
        totalItems={paginatedAgents.totalItems}
        itemLabel="personnel"
        onPageChange={setPage}
      />
    </div>
  );
}
