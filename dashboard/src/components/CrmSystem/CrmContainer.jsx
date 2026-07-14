import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  TrendingUp, LayoutGrid, List, UserCheck, Clock, AlertCircle,
  Shield, UserPlus, Zap, CheckCircle2, Search, Plus, Download,
  LayoutDashboard, Users, Building2, Briefcase, GitBranch,
  Package, FileText, ShoppingCart, BarChart3, Repeat, Receipt,
  Inbox, MessageSquare, LifeBuoy, Award, GitFork, History,
  Cpu, BarChart2, ShieldAlert, Terminal, Sparkles, CreditCard,
  Calendar, Video, Target
} from "lucide-react";
import MagicCelebration from "./MagicCelebration.jsx";

import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
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
import CrmImportModal from "./CrmImportModal.jsx";
import PaginationControls from "../PaginationControls.jsx";
import { formatCurrency, CRM_STAGE_CONFIG, DEFAULT_CRM_STAGE_CONFIG } from "./CrmUIComponents.jsx";
import CrmContactsView from "./CrmContactsView.jsx";
import CrmCompaniesView from "./CrmCompaniesView.jsx";
import CrmDealsView from "./CrmDealsView.jsx";
import CrmPipelinesConfig from "./CrmPipelinesConfig.jsx";
import CrmDashboardWidgets from "./CrmDashboardWidgets.jsx";
import Customer360View from "./Customer360View.jsx";
import CrmProductsView from "./CrmProductsView.jsx";
import CrmQuotationsView from "./CrmQuotationsView.jsx";
import CrmSalesOrdersView from "./CrmSalesOrdersView.jsx";
import CrmFinanceDashboard from "./CrmFinanceDashboard.jsx";
import CrmSubscriptionsView from "./CrmSubscriptionsView.jsx";
import CrmInvoicesView from "./CrmInvoicesView.jsx";
import CrmOmnichannelInbox from "./CrmOmnichannelInbox.jsx";
import CannedResponsesManager from "./CannedResponsesManager.jsx";
import CrmHelpdeskView from "./CrmHelpdeskView.jsx";
import CrmCustomerSuccessView from "./CrmCustomerSuccessView.jsx";
import CrmWorkflowBuilder from "./CrmWorkflowBuilder.jsx";
import CrmWorkflowHistory from "./CrmWorkflowHistory.jsx";
import CrmAiConsole from "./CrmAiConsole.jsx";
import CrmBiDashboard from "./CrmBiDashboard.jsx";
import CrmAdminConsole from "./CrmAdminConsole.jsx";
import CrmDeveloperConsole from "./CrmDeveloperConsole.jsx";
import CrmCalendarView from "./CrmCalendarView.jsx";
import MeetingPlatformsManager from "./MeetingPlatformsManager.jsx";
import CrmSalesTargets from "./CrmSalesTargets.jsx";
import CrmActivityFeed from "./CrmActivityFeed.jsx";

