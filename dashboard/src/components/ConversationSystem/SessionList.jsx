import React from "react";
import { Search, ChevronRight, MessageSquare, Check, Smile, Meh, Frown } from "lucide-react";
import { cleanString } from "../../utils/stringUtils.js";

export default function SessionList({ 
  sessions, 
  searchTerm, 
  setSearchTerm, 
  selectedSessionId, 
  onSelectSession,
  selectedIds,
  toggleSelection,
  extraHeader = null
}) {
  return (
    <div className="lg:col-span-4 premium-card p-0 flex flex-col border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden transition-colors">
      <div className="p-8 border-b border-slate-50 dark:border-white/5 space-y-5 bg-slate-50/20 dark:bg-black/10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="heading-md dark:text-white">Active Streams</h3>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em]">{sessions.length} Live Connections</span>
            </div>
          </div>
          {extraHeader}
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter frequency spectrum..."
            className="w-full bg-white dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl pl-10 pr-4 py-3.5 text-[11px] font-black focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 dark:text-white uppercase tracking-wider"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/10 dark:bg-black/5 custom-scrollbar">
        {sessions.map(session => (
          <div
            key={session._id}
            className="flex items-center gap-3 group"
          >
            {/* Multi-select Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSelection(session.sessionId);
              }}
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                selectedIds.includes(session.sessionId)
                  ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100 dark:shadow-none"
                  : "border-slate-100 dark:border-white/5 bg-white dark:bg-black/20"
              }`}
            >
              {selectedIds.includes(session.sessionId) && <Check size={12} className="text-white" />}
            </button>

            <div
              onClick={() => onSelectSession(session.sessionId)}
              className={`flex-1 p-5 rounded-[24px] border transition-all duration-500 cursor-pointer relative overflow-hidden ${
                selectedSessionId === session.sessionId
                  ? "bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/30 shadow-2xl translate-x-1"
                  : "bg-white/50 dark:bg-white/5 border-slate-50 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10"
              }`}
            >
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <strong className={`text-[10px] font-black tracking-[0.15em] block uppercase transition-colors shrink-0 ${selectedSessionId === session.sessionId ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-slate-200'}`}>
                    {session.websiteId?.websiteName || 'Global Source'}
                  </strong>
                  <div className="flex items-center gap-2">
                    {session.unreadCount > 0 ? (
                      <span className="rounded-md bg-rose-500 px-2 py-0.5 text-[8px] font-black text-white">{session.unreadCount}</span>
                    ) : null}
                    {session.sentimentLabel && (
                      <span className={`flex items-center justify-center p-1 rounded-md ${
                        session.sentimentLabel === 'positive' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' :
                        session.sentimentLabel === 'negative' ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' :
                        'text-slate-400 bg-slate-50 dark:bg-white/5'
                      }`}>
                        {session.sentimentLabel === 'positive' && <Smile size={10} />}
                        {session.sentimentLabel === 'neutral' && <Meh size={10} />}
                        {session.sentimentLabel === 'negative' && <Frown size={10} />}
                      </span>
                    )}
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${selectedSessionId === session.sessionId ? 'bg-indigo-600 text-white' : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5'}`}>
                      {new Date(session.updatedAt || session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-all ${selectedSessionId === session.sessionId ? 'bg-indigo-600 text-white shadow-lg rotate-3' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                    {(cleanString(session.visitorId?.name) || cleanString(session.visitorId?.visitorId) || 'AN').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-900 dark:text-slate-300 font-black tracking-widest uppercase truncate block">
                      {cleanString(session.visitorId?.name) || cleanString(session.visitorId?.visitorId, 'Anonymous User')}
                    </span>
                    {session.lastMessagePreview ? (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 opacity-80 font-bold mt-0.5">
                        {session.lastMessagePreview}
                      </p>
                    ) : (
                      <span className="text-[9px] text-slate-300 dark:text-slate-700 font-bold uppercase tracking-widest">Waiting for signal...</span>
                    )}
                  </div>
                  <ChevronRight size={14} className={`text-slate-200 dark:text-slate-800 group-hover:text-indigo-500 transition-colors ${selectedSessionId === session.sessionId ? 'opacity-0' : ''}`} />
                </div>
              </div>
              {selectedSessionId === session.sessionId && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]" />
              )}
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-center py-24 text-slate-300 dark:text-slate-800 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shadow-inner">
              <MessageSquare size={32} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">Zero active transmissions</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-300 dark:text-slate-800">Stand by for incoming signals...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
