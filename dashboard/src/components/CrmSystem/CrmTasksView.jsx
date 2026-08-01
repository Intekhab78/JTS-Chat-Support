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

export default function CrmTasksView({ onOpenCustomer, websiteId }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, due_today, overdue, completed
  const [typeFilter, setTypeFilter] = useState("all"); // all, FOLLOW_UP, CALL, MEETING, EMAIL, AUDIT
  const [priorityFilter, setPriorityFilter] = useState("all"); // all, high, medium, low
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "table"

  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", type: "FOLLOW_UP", dueAt: "", status: "pending", priority: "medium", ownerId: "" });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [createForm, setCreateForm] = useState({
    title: "",
    type: "FOLLOW_UP",
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

  const fetchTasks = async () => {
    setLoading(true);
    setError("");
    try {
      let url = `/api/crm/tasks/my?all=true`;
      if (websiteId) url += `&websiteId=${websiteId}`;
      if (ownerFilter !== "all") {
        url += `&ownerId=${ownerFilter}`;
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
      const data = await api("/api/crm/employees");
      setAgents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load agents", err);
    }
  };

  const fetchCustomers = async () => {
    try {
      let url = "/api/crm?limit=150";
      if (websiteId) url += `&websiteId=${websiteId}`;
      const res = await api(url);
      setCustomers(res.customers || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error(err);
    }
  };

  const isTaskOverdue = (dueAt, status) => {
    if (status === "completed") return false;
    if (!dueAt) return false;
    const due = new Date(dueAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const isTaskDueToday = (dueAt, status) => {
    if (status === "completed") return false;
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
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    const task = tasks.find(t => t._id === taskId);
    if (task) {
      const resolvedId = task.customerId?._id || task.customerId || task.websiteId;
      try {
        await api(`/api/crm/${resolvedId}/tasks/${taskId}`, {
          method: "DELETE"
        });
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
      type: task.type || "FOLLOW_UP",
      priority: task.priority || "medium",
      dueAt: task.dueAt ? new Date(task.dueAt).toISOString().split("T")[0] : "",
      status: task.status || "pending",
      ownerId: task.ownerId?._id || task.ownerId || ""
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
          ownerId: createForm.ownerId || user?._id,
          notes: createForm.notes,
          websiteId
        })
      });
      setSuccess("Task scheduled successfully!");
      setShowCreateModal(false);
      setCreateForm({ title: "", type: "FOLLOW_UP", priority: "medium", dueAt: "", customerId: "", ownerId: "", notes: "" });
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
      if (statusFilter === "pending" && task.status === "completed") return false;
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
  const pendingCount = tasks.filter(t => t.status !== "completed").length;
  const dueTodayCount = tasks.filter(t => isTaskDueToday(t.dueAt, t.status)).length;
  const overdueCount = tasks.filter(t => isTaskOverdue(t.dueAt, t.status)).length;
  const completedCount = tasks.filter(t => t.status === "completed").length;

  const getTypeIcon = (type) => {
    switch (String(type).toUpperCase()) {
      case "MEETING": return <Video size={14} className="text-violet-500" />;
      case "CALL": return <Phone size={14} className="text-amber-500" />;
      case "EMAIL": return <Mail size={14} className="text-sky-500" />;
      case "AUDIT": return <ShieldAlert size={14} className="text-rose-500" />;
      default: return <Clock size={14} className="text-indigo-500" />;
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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Executive Dark Gradient Banner Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-8 text-white shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles size={11} className="text-indigo-400 animate-pulse" /> Task Governance Console
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white uppercase">
              Follow-ups & Scheduled Activities
            </h1>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed font-bold">
              Real-time task tracking, SLA governance, and automated follow-up scheduling for seamless client management.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button 
              onClick={handleExportTasksCSV}
              className="flex items-center gap-1.5 px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-2xl transition-all"
              title="Export Tasks Hub to Excel CSV"
            >
              <Download size={14} /> Export CSV
            </button>
            <button 
              onClick={handleExportTasksPDF}
              className="flex items-center gap-1.5 px-4 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-2xl transition-all"
              title="Export Tasks Hub to PDF"
            >
              <Printer size={14} /> Export PDF
            </button>
            <button
              onClick={fetchTasks}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/10"
              title="Refresh Tasks"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} /> Schedule New Follow-Up
            </button>
          </div>
        </div>
      </div>

      {/* Metric KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("all")}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            statusFilter === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-xl"
              : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-widest ${statusFilter === "all" ? "text-slate-400" : "text-slate-400"}`}>Total Scheduled</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl"><Layers size={16} /></div>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight">{totalCount}</p>
          <p className={`text-[9px] font-bold mt-1 ${statusFilter === "all" ? "text-slate-400" : "text-slate-400"}`}>Active Task Registry</p>
        </div>

        <div
          onClick={() => setStatusFilter("due_today")}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            statusFilter === "due_today"
              ? "bg-amber-600 text-white border-amber-600 shadow-xl"
              : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-widest ${statusFilter === "due_today" ? "text-amber-100" : "text-amber-600"}`}>Due Today</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock size={16} /></div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-black tracking-tight">{dueTodayCount}</p>
            {dueTodayCount > 0 && <span className="text-[9px] font-black bg-amber-500/20 px-2 py-0.5 rounded-md animate-pulse">Action Needed</span>}
          </div>
          <p className={`text-[9px] font-bold mt-1 ${statusFilter === "due_today" ? "text-amber-100" : "text-slate-400"}`}>Require Attention Today</p>
        </div>

        <div
          onClick={() => setStatusFilter("overdue")}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            statusFilter === "overdue"
              ? "bg-rose-600 text-white border-rose-600 shadow-xl"
              : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-widest ${statusFilter === "overdue" ? "text-rose-100" : "text-rose-600"}`}>Overdue Tasks</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><AlertTriangle size={16} /></div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-2xl font-black tracking-tight">{overdueCount}</p>
            {overdueCount > 0 && <span className="text-[9px] font-black bg-rose-500/20 px-2 py-0.5 rounded-md animate-pulse">Critical SLA</span>}
          </div>
          <p className={`text-[9px] font-bold mt-1 ${statusFilter === "overdue" ? "text-rose-100" : "text-slate-400"}`}>Passed Target Deadline</p>
        </div>

        <div
          onClick={() => setStatusFilter("completed")}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${
            statusFilter === "completed"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xl"
              : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black uppercase tracking-widest ${statusFilter === "completed" ? "text-emerald-100" : "text-emerald-600"}`}>Completed</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={16} /></div>
          </div>
          <p className="text-2xl font-black mt-2 tracking-tight">{completedCount}</p>
          <p className={`text-[9px] font-bold mt-1 ${statusFilter === "completed" ? "text-emerald-100" : "text-slate-400"}`}>Successfully Closed</p>
        </div>
      </div>

      {/* System Toast Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold uppercase tracking-wide animate-in fade-in">
          <AlertTriangle size={16} className="text-rose-500" /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700 text-xs font-bold uppercase tracking-wide animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-500" /> {success}
        </div>
      )}

      {/* Filter and Control Console */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-200/80 shadow-sm space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {[
              { key: "all", label: `All (${totalCount})` },
              { key: "pending", label: `Pending (${pendingCount})` },
              { key: "due_today", label: `Due Today (${dueTodayCount})` },
              { key: "overdue", label: `Overdue (${overdueCount})` },
              { key: "completed", label: `Completed (${completedCount})` }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === tab.key
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
              title="Card Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
              title="Table Audit View"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Search & Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Live Search Bar */}
          <div className="relative col-span-1 lg:col-span-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search title, client, CRN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Activity Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="all">All Activity Types</option>
            <option value="FOLLOW_UP">Follow Up</option>
            <option value="CALL">Phone Call</option>
            <option value="MEETING">Meeting</option>
            <option value="EMAIL">Email</option>
            <option value="AUDIT">Post-Mortem / Audit</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Agent Filter (for Managers) */}
          {isManager && (
            <select
              value={ownerFilter}
              onChange={e => setOwnerFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all cursor-pointer"
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
        <div className="py-24 flex flex-col items-center justify-center gap-4 bg-white rounded-[32px] border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Synchronizing Scheduled Activities...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-[32px] border border-slate-200/80 p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-400">
            <Clock size={32} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">No Tasks Matching Filters</h4>
            <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto">Try clearing search terms or changing status/priority filter criteria.</p>
          </div>
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); setTypeFilter("all"); setPriorityFilter("all"); setOwnerFilter("all"); }}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Executive Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map(task => {
            const overdue = isTaskOverdue(task.dueAt, task.status);
            const dueToday = isTaskDueToday(task.dueAt, task.status);
            const isDone = task.status === "completed";

            return (
              <div
                key={task._id}
                className={`group relative bg-white rounded-[28px] p-6 border transition-all duration-300 hover:shadow-xl flex flex-col justify-between space-y-5 ${
                  isDone
                    ? "border-slate-200/60 bg-slate-50/40 opacity-75"
                    : overdue
                    ? "border-rose-200 hover:border-rose-300 bg-gradient-to-b from-rose-50/20 to-white"
                    : dueToday
                    ? "border-amber-200 hover:border-amber-300 bg-gradient-to-b from-amber-50/20 to-white"
                    : "border-slate-200/80 hover:border-indigo-200"
                }`}
              >
                <div className="space-y-4">
                  {/* Top Badges Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        {getTypeIcon(task.type)}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        {task.type || "FOLLOW_UP"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Priority Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                        task.priority === "high" || task.priority === "critical"
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : task.priority === "medium"
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {task.priority || "Medium"}
                      </span>

                      {/* Status Badge */}
                      {isDone ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-wider border border-emerald-200">
                          Completed
                        </span>
                      ) : overdue ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider animate-pulse">
                          Overdue
                        </span>
                      ) : dueToday ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider animate-pulse">
                          Due Today
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-wider border border-indigo-100">
                          Open
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Task Title */}
                  <h4 className={`text-base font-black text-slate-900 leading-snug tracking-tight ${isDone ? "line-through text-slate-400" : ""}`}>
                    {task.title}
                  </h4>

                  {/* Related Lead / Client Card */}
                  {task.customerId && (
                    <div
                      onClick={() => onOpenCustomer && onOpenCustomer(task.customerId, "tasks")}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all cursor-pointer flex items-center justify-between group/lead"
                    >
                      <div className="min-w-0 pr-2 space-y-0.5">
                        <p className="text-[11px] font-black text-slate-800 group-hover/lead:text-indigo-600 truncate transition-colors">
                          {task.customerId.name}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                          {task.customerId.companyName || task.customerId.crn || "Client Profile"}
                        </p>
                      </div>
                      <ArrowRight size={13} className="text-slate-300 group-hover/lead:text-indigo-500 group-hover/lead:translate-x-1 transition-all shrink-0" />
                    </div>
                  )}

                  {/* Due Date & Owner */}
                  <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-500 pt-1 gap-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className={overdue ? "text-rose-500" : dueToday ? "text-amber-500" : "text-slate-400"} />
                      <span className={overdue ? "text-rose-600 font-black" : dueToday ? "text-amber-600 font-black" : "text-slate-700"}>
                        {task.dueAt ? new Date(task.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No Date"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100/70 px-2.5 py-1 rounded-xl text-[10px] font-extrabold text-slate-600">
                      <User size={11} className="text-slate-400" />
                      <span className="truncate max-w-[100px]">{task.ownerId ? task.ownerId.name : "Unassigned"}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-2">
                  {!isDone ? (
                    <button
                      onClick={() => handleUpdateStatus(task._id, "completed")}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-100"
                    >
                      <CheckCircle2 size={13} /> Complete
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(task._id, "pending")}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Reopen Task
                    </button>
                  )}

                  <button
                    onClick={() => {
                      exportSingleRecordPDF(
                        `TASK ACTION ITEM - ${task.title}`,
                        {
                          "Task Title": task.title,
                          "Task Type": task.type || "FOLLOW_UP",
                          "Priority": (task.priority || "medium").toUpperCase(),
                          "Status": (task.status || "pending").toUpperCase(),
                          "Due Date": task.dueAt ? new Date(task.dueAt).toLocaleString() : "No Date",
                          "Assigned Agent": task.ownerId ? task.ownerId.name : "Unassigned",
                          "Notes / Instructions": task.notes || "-"
                        },
                        `Task_${(task.title || "Record").replace(/\s+/g, '_')}`
                      );
                    }}
                    className="p-2.5 bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-xl transition-all border border-slate-100"
                    title="Export Single Task PDF"
                  >
                    <Printer size={14} />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(task)}
                    className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-all border border-slate-100"
                    title="Edit Task"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(task._id)}
                    className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-all border border-slate-100"
                    title="Delete Task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Audit Table View */
        <div className="bg-white border border-slate-200/80 rounded-[32px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Task Activity</th>
                  <th className="px-6 py-4">Related Lead / Customer</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Owner / Agent</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredTasks.map(task => {
                  const overdue = isTaskOverdue(task.dueAt, task.status);
                  const isDone = task.status === "completed";

                  return (
                    <tr key={task._id} className={`hover:bg-slate-50/50 transition-colors ${isDone ? "bg-slate-50/30 opacity-70" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className={`font-black text-slate-800 ${isDone ? "line-through text-slate-400" : ""}`}>
                            {task.title}
                          </p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
                            {getTypeIcon(task.type)} {task.type || "FOLLOW_UP"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {task.customerId ? (
                          <div className="space-y-0.5">
                            <button
                              onClick={() => onOpenCustomer && onOpenCustomer(task.customerId, "tasks")}
                              className="text-indigo-600 hover:text-indigo-800 font-black uppercase text-left flex items-center gap-1 group"
                            >
                              {task.customerId.name}
                              <Eye size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest">{task.customerId.companyName || task.customerId.crn}</p>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-slate-400" />
                          <span className={overdue ? "text-rose-600 font-black" : ""}>
                            {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "No Date"}
                          </span>
                          {overdue && (
                            <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 text-[7px] font-black uppercase tracking-widest animate-pulse">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                          task.priority === "high" || task.priority === "critical"
                            ? "bg-rose-100 text-rose-700"
                            : task.priority === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {task.priority || "Medium"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User size={12} className="text-slate-400" />
                          <span>{task.ownerId ? task.ownerId.name : "Unassigned"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isDone && (
                            <button
                              onClick={() => handleUpdateStatus(task._id, "completed")}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border border-emerald-200"
                            >
                              Complete
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(task)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all border border-indigo-100"
                            title="Edit"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(task._id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-100"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
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

      {/* Create Task Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] p-4 sm:p-6 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto" onClick={() => setShowCreateModal(false)} />
          <div className="relative z-10 pointer-events-auto w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 sm:px-8 py-5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Schedule New Follow-Up</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Assign activity to consultant & set due date</p>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="px-6 sm:px-8 py-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Related Lead / Customer</label>
                <select
                  required
                  value={createForm.customerId}
                  onChange={e => setCreateForm({ ...createForm, customerId: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-2.5 text-xs font-bold text-slate-800 outline-none"
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
                  placeholder="e.g. Follow up on VAT filing documents"
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-2.5 text-xs font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Activity Type</label>
                  <select
                    value={createForm.type}
                    onChange={e => setCreateForm({ ...createForm, type: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2.5 text-xs font-bold outline-none"
                  >
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="MEETING">Meeting</option>
                    <option value="CALL">Phone Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="AUDIT">Post-Mortem / Audit</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Priority Level</label>
                  <select
                    value={createForm.priority}
                    onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2.5 text-xs font-bold outline-none"
                  >
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical</option>
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
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-2.5 text-xs font-bold outline-none"
                />
              </div>

              {isManager && agents.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assign to Consultant / Agent</label>
                  <select
                    value={createForm.ownerId}
                    onChange={e => setCreateForm({ ...createForm, ownerId: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-2.5 text-xs font-bold outline-none"
                  >
                    <option value="">Assign to Me ({user?.name})</option>
                    {agents.map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <button type="submit" className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all mt-2">
                + Save & Schedule Activity
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Task Modal */}
      {editingTask && createPortal(
        <div className="fixed inset-0 z-[9999] p-4 sm:p-6 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto" onClick={() => setEditingTask(null)} />
          <div className="relative z-10 pointer-events-auto w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-6 sm:px-8 py-5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Edit Task Details</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Update title, activity type, due date or status</p>
              </div>
              <button type="button" onClick={() => setEditingTask(null)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="px-6 sm:px-8 py-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Related Customer / Lead</label>
                <input
                  disabled
                  value={editingTask.customerId?.name ? `${editingTask.customerId.name} (${editingTask.customerId.companyName || editingTask.customerId.crn || "Client"})` : "General Task"}
                  className="w-full bg-slate-100/70 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Task Title / Description</label>
                <input
                  required
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-2.5 text-xs font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Activity Type</label>
                  <select
                    value={editForm.type}
                    onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2.5 text-xs font-bold outline-none"
                  >
                    <option value="FOLLOW_UP">Follow Up</option>
                    <option value="MEETING">Meeting</option>
                    <option value="CALL">Phone Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="AUDIT">Post-Mortem / Audit</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Priority Level</label>
                  <select
                    value={editForm.priority}
                    onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2.5 text-xs font-bold outline-none"
                  >
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2.5 text-xs font-bold outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.dueAt}
                    onChange={e => setEditForm({ ...editForm, dueAt: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2.5 text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {isManager && agents.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assign to Consultant / Agent</label>
                  <select
                    value={editForm.ownerId}
                    onChange={e => setEditForm({ ...editForm, ownerId: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-2.5 text-xs font-bold outline-none"
                  >
                    <option value="">Unassigned</option>
                    {agents.map(a => (
                      <option key={a._id} value={a._id}>{a.name} ({a.role})</option>
                    ))}
                  </select>
                </div>
              )}

              <button type="submit" className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all mt-2">
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
