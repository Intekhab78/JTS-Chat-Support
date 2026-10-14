import { useState, useEffect, useMemo } from "react";
import { 
  Search, Filter, Calendar, Download, ChevronRight, User, Globe, MessageSquare, 
  X, Clock, Star, ShieldCheck, Bot, Sparkles, FileText, CheckCircle2, Ticket, RefreshCw, Eye
} from "lucide-react";
import { api, apiUrl } from "../api/client.js";
import ChatPanel from "./ChatPanel.jsx";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { useToast } from "../context/ToastContext.jsx";

export default function ConversationHistory() {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterWebsite, setFilterWebsite] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, closed, ticket, high_rating

  // Metadata for dropdowns
  const [websites, setWebsites] = useState([]);
  const [agents, setAgents] = useState([]);

  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [page, setPage] = useState(1);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("searchTerm", searchTerm);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (filterWebsite) params.append("websiteId", filterWebsite);
      if (filterAgent) params.append("agentId", filterAgent);

      const data = await api(`/api/chat/history?${params.toString()}`);
      setSessions(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err) {
      toast.error("Failed to load conversation history: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api("/api/websites").catch(() => []),
      api("/api/users/agents").catch(() => [])
    ]).then(([w, a]) => {
      setWebsites(Array.isArray(w) ? w : []);
      setAgents(Array.isArray(a) ? a : []);
    });

    fetchHistory();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setFilterWebsite("");
    setFilterAgent("");
    setStatusFilter("all");
    setTimeout(fetchHistory, 50);
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append("searchTerm", searchTerm);
    if (filterWebsite) params.append("websiteId", filterWebsite);
    if (filterAgent) params.append("agentId", filterAgent);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    window.open(await apiUrl(`/api/analytics/export/csv?${params.toString()}`), "_blank");
  };

  const viewSession = async (session) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    try {
      const data = await api(`/api/chat/sessions/${session.sessionId}/messages`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load conversation messages: " + err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Filter sessions locally for quick status pills
  const filteredSessions = useMemo(() => {
    if (!statusFilter || statusFilter === "all") return sessions;
    if (statusFilter === "closed") return sessions.filter(s => s.status === "closed");
    if (statusFilter === "ticket") return sessions.filter(s => !!s.ticketId);
    if (statusFilter === "rating") return sessions.filter(s => (s.satisfactionRating || 0) >= 4);
    if (statusFilter === "ai") return sessions.filter(s => s.botMetadata?.handledByAi || !s.assignedAgent);
    return sessions;
  }, [sessions, statusFilter]);

  // Quick stats calculation
  const totalCount = sessions.length;
  const closedCount = sessions.filter(s => s.status === "closed").length;
  const ticketCount = sessions.filter(s => !!s.ticketId).length;
  const ratedCount = sessions.filter(s => (s.satisfactionRating || 0) > 0);
  const avgRating = ratedCount.length 
    ? (ratedCount.reduce((acc, s) => acc + (s.satisfactionRating || 0), 0) / ratedCount.length).toFixed(1)
    : "5.0";

  return (
    <div className="space-y-3.5 animate-in fade-in duration-500">
      
      {/* ── Compact Header & KPI Metrics Bar ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-4 py-3.5 sm:px-5 sm:py-4 text-white border border-indigo-500/20 shadow-md">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-60 h-60 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] font-black uppercase tracking-wider rounded-md border border-indigo-500/30 inline-flex items-center gap-1">
                <ShieldCheck size={11} className="text-indigo-400" /> Secure Audit Trail
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              Historical Conversation Archive & Transcripts
            </h2>
            <p className="text-[11px] text-slate-300 font-medium leading-normal">
              Audit, review transcripts, track resolution times, and inspect visitor intelligence across all websites.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Metrics */}
            <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-0.5">Archived</span>
                <span className="text-xs font-black text-white">{totalCount}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block leading-none mb-0.5">Resolved</span>
                <span className="text-xs font-black text-white">{closedCount}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest block leading-none mb-0.5">Avg Rating</span>
                <span className="text-xs font-black text-amber-300 flex items-center gap-0.5">⭐ {avgRating}</span>
              </div>
            </div>

            <button
              onClick={handleExport}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 shrink-0"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Compact Multi-Filter Bar ── */}
      <form onSubmit={handleSearch} className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Search Input */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search visitor, email, or message..."
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Website Dropdown */}
        <div className="w-auto min-w-[130px]">
          <select
            value={filterWebsite}
            onChange={e => setFilterWebsite(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="">All Websites</option>
            {websites.map(w => <option key={w._id} value={w._id}>{w.websiteName}</option>)}
          </select>
        </div>

        {/* Agent Dropdown */}
        <div className="w-auto min-w-[120px]">
          <select
            value={filterAgent}
            onChange={e => setFilterAgent(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="">All Agents</option>
            {agents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 rounded-xl px-2 py-1 text-xs">
          <Calendar size={12} className="text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none w-24"
          />
          <span className="text-slate-400 text-[10px]">→</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none w-24"
          />
        </div>

        {/* Filter Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="submit"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1"
          >
            <Filter size={11} /> Filter
          </button>
          {(searchTerm || startDate || endDate || filterWebsite || filterAgent || statusFilter !== "all") && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title="Reset all filters"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>

      </form>

      {/* ── Quick Status Scope Tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar text-xs">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${statusFilter === "all" ? "bg-slate-900 text-white shadow-xs" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 hover:bg-slate-50"}`}
        >
          All Records ({totalCount})
        </button>
        <button
          onClick={() => setStatusFilter("closed")}
          className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${statusFilter === "closed" ? "bg-emerald-600 text-white shadow-xs" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 hover:bg-slate-50"}`}
        >
          <CheckCircle2 size={11} /> Resolved ({closedCount})
        </button>
        <button
          onClick={() => setStatusFilter("ticket")}
          className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${statusFilter === "ticket" ? "bg-indigo-600 text-white shadow-xs" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 hover:bg-slate-50"}`}
        >
          <Ticket size={11} /> Tickets ({ticketCount})
        </button>
        <button
          onClick={() => setStatusFilter("rating")}
          className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${statusFilter === "rating" ? "bg-amber-500 text-white shadow-xs" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 hover:bg-slate-50"}`}
        >
          <Star size={11} /> 4+ Star Ratings ({ratedCount.length})
        </button>
      </div>

      {/* ── Rich Enterprise Table ── */}
      {(() => {
        const paginatedSessions = getPaginationMeta(filteredSessions, page);
        return (
          <>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-white/5">
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Date & Session</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Visitor Profile</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Website / Channel</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Handled By</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status & Rating</th>
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs font-bold">
                    {paginatedSessions.pageItems.map(session => {
                      const visitor = session.visitorId;
                      const visitorName = visitor?.name || "Anonymous Visitor";
                      const visitorEmail = visitor?.email || visitor?.visitorId || "No email";
                      const rating = session.satisfactionRating || 0;
                      const dateObj = new Date(session.createdAt);

                      return (
                        <tr key={session._id} className="hover:bg-indigo-50/30 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => viewSession(session)}>
                          
                          {/* Date & Time */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {dateObj.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                <Clock size={10} /> {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>

                          {/* Visitor Profile */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs">
                                {visitorName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                                  {visitorName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold truncate">
                                  {visitorEmail}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Website / Channel */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200/60 dark:border-white/5">
                              <Globe size={11} className="text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{session.websiteId?.websiteName || "UAE Invoicing"}</span>
                            </div>
                          </td>

                          {/* Handled By */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {session.assignedAgent?.name ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>{session.assignedAgent.name}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black border border-indigo-200/60">
                                <Bot size={11} className="text-indigo-500" />
                                <span>AI Bot</span>
                              </div>
                            )}
                          </td>

                          {/* Status & Rating */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                session.status === "closed"
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200"
                                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                              }`}>
                                {session.status === "closed" ? "Resolved" : "Active"}
                              </span>
                              {rating > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-amber-500 text-[11px] font-black">
                                  ★ {rating}
                                </span>
                              )}
                              {session.ticketId && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                                  🎫 Ticket
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Inspect Button */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => { e.stopPropagation(); viewSession(session); }}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-600 dark:text-slate-300 rounded-xl transition-all text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border border-slate-200/60 dark:border-white/5"
                            >
                              <Eye size={12} /> Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredSessions.length === 0 && !loading && (
                  <div className="py-20 text-center space-y-2">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                      <Search size={24} />
                    </div>
                    <p className="text-xs font-black text-slate-700 dark:text-white">No historical conversations found</p>
                    <p className="text-[11px] text-slate-400 font-bold">Try clearing filters or search terms.</p>
                  </div>
                )}

                {loading && (
                  <div className="py-20 text-center">
                    <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-[11px] font-bold text-slate-400">Loading historical transcripts...</span>
                  </div>
                )}
              </div>
            </div>

            {!loading && filteredSessions.length > 0 && (
              <PaginationControls
                currentPage={paginatedSessions.currentPage}
                totalPages={paginatedSessions.totalPages}
                totalItems={paginatedSessions.totalItems}
                itemLabel="sessions"
                onPageChange={setPage}
              />
            )}
          </>
        );
      })()}

      {/* ── Slide-Out / Floating Transcript Modal ── */}
      {selectedSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedSession(null)} />
          <div className="relative w-full max-w-5xl h-[88vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/80 dark:border-white/10">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Conversation Transcript & Audit Log
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase">
                      {selectedSession.status === "closed" ? "Resolved" : "Active"}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {selectedSession.visitorId?.name || "Visitor"} • {new Date(selectedSession.createdAt).toLocaleString()} • {selectedSession.websiteId?.websiteName || "UAE Invoicing"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden bg-slate-50/30 dark:bg-slate-950">
              <ChatPanel
                session={selectedSession}
                messages={messages}
                readonly={true}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
