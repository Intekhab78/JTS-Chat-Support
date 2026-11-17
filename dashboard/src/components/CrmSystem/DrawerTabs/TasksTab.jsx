import React from "react";
import { Check, CheckCircle2, Clock, Trash2 } from "lucide-react";

export default function TasksTab({
  tasks = [],
  onUpdateTaskStatus,
  onBulkCompleteTasks,
  onDeleteOverdueTasks,
}) {
  const isOverdue = (dueAt, status) => {
    if (!dueAt || status === "completed") return false;
    const due = new Date(dueAt);
    if (Number.isNaN(due.getTime())) return false;
    const now = new Date();
    return due < now && due.toDateString() !== now.toDateString();
  };

  const pendingCount = tasks.filter((t) => t.status !== "completed").length;
  const overdueCount = tasks.filter((t) => isOverdue(t.dueAt, t.status)).length;
  const completedCount = tasks.length - pendingCount;

  return (
    <div className="space-y-2.5">
      {/* Compact Summary & Contextual Bulk Actions */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/70 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[9.5px] font-bold">
            <span className="text-slate-600">{pendingCount} Pending</span>
            {overdueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100">
                {overdueCount} Overdue
              </span>
            )}
            <span className="text-emerald-600">{completedCount} Done</span>
          </div>

          {(pendingCount > 0 || overdueCount > 0) && (
            <div className="flex items-center gap-1.5">
              {pendingCount > 0 && onBulkCompleteTasks && (
                <button
                  type="button"
                  onClick={onBulkCompleteTasks}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[9px] font-bold uppercase tracking-wider hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <CheckCircle2 size={11} /> Complete All
                </button>
              )}
              {overdueCount > 0 && onDeleteOverdueTasks && (
                <button
                  type="button"
                  onClick={onDeleteOverdueTasks}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/80 text-[9px] font-bold uppercase tracking-wider hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <Trash2 size={11} /> Delete Overdue
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {tasks.length > 0 ? (
          tasks.map((task) => {
            const done = task.status === "completed";
            const overdue = isOverdue(task.dueAt, task.status);
            const dueLabel = task.dueAt && !Number.isNaN(new Date(task.dueAt).getTime())
              ? new Date(task.dueAt).toLocaleDateString()
              : "No due date";

            return (
              <div
                key={task._id}
                className={`bg-white rounded-xl border p-2.5 flex items-center justify-between gap-2.5 transition-all ${overdue
                    ? "border-rose-200/80 bg-rose-50/20"
                    : "border-slate-200/70 hover:border-slate-300"
                  }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => onUpdateTaskStatus(task._id, done ? "pending" : "completed")}
                    title={done ? "Mark as pending" : "Mark as completed"}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${done
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-slate-300 bg-white hover:border-indigo-500"
                      }`}
                  >
                    {done && <Check size={10} strokeWidth={3} />}
                  </button>

                  <div className="min-w-0 space-y-0.5">
                    <p
                      className={`text-[11px] font-bold truncate ${done ? "line-through text-slate-400" : "text-slate-800"
                        }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-semibold">
                      <span className={overdue ? "text-rose-600" : "text-slate-400"}>
                        Due: {dueLabel}
                      </span>
                      {overdue && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[8px] font-bold uppercase">
                          Overdue
                        </span>
                      )}
                      {task.priority && (
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${task.priority === "high"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                            : "bg-slate-100 text-slate-500"
                          }`}>
                          {task.priority}
                        </span>
                      )}
                      {task.type && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 text-[8px] font-bold uppercase">
                          {task.type.replace("_", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 bg-white rounded-xl border border-dashed border-slate-200 text-center space-y-1.5">
            <Clock size={20} className="mx-auto text-slate-300" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              No scheduled tasks
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
