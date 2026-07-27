import React, { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { 
  Shield, 
  X, 
  Check, 
  Users, 
  MessageSquare, 
  Ticket, 
  Settings, 
  ChevronRight, 
  AlertCircle,
  Zap,
  Lock,
  Eye,
  Edit3,
  Trash2,
  Archive,
  UserPlus,
  GitMerge,
  MessageCircle,
  Activity,
  BarChart3,
  History,
  FileText,
  CreditCard
} from "lucide-react";

const PERMISSION_GROUPS = [
  {
    id: "crm",
    label: "CRM Management",
    icon: Users,
    color: "indigo",
    permissions: [
      { id: "crm.view", label: "View Customers", desc: "Access customer registry and details", icon: Eye },
      { id: "crm.create", label: "Create Leads", desc: "Add new prospects to the system", icon: UserPlus },
      { id: "crm.update", label: "Update Records", desc: "Modify existing customer information", icon: Edit3 },
      { id: "crm.archive", label: "Archive Data", desc: "Remove or hide outdated records", icon: Archive },
      { id: "crm.delete", label: "Permanent Delete", desc: "Hard delete of CRM entities", icon: Trash2 },
      { id: "crm.assign", label: "Assign Owner", desc: "Change account ownership", icon: Users },
      { id: "crm.merge", label: "Merge Leads", desc: "Combine duplicate records", icon: GitMerge },
    ]
  },
  {
    id: "tickets",
    label: "Support Ticketing",
    icon: Ticket,
    color: "amber",
    permissions: [
      { id: "ticket.view", label: "View Tickets", desc: "Access the support ticket desk", icon: Eye },
      { id: "ticket.create", label: "Generate Tickets", desc: "Open new support inquiries", icon: Ticket },
      { id: "ticket.update", label: "Update Status", desc: "Modify ticket state and priority", icon: Activity },
      { id: "ticket.delete", label: "Delete Ticket", desc: "Remove support records", icon: Trash2 },
      { id: "ticket.comment", label: "Post Comments", desc: "Internal notes and external replies", icon: MessageCircle },
    ]
  },
  {
    id: "chat",
    label: "Live Chat Operations",
    icon: MessageSquare,
    color: "emerald",
    permissions: [
      { id: "chat.view", label: "Access Live Chat", desc: "Participate in real-time conversations", icon: MessageSquare },
      { id: "chat.transfer", label: "Transfer Chats", desc: "Move sessions between agents", icon: GitMerge },
      { id: "chat.note", label: "Private Notes", desc: "Leave internal context for team", icon: Edit3 },
      { id: "chat.history", label: "View History", desc: "Audit past chat transcripts", icon: History },
      { id: "chat.archive", label: "Archive Chats", desc: "Move sessions to storage/trash", icon: Archive },
    ]
  },
  {
    id: "accounts",
    label: "Accounting & Billing",
    icon: CreditCard,
    color: "indigo",
    permissions: [
      { id: "accounts.view", label: "View Ledger", desc: "Access financial overview and dashboards", icon: Eye },
      { id: "invoice.manage", label: "Manage Invoices", desc: "Generate and track customer invoices", icon: FileText },
      { id: "billing.view", label: "Billing Details", desc: "View subscription and payment history", icon: CreditCard },
    ]
  },
  {
    id: "system",
    label: "System & Analytics",
    icon: Settings,
    color: "rose",
    permissions: [
      { id: "reports.view", label: "Business Reports", desc: "View performance and ROI data", icon: BarChart3 },
      { id: "audit.view", label: "Audit Logs", desc: "Security and event tracking logs", icon: Lock },
      { id: "settings.manage", label: "System Settings", desc: "Global platform configuration", icon: Settings },
      { id: "role.manage", label: "Role Management", desc: "Create and modify security roles", icon: Shield },
    ]
  }
];

export default function RoleManager() {
  const [roles, setRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", description: "", permissions: [], isActive: true });
  const [activeGroup, setActiveGroup] = useState("crm");

  useEffect(() => { loadRoles(); }, []);

  const loadRoles = async () => {
    try {
      const response = await api("/api/roles");
      // The API returns { status: 'success', data: [...] }
      setRoles(response.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleTogglePermission = (id) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(id) 
        ? prev.permissions.filter(p => p !== id) 
        : [...prev.permissions, id]
    }));
  };

  const openModal = (role = null) => {
    if (role) {
      setCurrentRole(role);
      setFormData({ 
        name: role.name, 
        description: role.description || "", 
        permissions: role.permissions || [],
        isActive: role.isActive ?? true 
      });
    } else {
      setCurrentRole(null);
      setFormData({ name: "", description: "", permissions: [], isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (!window.confirm(`Are you sure you want to delete the role "${roleName.toUpperCase()}"?`)) return;
    try {
      await api(`/api/roles/${roleId}`, { method: "DELETE" });
      loadRoles();
    } catch (err) {
      alert(err.message || "Failed to delete role");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentRole) {
        await api(`/api/roles/${currentRole._id}`, {
          method: "PATCH",
          body: JSON.stringify(formData),
        });
      } else {
        await api("/api/roles", {
          method: "POST",
          body: JSON.stringify(formData),
        });
      }
      setIsModalOpen(false);
      loadRoles();
    } catch (err) { alert(err.message); }
  };

  if (loading) return (
    <div className="p-20 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Security Context...</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100">
              <Shield className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Security Role Master</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] pl-1">
            Global authorization engine for JTS Support ecosystem
          </p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-3 group"
        >
          <Zap size={16} className="group-hover:animate-pulse" />
          Deploy New Identity
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {Array.isArray(roles) && roles.map(role => (
          <div key={role._id} className="premium-card p-10 group hover:border-indigo-200 transition-all relative overflow-hidden bg-white/40 backdrop-blur-md border border-slate-200/50 rounded-[40px] shadow-sm">
            {!role.isActive && (
              <div className="absolute top-0 right-0 bg-slate-100 text-slate-400 px-5 py-2 text-[8px] font-black uppercase rounded-bl-[20px] border-l border-b border-slate-200">
                Archived
              </div>
            )}
            
            <div className="flex items-start justify-between mb-8">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center transition-all duration-500 group-hover:rotate-6 shadow-sm">
                <Lock className="text-slate-300 group-hover:text-indigo-600" size={28} />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openModal(role)}
                  title="Edit Role"
                  className="bg-slate-50 hover:bg-indigo-600 text-slate-400 hover:text-white p-3 rounded-xl transition-all shadow-sm group-hover:shadow-indigo-100"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteRole(role._id, role.name)}
                  title="Delete Role"
                  className="bg-slate-50 hover:bg-rose-600 text-slate-400 hover:text-white p-3 rounded-xl transition-all shadow-sm hover:shadow-rose-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase group-hover:text-indigo-600 transition-colors">
                {role.name}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold leading-relaxed line-clamp-2 min-h-[32px]">
                {role.description || "No specific functional summary provided for this identity role."}
              </p>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors">
                <Shield size={12} className="text-indigo-400" />
                <span className="text-[9px] font-black text-slate-500 group-hover:text-indigo-600 uppercase tracking-widest">
                  {role.permissions?.length || 0} Modules
                </span>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Modify</span>
                <ChevronRight size={14} className="text-indigo-600" />
              </div>
            </div>
          </div>
        ))}

        {/* Empty State / Add Card */}
        <div 
          onClick={() => openModal()}
          className="p-10 border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center group-hover:border-indigo-400 group-hover:rotate-90 transition-all duration-500">
            <X size={20} className="rotate-45" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest">Register New Identity</p>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white/90 backdrop-blur-2xl rounded-[48px] shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 border border-white/40">
            
            {/* Modal Header */}
            <div className="px-10 py-10 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-indigo-200 animate-pulse-slow">
                  <Shield className="text-white" size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                    {currentRole ? "Modify Dynamic Role" : "Register New Identity"}
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Authorization Core Context</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-4 text-slate-300 hover:text-slate-900 hover:bg-white rounded-3xl transition-all shadow-sm hover:shadow-md"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              
              {/* Left Column: Metadata */}
              <div className="w-full lg:w-[420px] p-10 bg-slate-50/30 border-r border-slate-100 space-y-12 overflow-y-auto">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block pl-1">Role Designation</label>
                    <div className="relative group">
                      <input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Sales Senior, Support Lead..."
                        className="w-full bg-white/80 border border-slate-200 rounded-[24px] px-8 py-5 text-sm font-bold focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300 shadow-sm"
                        required
                        readOnly={!!currentRole && ["admin", "client", "agent", "manager"].includes(currentRole.name)}
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-200">
                        <Lock size={18} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block pl-1">Functional Summary</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Briefly describe what this role oversees in the JTS ecosystem..."
                      rows={5}
                      className="w-full bg-white/80 border border-slate-200 rounded-[24px] px-8 py-5 text-sm font-bold focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-300 resize-none shadow-sm leading-relaxed"
                    />
                  </div>

                  <div className="p-8 bg-white border border-slate-100 rounded-[36px] shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Active Status</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Turn off to archive this role</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                        className={`w-16 h-9 rounded-full transition-all relative ${formData.isActive ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-7 h-7 rounded-full bg-white shadow-md transition-all duration-300 ${formData.isActive ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-8 space-y-4">
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.25em] py-6 rounded-[24px] shadow-2xl shadow-indigo-100 transition-all flex items-center justify-center gap-4 active:scale-[0.97]">
                    <Zap size={18} />
                    {currentRole ? "Synchronize updates" : "Deploy identity"}
                  </button>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-[0.2em] py-3 transition-colors text-center">
                    Discard changes
                  </button>
                </div>
              </div>

              {/* Right Column: Permissions Content */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white/40">
                
                {/* Custom Category Navigation */}
                <div className="px-10 pt-10 flex items-center gap-4 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {PERMISSION_GROUPS.map(group => {
                    const GroupIcon = group.icon;
                    const isActive = activeGroup === group.id;
                    const groupSelectedCount = formData.permissions.filter(p => p.startsWith(group.id.split('.')[0])).length;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setActiveGroup(group.id)}
                        className={`px-8 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-widest flex items-center gap-4 transition-all whitespace-nowrap border-2 ${
                          isActive 
                            ? `bg-white border-indigo-600 text-indigo-600 shadow-xl shadow-indigo-50` 
                            : 'bg-transparent text-slate-400 border-transparent hover:bg-white/60 hover:text-slate-600'
                        }`}
                      >
                        <GroupIcon size={16} />
                        {group.label}
                        {groupSelectedCount > 0 && (
                          <span className={`px-2 py-1 rounded-lg text-[9px] ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                            {groupSelectedCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Permissions List Area */}
                <div className="flex-1 overflow-y-auto p-10 space-y-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {PERMISSION_GROUPS.find(g => g.id === activeGroup)?.permissions.map(perm => {
                      const isChecked = formData.permissions.includes(perm.id);
                      const PermIcon = perm.icon || Shield;
                      
                      return (
                        <div 
                          key={perm.id}
                          onClick={() => handleTogglePermission(perm.id)}
                          className={`p-8 rounded-[36px] border transition-all cursor-pointer group relative overflow-hidden ${
                            isChecked 
                              ? 'bg-white border-indigo-600 shadow-2xl shadow-indigo-50 ring-4 ring-indigo-500/5' 
                              : 'bg-white/40 border-slate-100 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-6 relative z-10">
                            <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-500 ${
                              isChecked ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110' : 'bg-slate-50 text-slate-300'
                            }`}>
                              <PermIcon size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-black uppercase tracking-tight transition-colors ${isChecked ? 'text-indigo-900' : 'text-slate-800'}`}>
                                {perm.label}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">
                                {perm.desc}
                              </p>
                            </div>
                            <div className={`w-8 h-8 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${
                              isChecked ? 'bg-indigo-600 border-indigo-600 text-white rotate-0' : 'border-slate-100 group-hover:border-slate-300 rotate-12'
                            }`}>
                              {isChecked && <Check size={16} strokeWidth={4} />}
                            </div>
                          </div>
                          
                          {/* Animated Background Accent */}
                          {isChecked && (
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-60 animate-in fade-in duration-1000" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Security Policy Footer */}
                  <div className="pt-10">
                    <div className="p-10 bg-indigo-950 rounded-[40px] border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center gap-10 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Shield size={120} />
                      </div>
                      <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center shrink-0 border border-white/10">
                        <AlertCircle className="text-indigo-400" size={32} />
                      </div>
                      <div className="space-y-2 relative z-10">
                        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em]">Security Enforcement</p>
                        <h4 className="text-xl font-black tracking-tight leading-none mb-1">Authorization Context Notice</h4>
                        <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-2xl">
                          Permissions granted here enable direct access to core JTS Support modules. Ensure that administrative privileges (Delete, Archive, Settings) are only assigned to verified personnel within the organization.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
