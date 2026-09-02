import React, { useState, useMemo } from "react";
import { Search, ChevronRight, MessageSquare, Check, Smile, Meh, Frown, Users } from "lucide-react";
import { cleanString } from "../../utils/stringUtils.js";

export default function SessionList({ 
  sessions = [], 
  searchTerm = "", 
  setSearchTerm, 
  selectedSessionId, 
  onSelectSession,
  selectedIds = [],
  toggleSelection,
  extraHeader = null
}) {
  const [statusFilter, setStatusFilter] = useState("all");

  const displayedSessions = useMemo(() => {
    return sessions.filter(session => {
      if (statusFilter === "active") return session.status !== "closed" && !session.archivedAt;
      if (statusFilter === "closed") return session.status === "closed" || session.archivedAt;
      return true;
    });
  }, [sessions, statusFilter]);

  const activeCount = useMemo(() => sessions.filter(s => s.status !== "closed" && !s.archivedAt).length, [sessions]);

  return (
    <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-100 dark:border-white/10 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Conversations</h3>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {activeCount} Active
            </span>
          </div>
          {extraHeader}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search visitor or messages..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {[
            { id: "all", label: `All (${sessions.length})` },
            { id: "active", label: `Active (${activeCount})` },
            { id: "closed", label: `Closed (${sessions.length - activeCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 border border-slate-200 dark:border-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {displayedSessions.map(session => {
          const isSelected = selectedSessionId === session.sessionId;
          const visitorName = cleanString(session.visitorId?.name) || cleanString(session.visitorId?.visitorId, 'Visitor');
          const siteName = session.websiteId?.websiteName || 'General Website';
          const timeStr = new Date(session.updatedAt || session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });


          return (
            <div
              key={session._id || session.sessionId}
              className="flex items-center gap-1.5 group"
            >
              {/* Multi-select Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(session.sessionId);
                }}
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ml-1 ${
                  selectedIds.includes(session.sessionId)
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 hover:border-slate-300"
                }`}
              >
                {selectedIds.includes(session.sessionId) && <Check size={11} />}
              </button>

              <div
                onClick={() => onSelectSession(session.sessionId)}
                className={`flex-1 p-3 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? "bg-indigo-50/70 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/30 shadow-sm"
                    : "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/15 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isSelected 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}>
                    {visitorName.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`text-xs font-bold truncate ${isSelected ? "text-indigo-900 dark:text-indigo-200" : "text-slate-800 dark:text-slate-200"}`}>
                        {visitorName}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {timeStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[130px]">
                        {siteName}
                      </span>
                      {session.unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                          {session.unreadCount}
                        </span>
                      )}
                      {session.sentimentLabel && (
                        <span className={`text-[10px] ml-auto ${
                          session.sentimentLabel === 'positive' ? 'text-emerald-600' :
                          session.sentimentLabel === 'negative' ? 'text-rose-500' : 'text-slate-400'
                        }`}>
                          {session.sentimentLabel === 'positive' && '😊'}
                          {session.sentimentLabel === 'neutral' && '😐'}
                          {session.sentimentLabel === 'negative' && '🚨'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-normal font-normal">
                      {session.lastMessagePreview || "Chat connected"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {sessions.length === 0 && (
          <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-300">
              <MessageSquare size={24} />
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No active conversations</p>
            <p className="text-xs text-slate-400">Incoming visitor chats will appear here in real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
}

