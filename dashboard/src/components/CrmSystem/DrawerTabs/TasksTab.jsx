import { CheckCircle2, Calendar, Clock, AlertTriangle } from "lucide-react";

export default function TasksTab({
  tasks,
  onUpdateTaskStatus,
  onBulkCompleteTasks,
  onDeleteOverdueTasks
}) {
  const isOverdue = (dueAt) => new Date(dueAt) < new Date() && new Date(dueAt).toDateString() !== new Date().toDateString();

  return (
    <div className="space-y-4">
      {tasks?.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={onBulkCompleteTasks}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
          >
            Complete All
          </button>
          <button
            onClick={onDeleteOverdueTasks}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
          >
            Delete Overdue
          </button>
        </div>
      )}
      {tasks?.length > 0 ? tasks.map(task => {
        const overdue = isOverdue(task.dueAt) && task.status !== "completed";

        return (
          <div key={task._id} className={`bg-white rounded-2xl border p-5 flex items-start gap-4 transition-all ${task.status === "completed" ? "bg-slate-50 opacity-60" :
              overdue ? "border-rose-200 bg-rose-50/30 shadow-md ring-1 ring-rose-100" :
                "border-slate-100 shadow-sm"
            }`}>
            <button
              onClick={() => task.status !== "completed" && onUpdateTaskStatus(task._id, "completed")}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${task.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" :
                  overdue ? "border-rose-400 text-transparent" :
                    "border-slate-200 text-transparent hover:border-indigo-400"
                }`}
            >
              <CheckCircle2 size={12} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className={`text-[11px] font-black uppercase tracking-tight ${task.status === "completed" ? "line-through text-slate-400" :
                    overdue ? "text-rose-700" :
                      "text-slate-900"
                  }`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2">
                  {overdue && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white text-[7px] font-black uppercase tracking-widest animate-pulse">
                      <AlertTriangle size={8} /> Overdue
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${overdue ? "bg-rose-100 text-rose-600" : "bg-amber-50 text-amber-600"
                    }`}>
                    {task.type}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-[9px] font-bold uppercase transition-colors group">
                <span className={`flex items-center gap-1 ${overdue ? "text-rose-500" : ""}`}>
                  <Calendar size={10} /> {new Date(task.dueAt).toLocaleDateString()}
                </span>
                <span className={`flex items-center gap-1 ${overdue ? "text-rose-500" : ""}`}>
                  <Clock size={10} /> {task.status}
                </span>
              </div>
            </div>
          </div>
        );
      }) : (
        <div className="py-16 text-center text-slate-300">
          <Clock size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-widest">Zero scheduled actions</p>
        </div>
      )}
    </div>
  );
}
