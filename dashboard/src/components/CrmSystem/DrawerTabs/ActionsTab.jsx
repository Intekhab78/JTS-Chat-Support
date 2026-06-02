import React from "react";
import { Phone, Clock, Calendar } from "lucide-react";

export default function ActionsTab({ 
  interactionType, 
  setInteractionType, 
  interactionNote, 
  setInteractionNote, 
  onLogInteraction, 
  interactionSaving,
  taskForm,
  setTaskForm,
  onCreateTask,
  taskSaving,
  canAssignOwners,
  teamMembers
}) {
  return (
    <div className="space-y-6 pb-12">
      {/* Log Interaction Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Phone size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Log Interaction</p>
            <p className="text-[9px] font-bold text-slate-400">Record a phone call, meeting or email.</p>
          </div>
        </div>
        <form onSubmit={onLogInteraction} className="space-y-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            {["call", "meeting", "manual_email"].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setInteractionType(type)}
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  interactionType === type ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
                }`}
              >
                {type === "manual_email" ? "Email" : type}
              </button>
            ))}
          </div>
          <textarea
            value={interactionNote}
            onChange={(e) => setInteractionNote(e.target.value)}
            placeholder={`What was the outcome of this ${interactionType}?`}
            rows={3}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none shadow-sm"
            required
          />
          <button
            type="submit"
            disabled={interactionSaving || !interactionNote.trim()}
            className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.22em] hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
          >
            {interactionSaving ? "Recording..." : "Log Interaction"}
          </button>
        </form>
      </div>

      {/* Schedule Task Section */}
      <div className="bg-white rounded-2xl border border-amber-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Schedule Task</p>
            <p className="text-[9px] font-bold text-slate-400">Plan a follow-up action for this lead.</p>
          </div>
        </div>
        <form onSubmit={onCreateTask} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Action Description</label>
            <input
              value={taskForm.title}
              onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Discuss proposal breakdown"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-amber-500/5"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</label>
              <select
                value={taskForm.type}
                onChange={(e) => setTaskForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-amber-500/5"
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="task">General</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Due Date</label>
              <input
                type="date"
                value={taskForm.dueAt}
                onChange={(e) => setTaskForm(prev => ({ ...prev, dueAt: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-[11px] text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-amber-500/5"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={taskSaving || !taskForm.title.trim() || !taskForm.dueAt}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.22em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
          >
            {taskSaving ? "Scheduling..." : "Create Action Task"}
          </button>
        </form>
      </div>
    </div>
  );
}
