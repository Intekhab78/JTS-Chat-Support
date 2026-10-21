import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client.js";
import { useWebsite } from "../context/WebsiteContext.jsx";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
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
  CreditCard,
  Building2,
  Package,
  ShoppingCart,
  Send,
  CheckSquare,
  FileSpreadsheet,
  Mail,
  UserCheck,
  Search,
  Plus
} from "lucide-react";

const ALL_PERMISSION_GROUPS = [
  {
    id: "crm",
    label: "CRM Management",
    shortLabel: "CRM",
    icon: Users,
    color: "indigo",
    permissions: [
      { id: "crm.view", label: "View Customers", desc: "Access customer registry and profiles", icon: Eye },
      { id: "crm.create", label: "Create Leads", desc: "Add new prospects to the pipeline", icon: UserPlus },
      { id: "crm.update", label: "Update Records", desc: "Modify customer & lead details", icon: Edit3 },
      { id: "crm.assign", label: "Assign Owner", desc: "Change lead and customer ownership", icon: UserCheck },
      { id: "crm.merge", label: "Merge Leads", desc: "Combine duplicate customer records", icon: GitMerge },
      { id: "crm.send_email", label: "Send Emails", desc: "Send customer outreach and emails", icon: Mail },
      { id: "crm.manage_tasks", label: "Manage Tasks", desc: "Create and track follow-up tasks", icon: CheckSquare },
      { id: "crm.archive", label: "Archive Data", desc: "Archive inactive records", icon: Archive },
      { id: "crm.delete", label: "Permanent Delete", desc: "Delete CRM entities permanently", icon: Trash2 },
    ]
  },
  {
    id: "compliance",
    label: "Tax & Compliance",
    shortLabel: "Compliance",
    icon: FileSpreadsheet,
    color: "emerald",
    permissions: [
      { id: "tax.view", label: "View Compliance Suite", desc: "Access full UAE Tax & Compliance Hub", icon: Eye },
      { id: "tax.vat", label: "VAT Compliance", desc: "Access VAT filing schedules & client status", icon: FileText },
      { id: "tax.corporate_tax", label: "Corporate Tax", desc: "Access Corporate Tax registration & deadlines", icon: Building2 },
      { id: "tax.trade_license", label: "Trade License Renewal", desc: "Access UAE Trade License expiry & renewals", icon: Shield },
      { id: "tax.reports", label: "Compliance Reports", desc: "Access 360° compliance audit reports", icon: BarChart3 },
      { id: "tax.reminder_log", label: "Record Reminders", desc: "1-Click daily follow-up logging", icon: Send },
      { id: "tax.manage", label: "Manage Deadlines", desc: "Update filing dates and work statuses", icon: Edit3 },
    ]
  },
  {
    id: "tickets",
    label: "Support Ticketing",
    shortLabel: "Tickets",
    icon: Ticket,
    color: "amber",
    permissions: [
      { id: "ticket.view", label: "View Tickets", desc: "Access the support ticketing desk", icon: Eye },
      { id: "ticket.create", label: "Generate Tickets", desc: "Create new support inquiries", icon: Ticket },
      { id: "ticket.update", label: "Update Status", desc: "Modify ticket state and priority", icon: Activity },
      { id: "ticket.assign", label: "Assign Tickets", desc: "Reassign ticket ownership", icon: Users },
      { id: "ticket.comment", label: "Post Comments", desc: "Add internal notes and client replies", icon: MessageCircle },
      { id: "ticket.delete", label: "Delete Ticket", desc: "Remove support records", icon: Trash2 },
    ]
  },
  {
    id: "chat",
    label: "Live Chat Operations",
    shortLabel: "Chat",
    icon: MessageSquare,
    color: "teal",
    permissions: [
      { id: "chat.view", label: "Access Live Chat", desc: "Participate in visitor conversations", icon: MessageSquare },
      { id: "chat.transfer", label: "Transfer Chats", desc: "Move live sessions between agents", icon: GitMerge },
      { id: "chat.note", label: "Private Notes", desc: "Leave internal context for team", icon: Edit3 },
      { id: "chat.history", label: "View History", desc: "Audit past chat transcripts", icon: History },
      { id: "chat.archive", label: "Archive Chats", desc: "Move sessions to storage/trash", icon: Archive },
    ]
  },
  {
    id: "accounts",
    label: "Accounting & Billing",
    shortLabel: "Accounts",
    icon: CreditCard,
    color: "blue",
    permissions: [
      { id: "accounts.view", label: "View Ledger", desc: "Access financial overview & ledger", icon: Eye },
      { id: "invoice.manage", label: "Manage Invoices", desc: "Generate and track customer invoices", icon: FileText },
      { id: "billing.view", label: "Billing Details", desc: "View subscription & payment history", icon: CreditCard },
    ]
  },
  {
    id: "inventory",
    label: "Inventory & Procurement",
    shortLabel: "Inventory",
    icon: Package,
    color: "purple",
    permissions: [
      { id: "inventory.view", label: "View Stock", desc: "Browse SKU catalog and levels", icon: Eye },
      { id: "inventory.manage", label: "Manage Inventory", desc: "Add/edit items and stock levels", icon: Package },
      { id: "purchase.manage", label: "Procurement POs", desc: "Manage purchase orders and suppliers", icon: ShoppingCart },
    ]
  },
  {
    id: "system",
    label: "System & Analytics",
    shortLabel: "System",
    icon: Settings,
    color: "rose",
    permissions: [
      { id: "reports.view", label: "Business Reports", desc: "View performance and BI reports", icon: BarChart3 },
      { id: "audit.view", label: "Audit Logs", desc: "Security and event tracking logs", icon: Lock },
      { id: "team.view", label: "Team Roster", desc: "View personnel list and status", icon: Users },
      { id: "settings.manage", label: "System Settings", desc: "Global platform configuration", icon: Settings },
      { id: "role.manage", label: "Role Master", desc: "Manage roles & authorization permissions", icon: Shield },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roles.length]);

  const { selectedWebsite } = useWebsite() || {};
  const enabledModules = selectedWebsite?.enabledModules || [];

  // Lock body scroll and attach Escape key listener when modal is open
  useEffect(() => {
    if (isModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e) => {
        if (e.key === "Escape") setIsModalOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isModalOpen]);

  // Filter permission groups based on active website's enabled modules
  const PERMISSION_GROUPS = useMemo(() => {
    return ALL_PERMISSION_GROUPS.filter(group => {
      if (!selectedWebsite || !Array.isArray(selectedWebsite.enabledModules) || selectedWebsite.enabledModules.length === 0) {
        return true;
      }
      if (group.id === "compliance") {
        return enabledModules.includes("compliance");
      }
      if (group.id === "inventory") {
        return enabledModules.includes("operations") || enabledModules.includes("inventory");
      }
      if (group.id === "crm") {
        return enabledModules.includes("crm");
      }
      if (group.id === "accounts") {
        return enabledModules.includes("finance");
      }
      if (group.id === "tickets") {
        return enabledModules.includes("service") || selectedWebsite.enableTicketing !== false;
      }
      if (group.id === "chat") {
        return selectedWebsite.enableChat !== false;
      }
      return true;
    });
  }, [selectedWebsite, enabledModules]);

  // Ensure activeGroup is valid
  useEffect(() => {
    if (!PERMISSION_GROUPS.some(g => g.id === activeGroup) && PERMISSION_GROUPS.length > 0) {
      setActiveGroup(PERMISSION_GROUPS[0].id);
    }
  }, [PERMISSION_GROUPS, activeGroup]);

  useEffect(() => { loadRoles(); }, []);

  const loadRoles = async () => {
    try {
      const response = await api("/api/roles");
      setRoles(response.data || []);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
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
    } catch (err) { 
      alert(err.message); 
    }
  };

  const filteredRoles = useMemo(() => {
    if (!Array.isArray(roles)) return [];
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase().trim();
    return roles.filter(r => 
      r.name?.toLowerCase().includes(q) || 
      r.description?.toLowerCase().includes(q)
    );
  }, [roles, searchQuery]);

  // Helper to extract active group pills for a role
  const getRoleGroupBadges = (rolePerms = []) => {
    const matched = [];
    PERMISSION_GROUPS.forEach(g => {
      const hasPerm = g.permissions.some(p => rolePerms.includes(p.id));
      if (hasPerm) matched.push(g.shortLabel);
    });
    return matched;
  };

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center space-y-3">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Security Context...</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* ── Compact Header & Toolbar ────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-xs text-white shrink-0">
            <Shield size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Security Role Master
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[9px] font-black">
                {roles.length} {roles.length === 1 ? "Role" : "Roles"}
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Authorization & access control engine for JTS ecosystem
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search identities..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-medium text-slate-700 dark:text-slate-200 outline-none focus:bg-white focus:border-indigo-400 transition-all"
            />
          </div>

          <button 
            onClick={() => openModal()}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus size={13} />
            Deploy Identity
          </button>
        </div>
      </div>

      {/* ── Compact Roles Grid ─────────────────────────────── */}
      {(() => {
        const pagination = getPaginationMeta(filteredRoles, page, 19);
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 items-stretch">
              {pagination.pageItems.map(role => {
          const groupBadges = getRoleGroupBadges(role.permissions || []);
          const isSystemRole = ["admin", "client", "agent", "manager"].includes(role.name?.toLowerCase());

          return (
            <div 
              key={role._id} 
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md transition-all group flex flex-col justify-between relative"
            >
              <div>
                {/* Top Row: Icon + Status + Edit/Delete */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors">
                      <Lock size={15} />
                    </div>
                    {role.isActive === false && (
                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 text-[8px] font-black uppercase rounded-md">
                        Archived
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openModal(role)}
                      title="Edit Role"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-all cursor-pointer"
                    >
                      <Edit3 size={13} />
                    </button>
                    {!isSystemRole && (
                      <button 
                        onClick={() => handleDeleteRole(role._id, role.name)}
                        title="Delete Role"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Role Title & Summary */}
                <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-tight uppercase group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                  {role.name}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-2 min-h-[28px] mt-1 leading-snug">
                  {role.description || "No specific functional summary provided for this identity role."}
                </p>

                {/* Active Module Pills */}
                {groupBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {groupBadges.slice(0, 3).map(badge => (
                      <span key={badge} className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[8px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                        {badge}
                      </span>
                    ))}
                    {groupBadges.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-[8px] font-bold text-indigo-600 dark:text-indigo-300">
                        +{groupBadges.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Row: Modules Pill + Modify Link */}
              <div 
                onClick={() => openModal(role)}
                className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between cursor-pointer"
              >
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <Shield size={11} className="text-indigo-500" />
                  {role.permissions?.length || 0} Modules
                </span>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                  Modify <ChevronRight size={11} />
                </span>
              </div>
            </div>
          );
        })}

        {/* Compact Register New Card */}
        <div 
          onClick={() => openModal()}
          className="border border-dashed border-slate-200 dark:border-white/15 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-all cursor-pointer min-h-[140px] group select-none"
        >
          <div className="w-8 h-8 rounded-full border border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center group-hover:border-indigo-400 group-hover:rotate-90 transition-all">
            <Plus size={15} />
          </div>
          <p className="text-[9px] font-black uppercase tracking-wider">Register Identity</p>
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && filteredRoles.length > 0 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={19}
          itemLabel="roles"
          onPageChange={setPage}
        />
      )}
          </>
        );
      })()}

      {/* ── Compact & Professional Modal Rendered via createPortal to document.body ── */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] overflow-y-auto p-2 sm:p-4 md:p-6 flex items-center justify-center">
          {/* Dimmed Backdrop across entire window */}
          <div 
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsModalOpen(false)} 
          />
          
          {/* Centered Modal Card */}
          <div className="relative z-10 my-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-white/10 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-xs text-white shrink-0">
                  <Shield size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {currentRole ? `Modify Role: ${currentRole.name}` : "Register New Identity"}
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                    Role permissions & system authorization context
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
              
              {/* Left Column: Role Details & Actions */}
              <div className="w-full md:w-72 p-4 bg-slate-50/40 dark:bg-white/[0.01] border-b md:border-b-0 md:border-r border-slate-100 dark:border-white/10 space-y-3 overflow-y-auto shrink-0 custom-scrollbar">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Role Designation</label>
                  <div className="relative">
                    <input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Sales Senior, Support Lead"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                      required
                      readOnly={!!currentRole && ["admin", "client", "agent", "manager"].includes(currentRole.name?.toLowerCase())}
                    />
                    {!!currentRole && ["admin", "client", "agent", "manager"].includes(currentRole.name?.toLowerCase()) && (
                      <Lock size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Functional Summary</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Briefly describe responsibilities..."
                    rows={3}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-[11px] font-medium focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 resize-none leading-relaxed"
                  />
                </div>

                {/* Active Status Toggle */}
                <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Identity</p>
                    <p className="text-[8px] font-bold text-slate-400">Toggle off to archive</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${formData.isActive ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-all duration-200 ${formData.isActive ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Selected Permissions Counter */}
                <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                    <Shield size={13} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Assigned Modules</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black">
                    {formData.permissions.length}
                  </span>
                </div>

                {/* Save & Cancel Buttons */}
                <div className="pt-1 space-y-1.5">
                  <button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                  >
                    <Zap size={13} />
                    {currentRole ? "Synchronize Updates" : "Deploy Identity"}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="w-full text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold text-[9px] uppercase tracking-wider py-1.5 transition-colors text-center cursor-pointer"
                  >
                    Discard Changes
                  </button>
                </div>
              </div>

              {/* Right Column: Permission Tabs & Grid */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                
                {/* Horizontal Category Navigation Tabs */}
                <div className="px-3 py-2 border-b border-slate-100 dark:border-white/10 flex items-center gap-1.5 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-slate-50/40 dark:bg-white/[0.01]">
                  {PERMISSION_GROUPS.map(group => {
                    const GroupIcon = group.icon;
                    const isActive = activeGroup === group.id;
                    const groupSelectedCount = formData.permissions.filter(p => p.startsWith(group.id.split('.')[0])).length;

                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setActiveGroup(group.id)}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer border ${
                          isActive 
                            ? `bg-white dark:bg-slate-800 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs` 
                            : 'border-transparent text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        <GroupIcon size={12} />
                        {group.label}
                        {groupSelectedCount > 0 && (
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-black ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                            {groupSelectedCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Permissions List Grid */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar min-h-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PERMISSION_GROUPS.find(g => g.id === activeGroup)?.permissions.map(perm => {
                      const isChecked = formData.permissions.includes(perm.id);
                      const PermIcon = perm.icon || Shield;
                      
                      return (
                        <div 
                          key={perm.id}
                          onClick={() => handleTogglePermission(perm.id)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                            isChecked 
                              ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 shadow-xs' 
                              : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                            }`}>
                              <PermIcon size={13} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[11px] font-bold truncate ${isChecked ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                {perm.label}
                              </p>
                              <p className="text-[8px] font-medium text-slate-400 truncate">
                                {perm.desc}
                              </p>
                            </div>
                          </div>

                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Security Policy Strip */}
                  <div className="p-2.5 bg-slate-900 text-white rounded-xl flex items-center gap-2 text-[9px] font-medium">
                    <AlertCircle size={13} className="text-amber-400 shrink-0" />
                    <p className="leading-snug text-slate-300">
                      Permissions define workspace capabilities. Destructive actions (Delete, Archive) should only be assigned to verified personnel.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
