import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, AlertTriangle, Search, Trash2, Calendar, User, Eye, X } from "lucide-react";
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

  const isManager = ["admin", "client", "manager"].includes(user?.role);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, ownerFilter, websiteId]);

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
      if (statusFilter === "pending") {
        url += `&status=pending`;
      } else if (statusFilter === "completed") {
        url += `&status=completed`;
      }
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

  const isOverdue = (dueAt, status) => {
    return status !== "completed" && new Date(dueAt) < new Date() && new Date(dueAt).toDateString() !== new Date().toDateString();
  };

  const filteredTasks = tasks.filter(task => {
    const titleMatch = task.title?.toLowerCase().includes(search.toLowerCase());
    const customerMatch = task.customerId?.name?.toLowerCase().includes(search.toLowerCase()) || 
                          task.customerId?.companyName?.toLowerCase().includes(search.toLowerCase()) ||
                          task.customerId?.crn?.toLowerCase().includes(search.toLowerCase());
    return titleMatch || customerMatch;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Global Task Hub</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage and track follow-ups across the ecosystem</p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search tasks or leads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold w-64 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
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

      {/* Status Filter Tabs */}
      <div className="flex bg-white p-1 border border-slate-200/60 rounded-xl max-w-sm shadow-sm">
        {["pending", "completed", "all"].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
              statusFilter === status
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {status}
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
    </div>
  );
}
