import React from "react";
import { StickyNote, Send } from "lucide-react";

export default function NotesTab({ notes, newNote, setNewNote, onAddNote, savingNote }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && newNote?.trim() && !savingNote) {
      e.preventDefault();
      onAddNote();
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Add Note Composer */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Add Internal Note
          </span>
          <span className="text-[8.5px] font-medium text-slate-300">Ctrl+Enter to save</span>
        </div>
        <textarea
          rows={2}
          value={newNote || ""}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write private note for team members..."
          className="w-full p-2.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-[11px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none"
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={savingNote || !newNote?.trim()}
            onClick={onAddNote}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9.5px] font-bold uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Send size={10} />
            {savingNote ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-2">
        {notes?.length > 0 ? (
          notes.map((note, idx) => (
            <div
              key={note._id || idx}
              className="bg-white rounded-xl border border-slate-200/70 p-3 space-y-1 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">
                  {note.authorName || note.addedBy || "Team Note"}
                </span>
                <span className="text-[9px] font-medium text-slate-400">
                  {note.createdAt ? new Date(note.createdAt).toLocaleString() : "—"}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                {note.text || note.content || note.note}
              </p>
            </div>
          ))
        ) : (
          <div className="py-8 bg-white rounded-xl border border-dashed border-slate-200 text-center space-y-1.5">
            <StickyNote size={20} className="mx-auto text-slate-300" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              No internal notes yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
