import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  TrendingUp, LayoutGrid, List, UserCheck, Clock, AlertCircle,
  Shield, UserPlus, Zap, CheckCircle2, Search, Plus, Download
} from "lucide-react";
import MagicCelebration from "./MagicCelebration.jsx";

import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { hasPermission } from "../../utils/permissions.js";
import { PERMISSIONS } from "../../constants/domain.js";
import { downloadCSV } from "../../utils/exportUtils.js";
import { apiCache } from "../../utils/cache.js";

import CrmPipelineBar from "./CrmPipelineBar.jsx";
import CrmBoardView from "./CrmBoardView.jsx";
import CrmTableView from "./CrmTableView.jsx";
import CrmDrawer from "./CrmDrawer.jsx";
import CrmLeadModal from "./CrmLeadModal.jsx";
import CrmReportsView from "./CrmReportsView.jsx";
import CrmStageEditor from "./CrmStageEditor.jsx";
import PaginationControls from "../PaginationControls.jsx";
import { formatCurrency, CRM_STAGE_CONFIG } from "./CrmUIComponents.jsx";

export default function CrmContainer({
  websiteId = "",
  initialLeadData = null,
  highlightLeadId = null
}) {
  const { user } = useAuth();

  // -- Permissions --
  const isSales = user?.role === "sales";
  const canEditCRM = hasPermission(user, PERMISSIONS.CRM_UPDATE);
  const canAssignOwners = hasPermission(user, PERMISSIONS.CRM_ASSIGN_OWNER);
  const canManagePipeline = hasPermission(user, PERMISSIONS.CRM_UPDATE);
  const canCreateLead = hasPermission(user, PERMISSIONS.CRM_CREATE);
  const isManager = user?.role === "manager";

  // -- Master State --
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // -- View Filters --
  const [viewMode, setViewMode] = useState("board");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [leadView, setLeadView] = useState(isSales ? "my_leads" : "all");
  const [recordCategoryTab, setRecordCategoryTab] = useState("all");
  const [activeRange, setActiveRange] = useState("month");
  const [sourceFilter, setSourceFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  // -- Drawer & Selection --
  const [showDrawer, setShowDrawer] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [drawerTab, setDrawerTab] = useState("tickets");

  // -- Form States (Drawer Tabs) --
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", type: "follow_up", dueAt: "", notes: "" });
  const [taskSaving, setTaskSaving] = useState(false);
  const [interactionType, setInteractionType] = useState("call");
  const [interactionNote, setInteractionNote] = useState("");
  const [interactionSaving, setInteractionSaving] = useState(false);

  const [emailDraft, setEmailDraft] = useState({ subject: "", body: "" });
  const [sendingEmail, setSendingEmail] = useState(false);

  // -- Modal Lead Modal State --
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [editLeadId, setEditLeadId] = useState(null);
  const [creatingLead, setCreatingLead] = useState(false);
  const [createLeadForm, setCreateLeadForm] = useState({
    name: "", email: "", phone: "", companyName: "", recordType: "lead",
    leadStatus: "new", dealStage: "", leadSource: "", leadValue: 0, budget: 0,
    requirement: "", timeline: "", interestLevel: "warm", leadCategory: "warm",
    probability: "", expectedCloseDate: "", decisionMaker: "", lostReason: "",
    websiteId: websiteId || "", status: "new", pipelineStage: "new",
    priority: "medium", ownerId: "", tags: "", notes: "", sessionId: ""
  });

  // -- Notifications --
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });

  // -- Board Interaction State --
  const [draggedCustomerId, setDraggedCustomerId] = useState("");
  const [dropTargetStatus, setDropTargetStatus] = useState("");

  // -- Bulk Selection --
  const [selectedIds, setSelectedIds] = useState([]);

  // -- Effects --
  // Debounced search: fire fetchCustomers only after 300ms idle
  const searchTimerRef = useRef(null);
  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchCustomers(1);
    }, 300);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter, websiteId, leadView, recordCategoryTab, sourceFilter, healthFilter, stageFilter, activeRange]);

  useEffect(() => {
    if (canAssignOwners) fetchTeamMembers();
  }, [canAssignOwners]);

  useEffect(() => {
    if (canCreateLead) fetchWebsites();
  }, [canCreateLead]);

  useEffect(() => {
    if (initialLeadData) {
      openCreateModal(initialLeadData);
    }
  }, [initialLeadData, user?._id]);

  useEffect(() => {
    if (highlightLeadId) {
      loadAndOpenLead(highlightLeadId);
    }
  }, [highlightLeadId]);

  useEffect(() => {
    if (!actionMessage.text) return;
    const timer = setTimeout(() => setActionMessage({ type: "", text: "" }), 5000);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  // -- API Handlers --
  const fetchCustomers = async (page = 1) => {
    setLoading(true);
    try {
      const queryParams = {
        page,
        search,
        status: statusFilter,
        websiteId,
        view: leadView,
        recordType: recordCategoryTab,
        leadSource: sourceFilter,
        healthStatus: healthFilter,
        pipelineStage: stageFilter,
        range: activeRange
      };

      const query = new URLSearchParams(Object.fromEntries(
        Object.entries(queryParams).filter(([_, v]) => v !== "" && v !== null && v !== undefined)
      )).toString();

      const data = await api(`/api/crm?${query}`);
      setCustomers(data.customers || []);
      setSummary(data.summary || {});
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    const cacheKey = "team_members";
    const cached = apiCache.get(cacheKey);
    if (cached) {
      setTeamMembers(Array.isArray(cached) ? cached : []);
      return;
    }

    try {
      const data = await api("/api/users/agents");
      const teamData = Array.isArray(data) ? data : [];
      setTeamMembers(teamData);
      apiCache.set(cacheKey, teamData, 10 * 60 * 1000); // Cache for 10 minutes
    } catch (err) {
      console.error("Failed to fetch team members:", err);
    }
  };

  const fetchWebsites = async () => {
    const cacheKey = `websites_${user?._id}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
      setWebsites(Array.isArray(cached) ? cached : []);
      return;
    }

    try {
      const data = await api("/api/websites");
      const websitesData = Array.isArray(data) ? data : [];
      setWebsites(websitesData);
      apiCache.set(cacheKey, websitesData, 15 * 60 * 1000); // Cache for 15 minutes
    } catch (err) {
      console.error("Failed to fetch websites:", err);
    }
  };

  const loadAndOpenLead = async (id) => {
    try {
      const leadData = await api(`/api/crm/${id}`);
      if (leadData?.customer) {
        openCustomer(leadData.customer);
      }
    } catch (err) {
      console.error("Failed to open highlighted lead", err);
    }
  };

  const openCustomer = async (customer, tab = "tickets") => {
    setSelectedCustomer(customer);
    setShowDrawer(true);
    setLoadingDetails(true);
    setCustomerDetails(null);
    setDrawerTab(tab);
    setEmailDraft({ subject: "", body: "" }); // Reset draft
    try {
      const data = await api(`/api/crm/${customer._id}`);
      setCustomerDetails(data);
      // Initialize draft if not already set or if opening a new customer
      setEmailDraft(buildSalesEmailDraft(data.customer || customer, user));
    } catch (err) {
      console.error("Failed to fetch customer details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const syncCustomerState = (updated) => {
    if (!updated?._id) return;
    setCustomers(prev => prev.map(c => c._id === updated._id ? { ...c, ...updated } : c));
    if (selectedCustomer?._id === updated._id) {
      setSelectedCustomer(prev => prev ? { ...prev, ...updated } : prev);
    }
    setCustomerDetails(prev => prev ? { ...prev, customer: updated } : prev);
  };

  const updateCustomerFields = async (id, payload) => {
    try {
      const updated = await api(`/api/crm/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      syncCustomerState(updated);
      fetchCustomers(); // Refresh dashboard summary
      setActionMessage({ type: "success", text: "CRM record updated." });
    } catch (err) {
      setActionMessage({ type: "error", text: err.message || "Update failed." });
    }
  };

  // -- Interaction Handlers --
  const handleBoardDrop = async (nextStatus, droppedCustomerId = null) => {
    const customerId = droppedCustomerId || draggedCustomerId;
    if (!customerId || !nextStatus || !canManagePipeline) {
      setDraggedCustomerId("");
      setDropTargetStatus("");
      return;
    }

    const existing = customers.find(c => c._id === customerId);
    if (!existing || existing.pipelineStage === nextStatus) return;

    if (nextStatus === "lost") {
      onOpenEditLead(existing, { pipelineStage: "lost" });
      return;
    }

    // Optimistic UI
    // Optimistic UI
    setCustomers(prev => prev.map(c => c._id === customerId ? { ...c, pipelineStage: nextStatus } : c));

    try {
      let updatedLead;
      if (nextStatus === "won") {
        // Use post-win workflow endpoint which performs server-side post-win actions
        updatedLead = await api(`/api/crm/${customerId}/post-win`, { method: "POST" });
        // backend returns { customer, tasks, quotation } — normalize to updated customer
        updatedLead = updatedLead?.customer || updatedLead;
      } else {
        updatedLead = await api(`/api/crm/${customerId}`, {
          method: "PATCH",
          body: JSON.stringify({ pipelineStage: nextStatus })
        });
      }

      // Update local state with the source of truth from server
      setCustomers(prev => prev.map(c => c._id === customerId ? updatedLead : c));

      if (nextStatus === "won") {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 4000);
      }

      setActionMessage({ type: "success", text: `Moved to ${nextStatus}` });

      // Still fetch summary stats in background, but the UI is already correct
      fetchCustomers();
    } catch (err) {
      // Rollback on actual failure
      setCustomers(prev => prev.map(c => c._id === customerId ? { ...c, pipelineStage: existing.pipelineStage } : c));
      setActionMessage({ type: "error", text: "Move failed: " + (err.message || "Server error") });
    } finally {
      setDraggedCustomerId("");
      setDropTargetStatus("");
    }
  };

  const onAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedCustomer?._id) return;
    setSavingNote(true);
    try {
      const updated = await api(`/api/crm/${selectedCustomer._id}/notes`, {
        method: "POST",
        body: JSON.stringify({ text: newNote })
      });
      syncCustomerState(updated);
      setNewNote("");
      setActionMessage({ type: "success", text: "CRM note added." });
    } catch (err) {
      setActionMessage({ type: "error", text: "Note addition failed." });
    } finally {
      setSavingNote(false);
    }
  };

  const onUpdateTaskStatus = async (taskId, status) => {
    if (!selectedCustomer?._id) return;
    try {
      await api(`/api/crm/${selectedCustomer._id}/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      const refreshed = await api(`/api/crm/${selectedCustomer._id}`);
      setCustomerDetails(refreshed);
      setActionMessage({ type: "success", text: "Task updated." });
    } catch (err) {
      setActionMessage({ type: "error", text: "Task update failed." });
    }
  };

  const onCreateTask = async (e) => {
    e.preventDefault();
    if (!selectedCustomer?._id) return;
    setTaskSaving(true);
    try {
      await api(`/api/crm/${selectedCustomer._id}/tasks`, {
        method: "POST",
        body: JSON.stringify(taskForm)
      });
      const refreshed = await api(`/api/crm/${selectedCustomer._id}`);
      setCustomerDetails(refreshed);
      setTaskForm({ title: "", type: "follow_up", dueAt: "", notes: "" });
      setActionMessage({ type: "success", text: "Action task created." });
    } catch (err) {
      setActionMessage({ type: "error", text: "Task creation failed." });
    } finally {
      setTaskSaving(false);
    }
  };

  const onBulkCompleteTasks = async () => {
    if (!selectedCustomer?._id || !customerDetails?.tasks?.length) return;
    try {
      const incompleteTasks = customerDetails.tasks.filter(t => t.status !== "completed");
      await Promise.all(incompleteTasks.map(task =>
        api(`/api/crm/${selectedCustomer._id}/tasks/${task._id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "completed" })
        })
      ));
      const refreshed = await api(`/api/crm/${selectedCustomer._id}`);
      setCustomerDetails(refreshed);
      setActionMessage({ type: "success", text: `Marked ${incompleteTasks.length} tasks as complete.` });
    } catch (err) {
      setActionMessage({ type: "error", text: "Bulk completion failed." });
    }
  };

  const onDeleteOverdueTasks = async () => {
    if (!selectedCustomer?._id || !customerDetails?.tasks?.length) return;
    try {
      const overdueTasks = customerDetails.tasks.filter(t =>
        new Date(t.dueAt) < new Date() && t.status !== "completed"
      );
      await Promise.all(overdueTasks.map(task =>
        api(`/api/crm/${selectedCustomer._id}/tasks/${task._id}`, {
          method: "DELETE"
        })
      ));
      const refreshed = await api(`/api/crm/${selectedCustomer._id}`);
      setCustomerDetails(refreshed);
      setActionMessage({ type: "success", text: `Deleted ${overdueTasks.length} overdue tasks.` });
    } catch (err) {
      setActionMessage({ type: "error", text: "Bulk deletion failed." });
    }
  };

  const onLogInteraction = async (e) => {
    e.preventDefault();
    if (!interactionNote.trim() || !selectedCustomer?._id) return;
    setInteractionSaving(true);
    try {
      const updated = await api(`/api/crm/${selectedCustomer._id}/notes`, {
        method: "POST",
        body: JSON.stringify({ type: interactionType, text: interactionNote })
      });
      syncCustomerState(updated);
      const refreshed = await api(`/api/crm/${selectedCustomer._id}`);
      setCustomerDetails(refreshed);
      setInteractionNote("");
      setActionMessage({ type: "success", text: "Interaction logged." });
    } catch (err) {
      setActionMessage({ type: "error", text: "Logging failed." });
    } finally {
      setInteractionSaving(false);
    }
  };

  const onBulkUpdate = async (updates) => {
    if (!selectedIds.length) return;
    try {
      const res = await api("/api/crm/bulk-update", {
        method: "PATCH",
        body: JSON.stringify({ ids: selectedIds, updates })
      });
      setActionMessage({ type: "success", text: `Successfully updated ${res.count} leads.` });
      setSelectedIds([]);
      fetchCustomers();
    } catch (err) {
      setActionMessage({ type: "error", text: "Bulk update failed: " + err.message });
    }
  };

  const onBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} leads? This action cannot be undone.`)) return;

    try {
      const res = await api("/api/crm/bulk-delete", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIds })
      });
      setActionMessage({ type: "success", text: `Successfully deleted ${res.count} leads.` });
      setSelectedIds([]);
      fetchCustomers();
    } catch (err) {
      setActionMessage({ type: "error", text: "Bulk delete failed: " + err.message });
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const clearSelection = () => setSelectedIds([]);

  const onAutoAssign = async (customer) => {
    if (!customer?._id) return;
    try {
      const updated = await api(`/api/crm/${customer._id}/auto-assign`, { method: "POST" });
      syncCustomerState(updated);
      setActionMessage({ type: "success", text: `Assigned to ${updated.ownerId?.name || "agent"}.` });
    } catch (err) {
      setActionMessage({ type: "error", text: "Auto-assign failed." });
    }
  };

  const onArchive = async (customer) => {
    if (!customer?._id || !window.confirm(`Archive ${customer.name || "this lead"}?`)) return;
    try {
      const updated = await api(`/api/crm/${customer._id}/archive`, { method: "POST" });
      syncCustomerState(updated);
      setActionMessage({ type: "success", text: "Lead archived." });
    } catch (err) {
      setActionMessage({ type: "error", text: "Archiving failed." });
    }
  };

  const onDelete = async (customer) => {
    if (!customer?._id || !window.confirm(`Delete ${customer.name || "this lead"} permanently?`)) return;
    try {
      await api(`/api/crm/${customer._id}`, { method: "DELETE" });
      setCustomers(prev => prev.filter(c => c._id !== customer._id));
      if (selectedCustomer?._id === customer._id) setShowDrawer(false);
      setActionMessage({ type: "success", text: "Lead deleted." });
    } catch (err) {
      setActionMessage({ type: "error", text: "Deletion failed." });
    }
  };

  const buildSalesEmailDraft = (customer, currentUser) => {
    const customerName = customer?.name || "there";
    const salesName = currentUser?.name || "Sales Team";
    const websiteName = (typeof customer?.websiteId === 'object' ? customer?.websiteId?.websiteName : "our team") || "our team";
    return {
      subject: `Follow-up from ${websiteName}`,
      body: `Hi ${customerName},\n\nThank you for your interest. I am ${salesName} from ${websiteName}.\n\nI am following up regarding your recent inquiry. Please reply with a convenient time or any details you would like us to prepare before we connect.\n\nBest regards,\n${salesName}`
    };
  };

  const onSendEmail = async (e) => {
    e.preventDefault();
    if (!selectedCustomer?._id || !emailDraft.subject.trim() || !emailDraft.body.trim()) return;
    setSendingEmail(true);
    try {
      const updated = await api(`/api/crm/${selectedCustomer._id}/send-email`, {
        method: "POST",
        body: JSON.stringify({
          subject: emailDraft.subject.trim(),
          body: emailDraft.body.trim()
        })
      });
      syncCustomerState(updated);
      setActionMessage({ type: "success", text: "Email sent." });
    } catch (err) {
      setActionMessage({ type: "error", text: "Email failed." });
    } finally {
      setSendingEmail(false);
    }
  };



  const onGenerateCode = async (customerId) => {
    if (!customerId) return;
    try {
      const updated = await api(`/api/crm/${customerId}/generate-code`, { method: "POST" });
      syncCustomerState(updated);
      setActionMessage({ type: "success", text: "Lead locked and code generated." });
    } catch (err) {
      setActionMessage({ type: "error", text: "Code generation failed." });
    }
  };

  // -- Modal Handlers --
  const openCreateModal = (initData = {}) => {
    setEditLeadId(null);
    setCreateLeadForm({
      name: initData.name || "",
      email: initData.email || "",
      phone: initData.phone || "",
      companyName: initData.companyName || "",
      recordType: initData.recordType || "lead",
      leadStatus: initData.leadStatus || "new",
      dealStage: initData.dealStage || "",
      leadSource: initData.leadSource || "website",
      leadValue: initData.leadValue || 0,
      budget: initData.budget || 0,
      requirement: initData.requirement || "",
      timeline: initData.timeline || "",
      interestLevel: initData.interestLevel || "warm",
      leadCategory: initData.leadCategory || "warm",
      probability: initData.probability || "",
      expectedCloseDate: (initData.expectedCloseDate || "").substring(0, 10),
      decisionMaker: initData.decisionMaker || "",
      lostReason: initData.lostReason || "",
      websiteId: websiteId || "",
      status: "new",
      pipelineStage: "new",
      priority: "medium",
      ownerId: initData.ownerId || user?._id || "",
      tags: "",
      notes: initData.notes || "",
      sessionId: initData.sessionId || ""
    });
    setShowCreateLead(true);
  };

  const onOpenEditLead = (overrideCustomer = null, forceOverrides = {}) => {
    const target = overrideCustomer || selectedCustomer;
    if (!target) return;
    setCreateLeadForm({
      name: target.name || "",
      email: target.email || "",
      phone: target.phone || "",
      companyName: target.companyName || "",
      recordType: target.recordType || "lead",
      leadStatus: target.leadStatus || "new",
      dealStage: target.dealStage || "",
      leadSource: target.leadSource || "",
      leadValue: target.leadValue || 0,
      budget: target.budget || 0,
      requirement: target.requirement || "",
      timeline: target.timeline || "",
      interestLevel: target.interestLevel || "warm",
      leadCategory: target.leadCategory || "warm",
      probability: target.probability || "",
      expectedCloseDate: target.expectedCloseDate ? target.expectedCloseDate.substring(0, 10) : "",
      decisionMaker: target.decisionMaker || "",
      lostReason: target.lostReason || "",
      websiteId: target.websiteId?._id || target.websiteId || websiteId || "",
      status: target.status || "new",
      pipelineStage: target.pipelineStage || "new",
      priority: target.priority || "medium",
      ownerId: target.ownerId?._id || target.ownerId || "",
      tags: target.tags ? target.tags.join(", ") : "",
      notes: "",
      sessionId: target.sessionId || "",
      ...forceOverrides
    });
    setEditLeadId(target._id);
    setShowCreateLead(true);
  };

  const onSubmitLead = async (e) => {
    e.preventDefault();
    setCreatingLead(true);
    try {
      const payload = {
        ...createLeadForm,
        leadValue: Number(createLeadForm.leadValue || 0),
        budget: Number(createLeadForm.budget || 0),
        tags: createLeadForm.tags ? createLeadForm.tags.split(",").map(t => t.trim()).filter(Boolean) : []
      };

      if (editLeadId) {
        delete payload.email; // Core field safety
        const updated = await api(`/api/crm/${editLeadId}`, { method: "PATCH", body: JSON.stringify(payload) });
        syncCustomerState(updated);
        setActionMessage({ type: "success", text: "Lead updated." });
      } else {
        const created = await api("/api/crm", { method: "POST", body: JSON.stringify(payload) });
        setCustomers(prev => [created, ...prev]);
        setActionMessage({ type: "success", text: "Lead created." });
        openCustomer(created);
      }
      setShowCreateLead(false);
    } catch (err) {
      setActionMessage({ type: "error", text: err.message || "Operation failed." });
    } finally {
      setCreatingLead(false);
    }
  };

  const onDrillDown = (type, value) => {
    // Reset other filters
    setSearch("");
    setStatusFilter("");
    setLeadView("all");
    setSourceFilter("");
    setHealthFilter("");
    setStageFilter("");

    // Apply specific filter
    if (type === "source") setSourceFilter(value);
    if (type === "stage") setStageFilter(value);
    if (type === "health") setHealthFilter(value);

    // Switch to records list
    setRecordCategoryTab("all");
    setViewMode("list");
  };

  // -- Constants --
  const [stageKeys, setStageKeys] = React.useState(() => Object.keys(CRM_STAGE_CONFIG).filter(k => CRM_STAGE_CONFIG[k]?.active !== false));
  const boardColumns = stageKeys.map((k, idx) => ({ key: k, label: CRM_STAGE_CONFIG[k]?.label || k, tone: "from-indigo-500 to-sky-500" }));

  const [showStageEditor, setShowStageEditor] = useState(false);
  const handleStagesChange = (keys) => {
    if (Array.isArray(keys)) setStageKeys(keys);
    else if (typeof keys === "object" && keys !== null) setStageKeys(Object.keys(keys));
  };

  const workspaceCards = [
    { key: "all", label: "Pipeline", value: summary.totalLeads || pagination.total || customers.length, helper: "Active records", icon: LayoutGrid },
    { key: "my_leads", label: "Assigned to Me", value: summary.myLeads || 0, helper: "Owned by you", icon: UserCheck },
    { key: "due_today", label: "Due Today", value: summary.dueToday || 0, helper: "Activities due", icon: Clock },
    { key: "no_follow_up", label: "Missing Plan", value: summary.noFollowUp || 0, helper: "Needs activity", icon: AlertCircle },
    { key: "archived", label: "Archived", value: summary.archived || 0, helper: "Inactive records", icon: Shield }
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 relative">
      {showCelebration && <MagicCelebration />}

      {/* ── Header Support Section ── */}
      <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 py-5 md:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                <TrendingUp size={12} className="text-indigo-500" />
                Sales Workspace
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">Pipeline Management</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 xl:w-[720px]">
              {[
                { label: "Open Pipeline", value: summary.totalLeads || pagination.total, color: "text-slate-950" },
                { label: "Pipeline Value", value: formatCurrency(summary.pipelineValue), color: "text-slate-950" },
                { label: "Forecasting", value: formatCurrency(summary.weightedRevenue), color: "text-indigo-700", bg: "bg-indigo-50/50 border-indigo-100" },
                { label: "Conv. Rate", value: `${summary.conversionRate || 0}%`, color: "text-emerald-600" },
                { label: "Won Revenue", value: formatCurrency(summary.revenue), color: "text-amber-600" }
              ].map(card => (
                <div key={card.label} className={`rounded-2xl border border-slate-200 px-4 py-3 ${card.bg || "bg-slate-50"}`}>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                  <p className={`mt-2 text-lg font-black ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-5 md:px-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {workspaceCards.map(card => {
              const Icon = card.icon;
              const active = leadView === card.key;
              return (
                <button
                  key={card.key}
                  onClick={() => setLeadView(card.key)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${active ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-slate-200 bg-slate-50 hover:bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-[9px] font-black uppercase tracking-[0.18em] ${active ? "text-slate-300" : "text-slate-400"}`}>{card.label}</p>
                      <p className={`mt-2 text-2xl font-black ${active ? "text-white" : "text-slate-950"}`}>{card.value}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${active ? "bg-white/10 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                      <Icon size={16} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 mb-2 flex items-center border-b border-slate-200">
            {[
              { id: "all", label: "All Records", icon: LayoutGrid },
              { id: "lead", label: "Leads", icon: UserPlus },
              { id: "deal", label: "Deals", icon: Zap },
              { id: "customer", label: "Customers", icon: CheckCircle2 },
              { id: "reports", label: "Insights", icon: TrendingUp }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRecordCategoryTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-[0.18em] border-b-2 transition-all ${recordCategoryTab === tab.id ? "border-indigo-600 text-indigo-600 bg-indigo-50/30" : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search pipeline…"
                className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/5 placeholder:text-slate-300"
              />
            </div>
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
              <button onClick={() => setViewMode("board")} className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase ${viewMode === "board" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500"}`}>Board</button>
              <button onClick={() => setViewMode("list")} className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase ${viewMode === "list" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500"}`}>List</button>
            </div>

            <button
              onClick={() => downloadCSV(customers, `crm_export_${leadView}.csv`)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-5 py-3 text-[10px] font-black uppercase text-slate-700 hover:bg-slate-50 transition-all"
            >
              <Download size={14} /> Export
            </button>

            {canCreateLead && (
              <button onClick={() => openCreateModal()} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-[10px] font-black uppercase text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                <Plus size={14} /> New Lead
              </button>
            )}
            {isManager && (
              <button onClick={() => setShowStageEditor(true)} className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-3 text-[10px] font-black uppercase text-slate-700 hover:bg-slate-50 transition-all">
                <UserCheck size={14} /> Edit Stages
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Content View ── */}
      {!loading && customers.length > 0 && <CrmPipelineBar customers={customers} />}

      {actionMessage.text && (
        <div className={`rounded-2xl border px-5 py-4 text-[11px] font-bold ${actionMessage.type === "error" ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {actionMessage.text}
        </div>
      )}

      {recordCategoryTab === "reports" ? (
        <CrmReportsView
          summary={summary}
          onDrillDown={onDrillDown}
          activeRange={activeRange}
          setActiveRange={setActiveRange}
        />
      ) : viewMode === "board" ? (
        <CrmBoardView
          customers={customers}
          boardColumns={boardColumns}
          canManagePipeline={canManagePipeline}
          onOpenCustomer={openCustomer}
          onBoardDrop={handleBoardDrop}
          onGenerateCode={onGenerateCode}
          draggedCustomerId={draggedCustomerId}
          setDraggedCustomerId={setDraggedCustomerId}
          dropTargetStatus={dropTargetStatus}
          setDropTargetStatus={setDropTargetStatus}
        />
      ) : (
        <CrmTableView
          customers={customers}
          loading={loading}
          pagination={pagination}
          leadView={leadView}
          openCustomer={openCustomer}
          selectedIds={selectedIds}
          toggleSelection={toggleSelection}
          clearSelection={() => setSelectedIds([])}
          onBulkUpdate={onBulkUpdate}
          onBulkDelete={onBulkDelete}
          canBulkDelete={["admin", "client", "manager"].includes(user?.role)}
          teamMembers={teamMembers}
        />
      )}

      {recordCategoryTab !== "reports" && (
        <PaginationControls
          currentPage={pagination.page || 1}
          totalPages={pagination.pages || 1}
          totalItems={pagination.total || customers.length}
          itemLabel="customers"
          onPageChange={fetchCustomers}
        />
      )}

      {/* ── Overlays ── */}
      <CrmDrawer
        showDrawer={showDrawer}
        setShowDrawer={setShowDrawer}
        selectedCustomer={selectedCustomer}
        customerDetails={customerDetails}
        loadingDetails={loadingDetails}
        drawerTab={drawerTab}
        setDrawerTab={setDrawerTab}
        canEditCRM={canEditCRM}
        canAssignOwners={canAssignOwners}
        onOpenEditLead={onOpenEditLead}
        onArchive={onArchive}
        onDelete={onDelete}
        onAutoAssign={onAutoAssign}
        onAddNote={onAddNote}
        onUpdateTaskStatus={onUpdateTaskStatus}
        onCreateTask={onCreateTask}
        onBulkCompleteTasks={onBulkCompleteTasks}
        onDeleteOverdueTasks={onDeleteOverdueTasks}
        onLogInteraction={onLogInteraction}
        newNote={newNote}
        setNewNote={setNewNote}
        savingNote={savingNote}
        taskForm={taskForm}
        setTaskForm={setTaskForm}
        taskSaving={taskSaving}
        interactionType={interactionType}
        setInteractionType={setInteractionType}
        interactionNote={interactionNote}
        setInteractionNote={setInteractionNote}
        interactionSaving={interactionSaving}
        emailDraft={emailDraft}
        setEmailDraft={setEmailDraft}
        onSendEmail={onSendEmail}
        sendingEmail={sendingEmail}
        onGenerateCode={onGenerateCode}
        teamMembers={teamMembers}
      />

      <CrmLeadModal
        show={showCreateLead}
        onClose={() => { setShowCreateLead(false); setEditLeadId(null); }}
        editLeadId={editLeadId}
        form={createLeadForm}
        setForm={setCreateLeadForm}
        onSubmit={onSubmitLead}
        creating={creatingLead}
        canAssignOwners={canAssignOwners}
        teamMembers={teamMembers}
      />
      <CrmStageEditor open={showStageEditor} onClose={() => setShowStageEditor(false)} onChangeStages={handleStagesChange} />
    </div>
  );
}
