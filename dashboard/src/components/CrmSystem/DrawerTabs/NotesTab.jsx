import React from "react";
import { Tag } from "lucide-react";

export default function NotesTab({ 
  notes, 
  newNote, 
  setNewNote, 
  onAddNote, 
  savingNote 
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-sm">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-3">Add Internal Note</p>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Record key lead requirements or conversation highlights..."
          rows={3}
          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none shadow-sm"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={onAddNote}
            disabled={savingNote || !newNote.trim()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
          >
            {savingNote ? "Recording..." : "Add Note"}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {notes?.length > 0 ? (
          [...notes].reverse().map((note, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[11px] font-medium text-slate-700 leading-relaxed mb-4">{note.text}</p>
              <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{note.authorName}</span>
                <span className="text-[9px] font-bold text-slate-300 uppercase">{new Date(note.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-slate-300">
            <Tag size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-[10px] font-black uppercase tracking-widest">No notes recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