const crmGroups = [
  {
    id: "crm",
    label: "CRM & Sales",
    icon: Users,
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "leads", label: "Leads", icon: UserPlus },
      { id: "contacts", label: "Contacts", icon: Users },
      { id: "companies", label: "Companies", icon: Building2 },
      { id: "deals", label: "Deals", icon: Briefcase },
      { id: "pipelines", label: "Pipelines", icon: GitBranch },
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "meeting-platforms", label: "Meeting Platforms", icon: Video },
      { id: "targets", label: "Sales Targets", icon: Target },
      { id: "feed", label: "Activity Feed", icon: History },
    ]
  },
  {
    id: "operations",
    label: "Operations",
    icon: Package,
    items: [
      { id: "products", label: "Products", icon: Package },
      { id: "quotations", label: "Quotations", icon: FileText },
      { id: "salesorders", label: "Sales Orders", icon: ShoppingCart },
    ]
  },
  {
    id: "finance",
    label: "Finance",
    icon: CreditCard,
    items: [
      { id: "finance", label: "Finance", icon: BarChart3 },
      { id: "subscriptions", label: "Subscriptions", icon: Repeat },
      { id: "invoices", label: "Invoices", icon: Receipt },
    ]
  },
  {
    id: "service",
    label: "Service & Care",
    icon: MessageSquare,
    items: [
      { id: "inbox", label: "Unified Inbox", icon: Inbox },
      { id: "canned", label: "Canned Replies", icon: MessageSquare },
      { id: "helpdesk", label: "Helpdesk", icon: LifeBuoy },
      { id: "success", label: "Customer Success", icon: Award },
    ]
  },
  {
    id: "automation",
    label: "Workflows & AI",
    icon: Cpu,
    items: [
      { id: "workflows", label: "Workflows", icon: GitFork },
      { id: "workflow-history", label: "Workflow Logs", icon: History },
      { id: "ai", label: "AI Platform", icon: Sparkles },
      { id: "bi", label: "BI Analytics", icon: BarChart2 },
    ]
  },
  {
    id: "system",
    label: "System & Dev",
    icon: ShieldAlert,
    items: [
      { id: "admin", label: "SaaS Admin Center", icon: ShieldAlert },
      { id: "developer", label: "Developer Platform", icon: Terminal },
    ]
  }
];

