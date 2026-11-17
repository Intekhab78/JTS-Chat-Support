import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2, Clock, AlertTriangle, Search, Trash2, Calendar, User, Eye, X, Edit3,
  Plus, Filter, LayoutGrid, List, Sparkles, Phone, Video, Mail, ShieldAlert, ArrowRight,
  Tag, AlertCircle, RefreshCw, Layers, Download, Printer
} from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";
import PaginationControls from "../PaginationControls.jsx";
import { getPaginationMeta } from "../../utils/pagination.js";

export default function CrmTasksView({ onOpenCustomer, websiteId }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, due_today, overdue, completed
  const [typeFilter, setTypeFilter] = useState("all"); // all, follow_up, call, meeting, email, demo, quotation, custom
  const [priorityFilter, setPriorityFilter] = useState("all"); // all, urgent, high, medium, low
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"
  const [page, setPage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", type: "follow_up", dueAt: "", status: "open", priority: "medium", ownerId: "", notes: "" });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [createForm, setCreateForm] = useState({
    title: "",
    type: "follow_up",
    priority: "medium",
    dueAt: "",
    customerId: "",
    ownerId: "",
    notes: ""
  });

  const isManager = ["admin", "client", "manager", "management"].includes(user?.role);

  useEffect(() => {
    fetchTasks();
  }, [ownerFilter, websiteId]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, priorityFilter, ownerFilter, websiteId]);

  useEffect(() => {
    if (showCreateModal || editingTask) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showCreateModal, editingTask]);

  useEffect(() => {
    if (isManager) {
      fetchAgents();
    }
    fetchCustomers();
  }, [websiteId]);

  const isValidWebsiteId = (id) =>
    Boolean(id && id !== "all" && id !== "undefined" && id !== "null");

  const fetchTasks = async () => {
    setLoading(true);
    setError("");
    try {
      let url = `/api/crm/tasks/my${isManager ? "?all=true" : ""}`;
      const sep = url.includes("?") ? "&" : "?";
      if (isValidWebsiteId(websiteId)) url += `${sep}websiteId=${encodeURIComponent(websiteId)}`;
      if (ownerFilter !== "all") {
        url += `${url.includes("?") ? "&" : "?"}ownerId=${encodeURIComponent(ownerFilter)}`;
      }
      const data = await api(url);
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to synchronize scheduled tasks.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const url = isValidWebsiteId(websiteId)
        ? `/api/crm/employees?websiteId=${encodeURIComponent(websiteId)}`
        : "/api/crm/employees";
      const data = await api(url);
      setAgents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load agents", err);
    }
  };

  const fetchCustomers = async () => {
    try {
      let url = "/api/crm?limit=150";
      if (isValidWebsiteId(websiteId)) url += `&websiteId=${encodeURIComponent(websiteId)}`;
      const res = await api(url);
      const list = res.customers || (Array.isArray(res) ? res : []);
      setCustomers(
        list.filter((c) => {
          if (!c || c.isAnonymous) return false;
          const email = String(c.email || "").trim().toLowerCase();
          if (email.endsWith("@visitor.local") || email.startsWith("anon-visitor")) return false;
          const name = String(c.name || "").trim().toLowerCase();
          if (!name || name === "anonymous" || name === "anonymous visitor" || name === "anonymous user" || name === "visitor" || name === "guest" || name.startsWith("anon-")) {
            return false;
          }
          return true;
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const isTaskOverdue = (dueAt, status) => {
    if (status === "completed" || status === "cancelled") return false;
    if (!dueAt) return false;
    const due = new Date(dueAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const isTaskDueToday = (dueAt, status) => {
    if (status === "completed" || status === "cancelled") return false;
    if (!dueAt) return false;
    const due = new Date(dueAt).toDateString();
    const today = new Date().toDateString();
    return due === today;
  };

  const handleUpdateStatus = async (taskId, nextStatus) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      if (task) {
        const resolvedId = task.customerId?._id || task.customerId || task.websiteId;
        await api(`/api/crm/${resolvedId}/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus })
        });
        setSuccess(nextStatus === "completed" ? "Task marked as completed!" : "Task status updated!");
        fetchTasks();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update task status");
    }
  };

  const handleDelete = async (taskId) => {
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      const resolvedId = task.customerId?._id || task.customerId || task.websiteId;
      try {
        await api(`/api/crm/${resolvedId}/tasks/${taskId}`, {
          method: "DELETE"
        });
        setConfirmDeleteId(null);
        setSuccess("Task deleted successfully!");
        fetchTasks();
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        console.error(err);
        setError("Failed to delete task");
      }
    }
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title || "",
      type: (task.type || "follow_up").toLowerCase(),
      priority: (task.priority || "medium").toLowerCase(),
      dueAt: task.dueAt ? new Date(task.dueAt).toISOString().split("T")[0] : "",
      status: task.status || "open",
      ownerId: task.ownerId?._id || task.ownerId || "",
      notes: task.notes || ""
    });
  };

  const handleSaveEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      const resolvedId = editingTask.customerId?._id || editingTask.customerId || editingTask.websiteId;
      await api(`/api/crm/${resolvedId}/tasks/${editingTask._id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm)
      });
      setSuccess("Task updated successfully!");
      setEditingTask(null);
      fetchTasks();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update task");
    }
  };

  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title || !createForm.dueAt || !createForm.customerId) {
      setError("Please fill all required fields");
      return;
    }
    try {
      await api(`/api/crm/${createForm.customerId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: createForm.title,
          type: createForm.type,
          priority: createForm.priority,
          dueAt: createForm.dueAt,
          ownerId: createForm.ownerId || user?._id || "",
          notes: createForm.notes
        })
      });
      setSuccess("Task scheduled successfully!");
      setShowCreateModal(false);
      setCreateForm({ title: "", type: "follow_up", priority: "medium", dueAt: "", customerId: "", ownerId: "", notes: "" });
      fetchTasks();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to create task");
    }
  };

  // Filtered tasks computation
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status Filter
      if (statusFilter === "pending" && (task.status === "completed" || task.status === "cancelled")) return false;
      if (statusFilter === "completed" && task.status !== "completed") return false;
      if (statusFilter === "overdue" && !isTaskOverdue(task.dueAt, task.status)) return false;
      if (statusFilter === "due_today" && !isTaskDueToday(task.dueAt, task.status)) return false;

      // Type Filter
      if (typeFilter !== "all" && String(task.type || "").toUpperCase() !== typeFilter.toUpperCase()) return false;

      // Priority Filter
      if (priorityFilter !== "all" && String(task.priority || "medium").toLowerCase() !== priorityFilter.toLowerCase()) return false;

      // Search Query Filter
      if (search.trim() !== "") {
        const q = search.toLowerCase();
        const titleMatch = task.title?.toLowerCase().includes(q);
        const notesMatch = task.notes?.toLowerCase().includes(q);
        const nameMatch = task.customerId?.name?.toLowerCase().includes(q);
        const compMatch = task.customerId?.companyName?.toLowerCase().includes(q);
        const crnMatch = task.customerId?.crn?.toLowerCase().includes(q);
        const agentMatch = task.ownerId?.name?.toLowerCase().includes(q);
        if (!titleMatch && !notesMatch && !nameMatch && !compMatch && !crnMatch && !agentMatch) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, statusFilter, typeFilter, priorityFilter, search]);

  // Statistics
  const totalCount = tasks.length;
  const pendingCount = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled").length;
  const dueTodayCount = tasks.filter(t => isTaskDueToday(t.dueAt, t.status)).length;
  const overdueCount = tasks.filter(t => isTaskOverdue(t.dueAt, t.status)).length;
  const completedCount = tasks.filter(t => t.status === "completed").length;

  const getTypeIcon = (type) => {
    switch (String(type).toLowerCase()) {
      case "meeting": return <Video size={13} className="text-violet-500" />;
      case "call": return <Phone size={13} className="text-amber-500" />;
      case "email": return <Mail size={13} className="text-sky-500" />;
      case "demo": return <Sparkles size={13} className="text-emerald-500" />;
      case "quotation": return <Tag size={13} className="text-cyan-500" />;
      case "custom": return <ShieldAlert size={13} className="text-rose-500" />;
      default: return <Clock size={13} className="text-indigo-500" />;
    }
  };

  const handleExportTasksCSV = () => {
    const data = filteredTasks.map(t => ({
      "Task Title": t.title || "-",
      "Type": t.type || "FOLLOW_UP",
      "Priority": (t.priority || "medium").toUpperCase(),
      "Due Date": t.dueAt ? new Date(t.dueAt).toLocaleString() : "-",
      "Status": (t.status || "pending").toUpperCase(),
      "Assigned Agent": t.ownerId?.name || t.ownerName || "Unassigned",
      "Client": t.customerId?.companyName || t.customerId?.name || "-"
    }));
    exportToCSV(data, `Tasks_Governance_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportTasksPDF = () => {
    const data = filteredTasks.map(t => ({
      "Title": t.title || "-",
      "Type": t.type || "FOLLOW_UP",
      "Priority": (t.priority || "medium").toUpperCase(),
      "Due Date": t.dueAt ? new Date(t.dueAt).toLocaleDateString() : "-",
      "Status": (t.status || "pending").toUpperCase()
    }));
    exportToPDF(data, `Tasks_Governance_Report_${new Date().toISOString().slice(0, 10)}`, "TASKS & GOVERNANCE ACTION ITEMS REPORT");
  };

  return (
            <div className="space-y-3 bg-white">
              {/* Clean White Compact Header */}
              <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2.5 border-slate-100 bg-white">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase">
                      Follow-ups &amp; Scheduled Activities
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-wider border border-indigo-100">
                      Task Hub
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Real-time task tracking, SLA governance, and automated follow-up scheduling
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    onClick={handleExportTasksCSV}
                    disabled={filteredTasks.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
                    title="Export Tasks Hub to CSV"
                  >
                    <Download size={12} /> CSV
                  </button>
                  <button
                    onClick={handleExportTasksPDF}
                    disabled={filteredTasks.length === 0}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
                    title="Export Tasks Hub to PDF"
                  >
                    <Printer size={12} /> PDF
                  </button>
                  <button
                    onClick={fetchTasks}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                    title="Refresh Tasks"
                  >
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider shadow-xs transition-all flex items-center gap-1"
                  >
                    <Plus size={12} /> Schedule Follow-Up
                  </button>
                </div>
              </div>

                {/* Compact White KPI Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div
                    onClick={() => setStatusFilter("all")}
                    className={`p-3 rounded-xl border bg-white transition-all cursor-pointer ${statusFilter === "all"
                        ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-xs"
                        : "border-slate-200/80 hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400">
                        Total Scheduled
                      </span>
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Layers size={13} />
                      </div>
                    </div>
                    <p className="text-base font-black text-slate-900 mt-1">{totalCount}</p>
                    <p className="text-[9px] font-semibold text-slate-400">Active Task Registry</p>
                  </div>

                  <div
                    onClick={() => setStatusFilter("due_today")}
                    className={`p-3 rounded-xl border bg-white transition-all cursor-pointer ${statusFilter === "due_today"
                        ? "border-amber-500 ring-2 ring-amber-500/10 shadow-xs"
                        : "border-slate-200/80 hover:border-slate-300"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-600">
                        Due Today
                      </span>
                      <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock size={13} />
                      </div>
                    </div>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <p className="text-base font-black text-slate-900">{dueTodayCount}</p>
                        {dueTodayCount > 0 && (
                          <span className="text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded uppercase">
                            Action
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] font-semibold text-slate-400">Require Attention Today</p>
                    </div>

                    <div
                      onClick={() => setStatusFilter("overdue")}
                      className={`p-3 rounded-xl border bg-white transition-all cursor-pointer ${statusFilter === "overdue"
                          ? "border-rose-500 ring-2 ring-rose-500/10 shadow-xs"
                          : "border-slate-200/80 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-rose-600">
                          Overdue Tasks
                        </span>
                        <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                          <AlertTriangle size={13} />
                        </div>
                      </div>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <p className="text-base font-black text-rose-700">{overdueCount}</p>
                          {overdueCount > 0 && (
                            <span className="text-[8px] font-black bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded uppercase">
                              Critical SLA
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-semibold text-slate-400">Passed Target Deadline</p>
                      </div>

                      <div
                        onClick={() => setStatusFilter("completed")}
                        className={`p-3 rounded-xl border bg-white transition-all cursor-pointer ${statusFilter === "completed"
                            ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-xs"
                            : "border-slate-200/80 hover:border-slate-300"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-600">
                            Completed
                          </span>
                          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                            <CheckCircle2 size={13} />
                          </div>
                        </div>
                        <p className="text-base font-black text-emerald-700 mt-1">{completedCount}</p>
                        <p className="text-[9px] font-semibold text-slate-400">Successfully Closed</p>
                      </div>
                    </div>

                    {/* System Toast Messages */}
                    {error && (
                      <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-rose-700 text-[11px] font-bold">
                        <span className="flex items-center gap-2"><AlertTriangle size={14} className="text-rose-500 shrink-0" /> {error}</span>
                        <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-700"><X size={13} /></button>
                      </div>
                    )}
                    {success && (
                      <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-emerald-700 text-[11px] font-bold">
                        <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> {success}</span>
                        <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-emerald-700"><X size={13} /></button>
                      </div>
                    )}

                    {/* Filter and Control Console */}
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm space-y-3">
                      {/* Status Filter Tabs */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                          {[
                            { key: "all", label: `All (${totalCount})` },
                            { key: "pending", label: `Open (${pendingCount})` },
                            { key: "due_today", label: `Due Today (${dueTodayCount})` },
                            { key: "overdue", label: `Overdue (${overdueCount})` },
                            { key: "completed", label: `Completed (${completedCount})` }
                          ].map(tab => (
                            <button
                              key={tab.key}
                              onClick={() => setStatusFilter(tab.key)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === tab.key
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* View Mode Switcher */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                          <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-md text-xs font-bold transition-all ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                            title="Card Grid View"
                          >
                            <LayoutGrid size={14} />
                          </button>
                          <button
                            onClick={() => setViewMode("table")}
                            className={`p-1.5 rounded-md text-xs font-bold transition-all ${viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
                            title="Table Audit View"
                          >
                            <List size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Search & Secondary Filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {/* Live Search Bar */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input
                            type="text"
                            placeholder="Search title, client, CRN..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                          />
                        </div>

                        {/* Activity Type Filter */}
                        <select
                          value={typeFilter}
                          onChange={e => setTypeFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                        >
                          <option value="all">All Activity Types</option>
                          <option value="follow_up">Follow Up</option>
                          <option value="call">Phone Call</option>
                          <option value="meeting">Meeting</option>
                          <option value="email">Email</option>
                          <option value="demo">Product Demo</option>
                          <option value="quotation">Quotation</option>
                          <option value="custom">Custom / Audit</option>
                        </select>

                        {/* Priority Filter */}
                        <select
                          value={priorityFilter}
                          onChange={e => setPriorityFilter(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                        >
                          <option value="all">All Priorities</option>
                          <option value="urgent">Urgent Priority</option>
                          <option value="high">High Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="low">Low Priority</option>
                        </select>

                        {/* Agent Filter (for Managers) */}
                        {isManager && (
                          <select
                            value={ownerFilter}
                            onChange={e => setOwnerFilter(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                          >
                            <option value="all">All Consultants / Agents</option>
                            {agents.map(agent => (
                              <option key={agent._id} value={agent._id}>{agent.name} ({agent.role})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Main Content Area: Cards Grid or Table */}
                    {loading ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200/80">
                        <div className="w-8 h-8 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Synchronizing Scheduled Activities...</p>
                      </div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="py-12 text-center bg-white rounded-2xl border border-slate-200/80 p-5 space-y-2.5">
                        <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-400">
                          <Clock size={22} />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">No Tasks Matching Filters</h4>
                          <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto">Try clearing search terms or changing status/priority filter criteria.</p>
                        </div>
                        <button
                          onClick={() => { setSearch(""); setStatusFilter("all"); setTypeFilter("all"); setPriorityFilter("all"); setOwnerFilter("all"); }}
                          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Reset Filters
                        </button>
                      </div>
                    ) : viewMode === "grid" ? (
                      /* Executive Cards Grid */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {getPaginationMeta(filteredTasks, page, 12).pageItems.map(task => {
                          const overdue = isTaskOverdue(task.dueAt, task.status);
                          const dueToday = isTaskDueToday(task.dueAt, task.status);
                          const isDone = task.status === "completed";

                          return (
                            <div
                              key={task._id}
                              className={`group relative bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md flex flex-col justify-between space-y-3 ${isDone
                                ? "border-slate-200/60 bg-slate-50/40 opacity-75"
                                : overdue
                                  ? "border-rose-200 hover:border-rose-300 bg-gradient-to-b from-rose-50/20 to-white"
                                  : dueToday
                                    ? "border-amber-200 hover:border-amber-300 bg-gradient-to-b from-amber-50/20 to-white"
                                    : "border-slate-200/80 hover:border-indigo-200"
                                }`}
                            >
                              <div className="space-y-2.5">
                                {/* Top Badges Row */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                      {getTypeIcon(task.type)}
                                    </span>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                                      {(task.type || "follow_up").replace(/_/g, " ")}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {/* Priority Badge */}
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${task.priority === "high" || task.priority === "urgent"
                                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                                      : task.priority === "medium"
                                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                                        : "bg-slate-100 text-slate-600"
                                      }`}>
                                      {task.priority || "medium"}
                                    </span>

                                    {/* Status Badge */}
                                    {isDone ? (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-wider border border-emerald-200">
                                        Completed
                                      </span>
                                    ) : overdue ? (
                                      <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider">
                                        Overdue
                                      </span>
                                    ) : dueToday ? (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider">
                                        Due Today
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-wider border border-indigo-100">
                                        {(task.status || "open").replace(/_/g, " ")}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Task Title & Notes */}
                                <div>
                                  <h4 className={`text-sm font-black text-slate-900 leading-snug tracking-tight ${isDone ? "line-through text-slate-400" : ""}`}>
                                    {task.title}
                                  </h4>
                                  {task.notes && (
                                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-snug">{task.notes}</p>
                                  )}
                                </div>

                                {/* Related Lead / Client Card */}
                                {task.customerId && (
                                  <div
                                    onClick={() => onOpenCustomer && onOpenCustomer(task.customerId, "tasks")}
                                    className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-100 hover:border-indigo-100 transition-all cursor-pointer flex items-center justify-between group/lead"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <p className="text-[11px] font-black text-slate-800 group-hover/lead:text-indigo-600 truncate transition-colors">
                                        {task.customerId.name}
                                      </p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                        {task.customerId.companyName || task.customerId.crn || "Client Profile"}
                                      </p>
                                    </div>
                                    <ArrowRight size={12} className="text-slate-300 group-hover/lead:text-indigo-500 group-hover/lead:translate-x-0.5 transition-all shrink-0" />
                                  </div>
                                )}

                                {/* Due Date & Owner */}
                                <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-slate-500 pt-0.5 gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar size={12} className={overdue ? "text-rose-500" : dueToday ? "text-amber-500" : "text-slate-400"} />
                                    <span className={overdue ? "text-rose-600 font-black" : dueToday ? "text-amber-600 font-black" : "text-slate-700"}>
                                      {task.dueAt ? new Date(task.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No Date"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 bg-slate-100/70 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600">
                                    <User size={10} className="text-slate-400" />
                                    <span className="truncate max-w-[100px]">{task.ownerId ? task.ownerId.name : "Unassigned"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Actions Bar */}
                              <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-1.5">
                                {confirmDeleteId === task._id ? (
                                  <div className="flex items-center gap-1.5 w-full">
                                    <button
                                      onClick={() => handleDelete(task._id)}
                                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                    >
                                      Confirm Delete
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    {!isDone ? (
                                      <button
                                        onClick={() => handleUpdateStatus(task._id, "completed")}
                                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm"
                                      >
                                        <CheckCircle2 size={12} /> Complete
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleUpdateStatus(task._id, "open")}
                                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                      >
                                        Reopen
                                      </button>
                                    )}

                                    <button
                                      onClick={() => {
                                        exportSingleRecordPDF(
                                          `TASK ACTION ITEM - ${task.title}`,
                                          {
                                            "Task Title": task.title,
                                            "Task Type": task.type || "follow_up",
                                            "Priority": (task.priority || "medium").toUpperCase(),
                                            "Status": (task.status || "open").toUpperCase(),
                                            "Due Date": task.dueAt ? new Date(task.dueAt).toLocaleString() : "No Date",
                                            "Assigned Agent": task.ownerId ? task.ownerId.name : "Unassigned",
                                            "Notes / Instructions": task.notes || "-"
                                          },
                                          `Task_${(task.title || "Record").replace(/\s+/g, '_')}`
                                        );
                                      }}
                                      className="p-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg transition-all border border-slate-100"
                                      title="Export Single Task PDF"
                                    >
                                      <Printer size={13} />
                                    </button>

                                    <button
                                      onClick={() => handleOpenEdit(task)}
                                      className="p-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-all border border-slate-100"
                                      title="Edit Task"
                                    >
                                      <Edit3 size={13} />
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(task._id)}
                                      className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-all border border-slate-100"
                                      title="Delete Task"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Audit Table View */
                      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-left">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                <th className="px-4 py-2.5">Task Activity</th>
                                <th className="px-4 py-2.5">Related Lead / Customer</th>
                                <th className="px-4 py-2.5">Due Date</th>
                                <th className="px-4 py-2.5">Priority</th>
                                <th className="px-4 py-2.5">Owner / Agent</th>
                                <th className="px-4 py-2.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                              {getPaginationMeta(filteredTasks, page, 12).pageItems.map(task => {
                                const overdue = isTaskOverdue(task.dueAt, task.status);
                                const isDone = task.status === "completed";

                                return (
                                  <tr key={task._id} className={`hover:bg-slate-50/50 transition-colors ${isDone ? "bg-slate-50/30 opacity-70" : ""}`}>
                                    <td className="px-4 py-2.5">
                                      <div className="space-y-0.5">
                                        <p className={`font-black text-slate-800 ${isDone ? "line-through text-slate-400" : ""}`}>
                                          {task.title}
                                        </p>
                                        <p className="text-[9px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                          {getTypeIcon(task.type)} {(task.type || "follow_up").replace(/_/g, " ")}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      {task.customerId ? (
                                        <div className="space-y-0.5">
                                          <button
                                            onClick={() => onOpenCustomer && onOpenCustomer(task.customerId, "tasks")}
                                            className="text-indigo-600 hover:text-indigo-800 font-black uppercase text-left flex items-center gap-1 group"
                                          >
                                            {task.customerId.name}
                                            <Eye size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </button>
                                          <p className="text-[9px] text-slate-400 uppercase tracking-wider">{task.customerId.companyName || task.customerId.crn}</p>
                                        </div>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <div className="flex items-center gap-1.5">
                                        <Calendar size={11} className="text-slate-400" />
                                        <span className={overdue ? "text-rose-600 font-black" : ""}>
                                          {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "No Date"}
                                        </span>
                                        {overdue && (
                                          <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 text-[8px] font-black uppercase tracking-wider">
                                            Overdue
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${task.priority === "high" || task.priority === "urgent"
                                        ? "bg-rose-100 text-rose-700"
                                        : task.priority === "medium"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-slate-100 text-slate-600"
                                        }`}>
                                        {task.priority || "medium"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <div className="flex items-center gap-1.5">
                                        <User size={11} className="text-slate-400" />
                                        <span>{task.ownerId ? task.ownerId.name : "Unassigned"}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        {confirmDeleteId === task._id ? (
                                          <>
                                            <button
                                              onClick={() => handleDelete(task._id)}
                                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase rounded-lg transition-all"
                                            >
                                              Confirm
                                            </button>
                                            <button
                                              onClick={() => setConfirmDeleteId(null)}
                                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] font-black uppercase rounded-lg transition-all"
                                            >
                                              Cancel
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            {!isDone ? (
                                              <button
                                                onClick={() => handleUpdateStatus(task._id, "completed")}
                                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all border border-emerald-200"
                                              >
                                                Complete
                                              </button>
                                            ) : (
                                              <button
                                                onClick={() => handleUpdateStatus(task._id, "open")}
                                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all"
                                              >
                                                Reopen
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleOpenEdit(task)}
                                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-all border border-indigo-100"
                                              title="Edit"
                                            >
                                              <Edit3 size={12} />
                                            </button>
                                            <button
                                              onClick={() => setConfirmDeleteId(task._id)}
                                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all border border-rose-100"
                                              title="Delete"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {!loading && filteredTasks.length > 0 && (() => {
                      const paged = getPaginationMeta(filteredTasks, page, 12);
                      return (
                        <div className="pt-2">
                          <PaginationControls
                            currentPage={paged.currentPage}
                            totalPages={paged.totalPages}
                            totalItems={paged.totalItems}
                            itemLabel="tasks"
                            onPageChange={setPage}
                          />
                        </div>
                      );
                    })()}

                    {/* Create Task Modal */}
                    {showCreateModal && createPortal(
                      <div className="fixed inset-0 z-[9999] p-4 flex items-center justify-center pointer-events-none">
                        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto" onClick={() => setShowCreateModal(false)} />
                        <div className="relative z-10 pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
                          <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 shrink-0">
                            <div>
                              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Schedule New Follow-Up</h3>
                              <p className="text-[10px] font-medium text-slate-400 mt-0.5">Assign activity to consultant & set due date</p>
                            </div>
                            <button type="button" onClick={() => setShowCreateModal(false)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"><X size={16} /></button>
                          </div>

                          <form onSubmit={handleCreateTaskSubmit} className="px-5 py-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Related Lead / Customer</label>
                              <select
                                required
                                value={createForm.customerId}
                                onChange={e => setCreateForm({ ...createForm, customerId: e.target.value })}
                                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                              >
                                <option value="">-- Choose Lead / Customer --</option>
                                {customers.map(c => (
                                  <option key={c._id} value={c._id}>{c.name} ({c.companyName || c.crn || "Client"})</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Task Title / Description</label>
                              <input
                                required
                                minLength={3}
                                placeholder="e.g. Follow up on VAT filing documents"
                                value={createForm.title}
                                onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Activity Type</label>
                                <select
                                  value={createForm.type}
                                  onChange={e => setCreateForm({ ...createForm, type: e.target.value })}
                                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                                >
                                  <option value="follow_up">Follow Up</option>
                                  <option value="meeting">Meeting</option>
                                  <option value="call">Phone Call</option>
                                  <option value="email">Email</option>
                                  <option value="demo">Product Demo</option>
                                  <option value="quotation">Quotation</option>
                                  <option value="custom">Custom / Audit</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Priority Level</label>
                                <select
                                  value={createForm.priority}
                                  onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                                >
                                  <option value="medium">Medium Priority</option>
                                  <option value="high">High Priority</option>
                                  <option value="urgent">Urgent</option>
                                  <option value="low">Low Priority</option>
                                </select>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Due Date</label>
                              <input
                                type="date"
                                required
                                value={createForm.dueAt}
                                onChange={e => setCreateForm({ ...createForm, dueAt: e.target.value })}
                                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Notes / Instructions</label>
                              <textarea
                                rows={2}
                                placeholder="Optional context or action notes..."
                                value={createForm.notes}
                                onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500 resize-none"
                              />
                            </div>

                            {isManager && agents.length > 0 && (
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assign to Consultant / Agent</label>
                                <select
                                  value={createForm.ownerId}
                                  onChange={e => setCreateForm({ ...createForm, ownerId: e.target.value })}
                                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                                >
                                  <option value="">Assign to Me ({user?.name})</option>
                                  {agents.map(a => (
                                    <option key={a._id} value={a._id}>{a.name} ({a.role})</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all">
                              + Save & Schedule Activity
                            </button>
                          </form>
                        </div>
                      </div>,
                      document.body
                    )}

                    {/* Edit Task Modal */}
                    {editingTask && createPortal(
                      <div className="fixed inset-0 z-[9999] p-4 flex items-center justify-center pointer-events-none">
                        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto" onClick={() => setEditingTask(null)} />
                        <div className="relative z-10 pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
                          <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 shrink-0">
                            <div>
                              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Edit Task Details</h3>
                              <p className="text-[10px] font-medium text-slate-400 mt-0.5">Update title, activity type, due date or status</p>
                            </div>
                            <button type="button" onClick={() => setEditingTask(null)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"><X size={16} /></button>
                          </div>

                          <form onSubmit={handleSaveEditSubmit} className="px-5 py-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Related Customer / Lead</label>
                              <input
                                disabled
                                value={editingTask.customerId?.name ? `${editingTask.customerId.name} (${editingTask.customerId.companyName || editingTask.customerId.crn || "Client"})` : "General Task"}
                                className="w-full bg-slate-100/70 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 cursor-not-allowed"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Task Title / Description</label>
                              <input
                                required
                                minLength={3}
                                value={editForm.title}
                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Activity Type</label>
                                <select
                                  value={editForm.type}
                                  onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                                >
                                  <option value="follow_up">Follow Up</option>
                                  <option value="meeting">Meeting</option>
                                  <option value="call">Phone Call</option>
                                  <option value="email">Email</option>
                                  <option value="demo">Product Demo</option>
                                  <option value="quotation">Quotation</option>
                                  <option value="custom">Custom / Audit</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Priority Level</label>
                                <select
                                  value={editForm.priority}
                                  onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                                >
                                  <option value="medium">Medium Priority</option>
                                  <option value="high">High Priority</option>
                                  <option value="urgent">Urgent</option>
                                  <option value="low">Low Priority</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</label>
                                <select
                                  value={editForm.status}
                                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                                >
                                  <option value="open">Open</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Due Date</label>
                                <input
                                  type="date"
                                  required
                                  value={editForm.dueAt}
                                  onChange={e => setEditForm({ ...editForm, dueAt: e.target.value })}
                                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Notes / Instructions</label>
                              <textarea
                                rows={2}
                                placeholder="Optional context or action notes..."
                                value={editForm.notes}
                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500 resize-none"
                              />
                            </div>

                            {isManager && agents.length > 0 && (
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assign to Consultant / Agent</label>
                                <select
                                  value={editForm.ownerId}
                                  onChange={e => setEditForm({ ...editForm, ownerId: e.target.value })}
                                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                                >
                                  <option value="">Unassigned</option>
                                  {agents.map(a => (
                                    <option key={a._id} value={a._id}>{a.name} ({a.role})</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all">
                              Save Task Changes
                            </button>
                          </form>
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                  );
}
