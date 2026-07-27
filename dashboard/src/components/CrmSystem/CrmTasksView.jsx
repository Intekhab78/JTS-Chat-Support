import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, AlertTriangle, Search, Trash2, Calendar, User, Eye, X, Edit3 } from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function CrmTasksView({ onOpenCustomer, websiteId }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending"); // pending, completed, all
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", type: "FOLLOW_UP", dueAt: "", status: "pending", ownerId: "" });

  const isManager = ["admin", "client", "manager"].includes(user?.role);

  useEffect(() => {
    fetchTasks();
  }, [ownerFilter, websiteId]);

  useEffect(() => {
    if (isManager) {
      fetchAgents();
    }
  }, []);

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
      setError("Failed to load tasks");
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

  const handleUpdateStatus = async (taskId, nextStatus) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      if (task) {
        const resolvedId = task.customerId?._id || task.customerId || task.websiteId;
        await api(`/api/crm/${resolvedId}/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus })
        });
        setSuccess("Task updated successfully!");
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

  const isOverdue = (dueAt, status) => {
    return status !== "completed" && new Date(dueAt) < new Date() && new Date(dueAt).toDateString() !== new Date().toDateString();
  };

  const filteredTasks = tasks.filter(task => {
    // Status Filter
    if (statusFilter === "pending" && task.status === "completed") return false;
    if (statusFilter === "completed" && task.status !== "completed") return false;

    // Search Filter
    const titleMatch = task.title?.toLowerCase().includes(search.toLowerCase());
    const customerMatch = task.customerId?.name?.toLowerCase().includes(search.toLowerCase()) || 
                          task.customerId?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
                          task.customerId?.crn?.toLowerCase().includes(search.toLowerCase());
    return titleMatch || customerMatch;
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [createForm, setCreateForm] = useState({
    title: "",
    type: "FOLLOW_UP",
    dueAt: "",
    customerId: "",
    ownerId: "",
    notes: ""
  });

  useEffect(() => {
    fetchCustomers();
  }, [websiteId]);

  const fetchCustomers = async () => {
    try {
      let url = "/api/crm?limit=100";
      if (websiteId) url += `&websiteId=${websiteId}`;
      const res = await api(url);
      setCustomers(res.customers || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error(err);
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
          dueAt: createForm.dueAt,
          ownerId: createForm.ownerId || user?._id,
          notes: createForm.notes,
          websiteId
        })
      });
      setSuccess("Task created successfully!");
      setShowCreateModal(false);
      setCreateForm({ title: "", type: "FOLLOW_UP", dueAt: "", customerId: "", ownerId: "", notes: "" });
      fetchTasks();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to create task");
    }
  };

  const pendingCount = tasks.filter(t => t.status !== "completed").length;
  const overdueCount = tasks.filter(t => isOverdue(t.dueAt, t.status)).length;
  const completedCount = tasks.filter(t => t.status === "completed").length;

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Global Task Hub</h2>
            {overdueCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider animate-pulse">
                {overdueCount} Overdue
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage, assign and track client follow-ups across the ecosystem</p>
        </div>

        {/* Filters, Search and Create Task */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search tasks or leads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold w-56 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
            />
          </div>

          {isManager && (
            <select
              value={ownerFilter}
              onChange={e => setOwnerFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm text-slate-700"
            >
              <option value="all">All Agents</option>
              {agents.map(agent => (
                <option key={agent._id} value={agent._id}>{agent.name} ({agent.role})</option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-100 transition-all"
          >
            + Create Task
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold uppercase tracking-wide">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-xs font-bold uppercase tracking-wide">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {/* Status Filter Tabs with Counts */}
      <div className="flex bg-white p-1 border border-slate-200/60 rounded-2xl max-w-md shadow-sm">
        {[
          { key: "pending", label: `Pending (${pendingCount})` },
          { key: "completed", label: `Completed (${completedCount})` },
          { key: "all", label: `All (${tasks.length})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              statusFilter === tab.key
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task List Grid/Table */}
      <div className="bg-white border border-slate-200/80 rounded-[32px] overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <span className="animate-spin w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Syncing workflows...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-20 text-center text-slate-300">
            <Clock className="mx-auto mb-4 opacity-25" size={40} />
            <p className="text-[11px] font-black uppercase tracking-widest">No tasks logged matching criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Task Details</th>
                  <th className="px-6 py-4">Related Lead</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Owner / Agent</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredTasks.map(task => {
                  const overdue = isOverdue(task.dueAt, task.status);
                  return (
                    <tr key={task._id} className={`hover:bg-slate-50/50 transition-colors ${task.status === "completed" ? "bg-slate-50/30 opacity-70" : ""}`}>
                      {/* Task details */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className={`font-black text-slate-800 ${task.status === "completed" ? "line-through text-slate-400" : ""}`}>
                            {task.title}
                          </p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wide">Type: {task.type}</p>
                        </div>
                      </td>
                      {/* Customer info */}
                      <td className="px-6 py-4">
                        {task.customerId ? (
                          <div className="space-y-1">
                            <button
                              onClick={() => onOpenCustomer(task.customerId, "tasks")}
                              className="text-indigo-600 hover:text-indigo-800 font-extrabold uppercase text-left flex items-center gap-1 group"
                            >
                              {task.customerId.name}
                              <Eye size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest">{task.customerId.crn}</p>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      {/* Due Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-slate-400" />
                          <span className={overdue ? "text-rose-600 font-black" : ""}>
                            {new Date(task.dueAt).toLocaleDateString()}
                          </span>
                          {overdue && (
                            <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 text-[7px] font-black uppercase tracking-widest animate-pulse">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Agent info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User size={12} className="text-slate-400" />
                          <span>{task.ownerId ? task.ownerId.name : "Unassigned"}</span>
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {task.status !== "completed" && (
                            <button
                              onClick={() => handleUpdateStatus(task._id, "completed")}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border border-emerald-200"
                            >
                              Complete
                            </button>
                          )}
                          <button
                            title="Edit Task Details"
                            onClick={() => handleOpenEdit(task)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all border border-indigo-100"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            title="Delete Task"
                            onClick={() => handleDelete(task._id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all border border-rose-100"
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
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <form onSubmit={handleCreateTaskSubmit} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b pb-4 border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Create Global Follow-Up Task</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Assign task to agent & schedule due date</p>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><X size={16} /></button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Related Lead / Customer</label>
              <select
                required
                value={createForm.customerId}
                onChange={e => setCreateForm({ ...createForm, customerId: e.target.value })}
                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
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
                placeholder="e.g. Follow up on proposal & contract sign-off"
                value={createForm.title}
                onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Activity Type</label>
                <select
                  value={createForm.type}
                  onChange={e => setCreateForm({ ...createForm, type: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold"
                >
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="MEETING">Meeting</option>
                  <option value="CALL">Phone Call</option>
                  <option value="EMAIL">Email Exchange</option>
                  <option value="AUDIT">Post-Mortem / Audit</option>
                  <option value="OTHER">Other Task</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Due Date</label>
                <input
                  type="date"
                  required
                  value={createForm.dueAt}
                  onChange={e => setCreateForm({ ...createForm, dueAt: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold"
                />
              </div>
            </div>

            {isManager && agents.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assign to Agent</label>
                <select
                  value={createForm.ownerId}
                  onChange={e => setCreateForm({ ...createForm, ownerId: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold"
                >
                  <option value="">Assign to Me ({user?.name})</option>
                  {agents.map(a => (
                    <option key={a._id} value={a._id}>{a.name} ({a.role})</option>
                  ))}
                </select>
              </div>
            )}

            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all">
              + Save & Schedule Task
            </button>
          </form>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setEditingTask(null)} />
          <form onSubmit={handleSaveEditSubmit} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b pb-4 border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Edit Task Details</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Update title, activity type, due date or status</p>
              </div>
              <button type="button" onClick={() => setEditingTask(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><X size={16} /></button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Related Customer / Lead</label>
              <input
                disabled
                value={editingTask.customerId?.name ? `${editingTask.customerId.name} (${editingTask.customerId.companyName || editingTask.customerId.crn || "Client"})` : "General Task"}
                className="w-full bg-slate-100/70 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Task Title / Description</label>
              <input
                required
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Activity Type</label>
                <select
                  value={editForm.type}
                  onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold"
                >
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="MEETING">Meeting</option>
                  <option value="CALL">Phone Call</option>
                  <option value="EMAIL">Email Exchange</option>
                  <option value="AUDIT">Post-Mortem / Audit</option>
                  <option value="OTHER">Other Task</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Due Date</label>
              <input
                type="date"
                required
                value={editForm.dueAt}
                onChange={e => setEditForm({ ...editForm, dueAt: e.target.value })}
                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold"
              />
            </div>

            {isManager && agents.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assign to Agent</label>
                <select
                  value={editForm.ownerId}
                  onChange={e => setEditForm({ ...editForm, ownerId: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold"
                >
                  <option value="">Unassigned</option>
                  {agents.map(a => (
                    <option key={a._id} value={a._id}>{a.name} ({a.role})</option>
                  ))}
                </select>
              </div>
            )}

            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all">
              Save Task Changes
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