export default function CrmContainer({
  websiteId = "",
  initialLeadData = null,
  highlightLeadId = null
}) {
  const { user } = useAuth();
  const socket = useSocket();

  // -- Permissions --
  const isSales = user?.role === "sales";
  const canEditCRM = hasPermission(user, PERMISSIONS.CRM_UPDATE);
  const canAssignOwners = hasPermission(user, PERMISSIONS.CRM_ASSIGN_OWNER);
  const canManagePipeline = hasPermission(user, PERMISSIONS.CRM_UPDATE);
  const canCreateLead = hasPermission(user, PERMISSIONS.CRM_CREATE);
  const isManager = user?.role === "manager";

  // -- Pipeline Stage Persistence --
  // Stores the stages fetched from the selected website document in MongoDB
  const [websiteStages, setWebsiteStages] = useState([]);

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
  const [workspaceTab, setWorkspaceTab] = useState("dashboard");
  const activeGroup = crmGroups.find(group => group.items.some(item => item.id === workspaceTab)) || crmGroups[0];
  const handleGroupClick = (group) => {
    setWorkspaceTab(group.items[0].id);
  };
  const [activeCustomer360Id, setActiveCustomer360Id] = useState(null);
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
  const [showImportModal, setShowImportModal] = useState(false);
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
    fetchWebsites();
  }, []);

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
    if (!socket) return;

    const handleLeadCreated = (payload) => {
      if (!payload) return;
      if (websiteId && payload.websiteId && payload.websiteId !== websiteId) return;
      fetchCustomers(1);
    };

    socket.on("lead:created", handleLeadCreated);
    return () => {
      socket.off("lead:created", handleLeadCreated);
    };
  }, [socket, websiteId]);

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

  const openCustomer = async (customerOrId, tab = "tickets") => {
    let customer = customerOrId;
    if (typeof customerOrId === "string") {
      customer = { _id: customerOrId };
    }
    if (!customer || !customer._id) return;

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

  const onUnlock = async (customerId) => {
    if (!customerId) return;
    try {
      const updated = await api(`/api/crm/${customerId}/unlock`, { method: "POST" });
      syncCustomerState(updated);
      setActionMessage({ type: "success", text: "Lead unlocked and moved back to Negotiation." });
    } catch (err) {
      setActionMessage({ type: "error", text: err.message || "Failed to unlock lead." });
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
    const isEvent = overrideCustomer && (typeof overrideCustomer.preventDefault === "function" || overrideCustomer.nativeEvent);
    const target = (isEvent ? null : overrideCustomer) || selectedCustomer;
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

      if (createLeadForm.probability === "" || createLeadForm.probability === null || createLeadForm.probability === undefined) {
        delete payload.probability;
      } else {
        payload.probability = Number(createLeadForm.probability);
      }

      if (payload.dealStage === "") {
        payload.dealStage = null;
      }

      if (editLeadId) {
        delete payload.email; // Core field safety
        const updated = await api(`/api/crm/${editLeadId}`, { method: "PATCH", body: JSON.stringify(payload) });
        syncCustomerState(updated);
        setActionMessage({ type: "success", text: "Lead updated." });
      } else {
        const created = await api("/api/crm", { method: "POST", body: JSON.stringify(payload) });
        await fetchCustomers(1);
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

  // -- Sync CRM_STAGE_CONFIG when the active website changes --
  // Applies the persisted custom stages (if any) to the mutable global
  // so every downstream component (BoardView, TableView, badges) picks them up.
  useEffect(() => {
    const selectedWebsite = websites.find(w => w._id === websiteId);
    const saved = selectedWebsite?.pipelineStages;

    const colourPalette = [
      { color: "bg-violet-50 text-violet-600 border-violet-100", dot: "bg-violet-500" },
      { color: "bg-sky-50 text-sky-600 border-sky-100", dot: "bg-sky-500" },
      { color: "bg-indigo-50 text-indigo-600 border-indigo-100", dot: "bg-indigo-500" },
      { color: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-500" },
      { color: "bg-orange-50 text-orange-600 border-orange-100", dot: "bg-orange-500" },
      { color: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500" },
      { color: "bg-red-50 text-red-500 border-red-100", dot: "bg-red-400" },
      { color: "bg-pink-50 text-pink-600 border-pink-100", dot: "bg-pink-500" },
      { color: "bg-teal-50 text-teal-600 border-teal-100", dot: "bg-teal-500" },
      { color: "bg-cyan-50 text-cyan-600 border-cyan-100", dot: "bg-cyan-500" }
    ];

    if (Array.isArray(saved) && saved.length > 0) {
      // Replace the global mutable config with the persisted custom stages
      Object.keys(CRM_STAGE_CONFIG).forEach(k => delete CRM_STAGE_CONFIG[k]);
      saved.forEach((s, idx) => {
        const palette = colourPalette[idx % colourPalette.length];
        CRM_STAGE_CONFIG[s.key] = {
          label: s.label,
          color: s.color || palette.color,
          dot: s.dot || palette.dot,
          active: s.active !== false
        };
      });
      const filteredKeys = saved.filter(s => s.active !== false).map(s => s.key);
      setWebsiteStages(saved);
      setStageKeys(filteredKeys);
    } else {
      // No custom stages — reset to built-in defaults
      Object.keys(CRM_STAGE_CONFIG).forEach(k => delete CRM_STAGE_CONFIG[k]);
      Object.entries(DEFAULT_CRM_STAGE_CONFIG).forEach(([k, v]) => {
        CRM_STAGE_CONFIG[k] = { ...v };
      });
      setWebsiteStages([]);
      setStageKeys(Object.keys(DEFAULT_CRM_STAGE_CONFIG).filter(k => DEFAULT_CRM_STAGE_CONFIG[k]?.active !== false));
    }
  }, [websiteId, websites]);

  // -- Constants --
  const [stageKeys, setStageKeys] = React.useState(() => Object.keys(CRM_STAGE_CONFIG).filter(k => CRM_STAGE_CONFIG[k]?.active !== false));
  const boardColumns = stageKeys.map((k) => ({ key: k, label: CRM_STAGE_CONFIG[k]?.label || k, tone: "from-indigo-500 to-sky-500" }));

  const [showStageEditor, setShowStageEditor] = useState(false);
  const [savingStages, setSavingStages] = useState(false);

  // Receives the full stage array from CrmStageEditor, persists to the backend,
  // and then refreshes the local runtime config and board columns.
  const handleStagesChange = async (updatedStages) => {
    if (!Array.isArray(updatedStages) || !websiteId) return;

    const colourPalette = [
      { color: "bg-violet-50 text-violet-600 border-violet-100", dot: "bg-violet-500" },
      { color: "bg-sky-50 text-sky-600 border-sky-100", dot: "bg-sky-500" },
      { color: "bg-indigo-50 text-indigo-600 border-indigo-100", dot: "bg-indigo-500" },
      { color: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-500" },
      { color: "bg-orange-50 text-orange-600 border-orange-100", dot: "bg-orange-500" },
      { color: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500" },
      { color: "bg-red-50 text-red-500 border-red-100", dot: "bg-red-400" },
      { color: "bg-pink-50 text-pink-600 border-pink-100", dot: "bg-pink-500" },
      { color: "bg-teal-50 text-teal-600 border-teal-100", dot: "bg-teal-500" },
      { color: "bg-cyan-50 text-cyan-600 border-cyan-100", dot: "bg-cyan-500" }
    ];

    // Enrich each stage with colour metadata before saving
    const enriched = updatedStages.map((s, idx) => {
      const existing = CRM_STAGE_CONFIG[s.key];
      const palette = colourPalette[idx % colourPalette.length];
      return {
        key: s.key,
        label: s.label,
        color: existing?.color || palette.color,
        dot: existing?.dot || palette.dot,
        active: s.active !== false
      };
    });

    // Optimistically update the runtime config
    Object.keys(CRM_STAGE_CONFIG).forEach(k => delete CRM_STAGE_CONFIG[k]);
    enriched.forEach(s => {
      CRM_STAGE_CONFIG[s.key] = { label: s.label, color: s.color, dot: s.dot, active: s.active };
    });
    setWebsiteStages(enriched);
    setStageKeys(enriched.filter(s => s.active).map(s => s.key));

    // Persist to the backend
    setSavingStages(true);
    try {
      await api(`/api/websites/${websiteId}`, {
        method: "PATCH",
        body: JSON.stringify({ pipelineStages: enriched })
      });
      // Refresh cached website list so future selects pick up the new stages
      apiCache.delete(`websites_${user?._id}`);
      const updatedWebsites = await api("/api/websites");
      if (Array.isArray(updatedWebsites)) setWebsites(updatedWebsites);
      setActionMessage({ type: "success", text: "Pipeline stages saved successfully." });
    } catch (err) {
      setActionMessage({ type: "error", text: "Failed to save pipeline stages: " + (err.message || "Server error") });
    } finally {
      setSavingStages(false);
    }
  };

  const cardColors = {
    all: {
      border: "border-slate-200 hover:border-slate-300",
      activeBorder: "border-slate-900 bg-slate-950 text-white",
      iconBg: "bg-slate-100 text-slate-700",
      activeIconBg: "bg-white/20 text-white",
      label: "text-slate-400",
      activeLabel: "text-slate-300",
      value: "text-slate-900",
      activeValue: "text-white"
    },
    my_leads: {
      border: "border-indigo-100 hover:border-indigo-200",
      activeBorder: "border-indigo-600 bg-indigo-600 text-white",
      iconBg: "bg-indigo-50 text-indigo-600",
      activeIconBg: "bg-white/20 text-white",
      label: "text-slate-400",
      activeLabel: "text-indigo-200",
      value: "text-slate-900",
      activeValue: "text-white"
    },
    hot_leads: {
      border: "border-rose-100 hover:border-rose-200",
      activeBorder: "border-rose-600 bg-rose-600 text-white",
      iconBg: "bg-rose-50 text-rose-600",
      activeIconBg: "bg-white/20 text-white",
      label: "text-slate-400",
      activeLabel: "text-rose-200",
      value: "text-slate-900",
      activeValue: "text-white"
    },
    high_value: {
      border: "border-violet-100 hover:border-violet-200",
      activeBorder: "border-violet-600 bg-violet-600 text-white",
      iconBg: "bg-violet-50 text-violet-600",
      activeIconBg: "bg-white/20 text-white",
      label: "text-slate-400",
      activeLabel: "text-violet-200",
      value: "text-slate-900",
      activeValue: "text-white"
    },
    due_today: {
      border: "border-sky-100 hover:border-sky-200",
      activeBorder: "border-sky-600 bg-sky-600 text-white",
      iconBg: "bg-sky-50 text-sky-600",
      activeIconBg: "bg-white/20 text-white",
      label: "text-slate-400",
      activeLabel: "text-sky-200",
      value: "text-slate-900",
      activeValue: "text-white"
    },
    stale: {
      border: "border-amber-100 hover:border-amber-200",
      activeBorder: "border-amber-500 bg-amber-500 text-white",
      iconBg: "bg-amber-50 text-amber-600",
      activeIconBg: "bg-white/20 text-white",
      label: "text-slate-400",
      activeLabel: "text-amber-100",
      value: "text-slate-900",
      activeValue: "text-white"
    },
    no_follow_up: {
      border: "border-orange-100 hover:border-orange-200",
      activeBorder: "border-orange-600 bg-orange-600 text-white",
      iconBg: "bg-orange-50 text-orange-600",
      activeIconBg: "bg-white/20 text-white",
      label: "text-slate-400",
      activeLabel: "text-orange-200",
      value: "text-slate-900",
      activeValue: "text-white"
    },
    archived: {
      border: "border-slate-200 hover:border-slate-300",
      activeBorder: "border-slate-700 bg-slate-700 text-white",
      iconBg: "bg-slate-100 text-slate-600",
      activeIconBg: "bg-white/20 text-white",
      label: "text-slate-400",
      activeLabel: "text-slate-200",
      value: "text-slate-900",
      activeValue: "text-white"
    }
  };

  const workspaceCards = [
    { key: "all", label: "Pipeline", value: summary.totalLeads || pagination.total || customers.length, helper: "Active records", icon: LayoutGrid },
    { key: "my_leads", label: "Assigned to Me", value: summary.myLeads || 0, helper: "Owned by you", icon: UserCheck },
    { key: "hot_leads", label: "Hot Deals", value: summary.hotLeads || 0, helper: "High interest", icon: Zap },
    { key: "high_value", label: "High Value", value: summary.highValue || 0, helper: "Value >= ₹50k", icon: Award },
    { key: "due_today", label: "Due Today", value: summary.dueToday || 0, helper: "Activities due", icon: Clock },
    { key: "stale", label: "Stale Leads", value: summary.staleLeads || 0, helper: "7+ days inactive", icon: AlertCircle },
    { key: "no_follow_up", label: "Missing Plan", value: summary.noFollowUp || 0, helper: "Needs activity", icon: History },
    { key: "archived", label: "Archived", value: summary.archived || 0, helper: "Inactive records", icon: Shield }
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 relative">
      {showCelebration && <MagicCelebration />}

      {/* ── Two-Tier Top Navigation (Premium No-Scroll) ── */}
      <div className="bg-white border border-slate-200/80 rounded-[30px] p-5 shadow-sm space-y-4">
        {/* Tier 1: Main Category Groups */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4 justify-start">
          {crmGroups.map(group => {
            const GroupIcon = group.icon;
            const isGroupActive = activeGroup.id === group.id;
            return (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-200 select-none ${
                  isGroupActive 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.02]" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <GroupIcon size={14} className={isGroupActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-600"} />
                <span>{group.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tier 2: Sub-modules of Active Category */}
        <div className="flex flex-wrap items-center gap-2 justify-start animate-in fade-in duration-300">
          {activeGroup.items.map(item => {
            const ItemIcon = item.icon;
            const isItemActive = workspaceTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setWorkspaceTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all duration-150 select-none ${
                  isItemActive
                    ? "bg-indigo-50/80 text-indigo-600 border-indigo-200/60 shadow-sm font-bold"
                    : "bg-white text-slate-400 border-slate-200/60 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ItemIcon size={13} className={isItemActive ? "text-indigo-500" : "text-slate-400"} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {workspaceTab === "dashboard" && (
        <>
          <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 py-5 md:px-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <TrendingUp size={12} className="text-indigo-500" />
                    Sales Workspace
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-slate-950">Ecosystem Analytics</h2>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 xl:w-180">
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
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                {workspaceCards.map(card => {
                  const Icon = card.icon;
                  const colors = cardColors[card.key] || cardColors.all;
                  return (
                    <button
                      key={card.key}
                      onClick={() => {
                        setLeadView(card.key);
                        setWorkspaceTab("leads");
                      }}
                      className={`group rounded-3xl border p-4 text-left transition-all duration-300 ${colors.border} bg-slate-50/50 hover:bg-white hover:shadow-md hover:-translate-y-0.5`}
                    >
                      <div className="flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center justify-between">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-colors duration-300 ${colors.iconBg}`}>
                            <Icon size={16} />
                          </div>
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-slate-900/5 dark:bg-white/5 text-slate-400">
                            {card.key === "all" ? "Live" : card.value > 0 ? "Active" : "Empty"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-[0.15em] line-clamp-1 text-slate-400">{card.label}</p>
                          <p className="text-2xl font-black tracking-tight text-slate-900">{card.value}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <CrmDashboardWidgets
            websiteId={websiteId}
            onOpenCustomer={(cId) => setActiveCustomer360Id(cId)}
            onOpenCalendar={() => setWorkspaceTab("calendar")}
            onViewCallAnalytics={() => setWorkspaceTab("bi")}
            onViewAllOpenTasks={() => setWorkspaceTab("calendar")}
            onExploreCompleteTimeline={() => setWorkspaceTab("workflow-history")}
          />

          <CrmReportsView
            summary={summary}
            onDrillDown={onDrillDown}
            activeRange={activeRange}
            setActiveRange={setActiveRange}
          />
        </>
      )}

      {workspaceTab === "leads" && (
        <>
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

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 xl:w-180">
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
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                {workspaceCards.map(card => {
                  const Icon = card.icon;
                  const active = leadView === card.key;
                  const colors = cardColors[card.key] || cardColors.all;
                  return (
                    <button
                      key={card.key}
                      onClick={() => setLeadView(card.key)}
                      className={`group rounded-3xl border p-4 text-left transition-all duration-300 ${
                        active 
                          ? `${colors.activeBorder} shadow-lg shadow-slate-900/5 scale-[1.03]` 
                          : `${colors.border} bg-slate-50/50 hover:bg-white hover:shadow-md hover:-translate-y-0.5`
                      }`}
                    >
                      <div className="flex flex-col h-full justify-between gap-4">
                        <div className="flex items-center justify-between">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-colors duration-300 ${
                            active ? colors.activeIconBg : colors.iconBg
                          }`}>
                            <Icon size={16} />
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-slate-900/5 dark:bg-white/5 ${
                            active ? "text-white/80" : "text-slate-400"
                          }`}>
                            {card.key === "all" ? "Live" : card.value > 0 ? "Active" : "Empty"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className={`text-[9px] font-black uppercase tracking-[0.15em] line-clamp-1 ${
                            active ? colors.activeLabel : colors.label
                          }`}>{card.label}</p>
                          <p className={`text-2xl font-black tracking-tight ${
                            active ? colors.activeValue : colors.value
                          }`}>{card.value}</p>
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
                  <>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-3 text-[10px] font-black uppercase text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <Download size={14} className="rotate-180 text-indigo-500" /> Import Leads
                    </button>
                    <button onClick={() => openCreateModal()} className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-[10px] font-black uppercase text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                      <Plus size={14} /> New Lead
                    </button>
                  </>
                )}
                {canManagePipeline && (
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
        </>
      )}

      {workspaceTab === "contacts" && (
        <CrmContactsView websiteId={websiteId} />
      )}

      {workspaceTab === "companies" && (
        <CrmCompaniesView websiteId={websiteId} />
      )}

      {workspaceTab === "deals" && (
        <CrmDealsView websiteId={websiteId} />
      )}

      {workspaceTab === "pipelines" && (
        <CrmPipelinesConfig websiteId={websiteId} />
      )}

      {workspaceTab === "calendar" && (
        <CrmCalendarView websiteId={websiteId} />
      )}

      {workspaceTab === "products" && (
        <CrmProductsView websiteId={websiteId} />
      )}

      {workspaceTab === "quotations" && (
        <CrmQuotationsView websiteId={websiteId} />
      )}

      {workspaceTab === "salesorders" && (
        <CrmSalesOrdersView websiteId={websiteId} />
      )}

      {workspaceTab === "finance" && (
        <CrmFinanceDashboard websiteId={websiteId} />
      )}

      {workspaceTab === "subscriptions" && (
        <CrmSubscriptionsView websiteId={websiteId} />
      )}

      {workspaceTab === "invoices" && (
        <CrmInvoicesView websiteId={websiteId} />
      )}

      {workspaceTab === "inbox" && (
        <CrmOmnichannelInbox websiteId={websiteId} />
      )}

      {workspaceTab === "canned" && (
        <CannedResponsesManager websiteId={websiteId} />
      )}

      {workspaceTab === "helpdesk" && (
        <CrmHelpdeskView websiteId={websiteId} />
      )}

      {workspaceTab === "success" && (
        <CrmCustomerSuccessView websiteId={websiteId} />
      )}

      {workspaceTab === "workflows" && (
        <CrmWorkflowBuilder websiteId={websiteId} />
      )}

      {workspaceTab === "workflow-history" && (
        <CrmWorkflowHistory websiteId={websiteId} />
      )}

      {workspaceTab === "ai" && (
        <CrmAiConsole websiteId={websiteId} />
      )}

      {workspaceTab === "bi" && (
        <CrmBiDashboard websiteId={websiteId} />
      )}

      {workspaceTab === "admin" && (
        <CrmAdminConsole websiteId={websiteId} />
      )}

      {workspaceTab === "meeting-platforms" && (
        <MeetingPlatformsManager websiteId={websiteId} />
      )}

      {workspaceTab === "developer" && (
        <CrmDeveloperConsole websiteId={websiteId} />
      )}

      {workspaceTab === "targets" && (
        <CrmSalesTargets websiteId={websiteId} teamMembers={teamMembers} />
      )}

      {workspaceTab === "feed" && (
        <CrmActivityFeed websiteId={websiteId} onOpenCustomer={openCustomer} />
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
        onUnlock={onUnlock}
        onPostWin={(updatedCustomer) => {
          syncCustomerState(updatedCustomer);
          setActionMessage({ type: "success", text: "Lead automatically moved to Won stage! 🏆" });
        }}
        teamMembers={teamMembers}
        onOpenFullProfile={(cId) => setActiveCustomer360Id(cId)}
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
        websites={websites}
      />
      <CrmStageEditor
        open={showStageEditor}
        onClose={() => setShowStageEditor(false)}
        onChangeStages={handleStagesChange}
        currentStages={websiteStages}
      />

      <CrmImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        websiteId={websiteId}
        teamMembers={teamMembers}
        currentUser={user}
        onSuccess={(msg) => {
          setActionMessage({ type: "success", text: msg });
          fetchCustomers();
        }}
      />

      {activeCustomer360Id && (
        <Customer360View
          customerId={activeCustomer360Id}
          websiteId={websiteId}
          onClose={() => setActiveCustomer360Id(null)}
        />
      )}
    </div>
  );
}
