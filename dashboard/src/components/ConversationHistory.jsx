import { useState, useEffect } from "react";
import { Search, Filter, Calendar, Download, ChevronRight, User, Globe, MessageSquare, X, Clock } from "lucide-react";
import { api, API_BASE } from "../api/client.js";
import ChatPanel from "./ChatPanel.jsx";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { useToast } from "../context/ToastContext.jsx";

export default function ConversationHistory() {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterWebsite, setFilterWebsite] = useState("");
  const [filterAgent, setFilterAgent] = useState("");

  // Metadata for filters
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
      setSessions(data);
      setPage(1);
    } catch (err) {
      toast.error("Failed to load conversation history: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data for filters
    Promise.all([
      api("/api/websites"),
      api("/api/users/agents")
    ]).then(([w, a]) => {
      setWebsites(w);
      setAgents(a);
    }).catch(console.error);

    fetchHistory();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.append("searchTerm", searchTerm);
    if (filterWebsite) params.append("websiteId", filterWebsite);
    if (filterAgent) params.append("agentId", filterAgent);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    window.open(`${API_BASE}/api/analytics/export/csv?${params.toString()}`, "_blank");
  };

  const viewSession = async (session) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    try {
      const data = await api(`/api/chat/sessions/${session.sessionId}/messages`);
      setMessages(data);
    } catch (err) {
      toast.error("Failed to load conversation messages: " + err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      {/* Search & Global Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="heading-md dark:text-white">Historical Archive</h3>
          <p className="small-label dark:text-slate-500">Audit and review ecosystem-wide conversational history.</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-indigo-500/10"
        >
          <Download size={14} />
          Export History
        </button>
      </div>

      {/* Deep Filter Bar */}
      <form onSubmit={handleSearch} className="premium-card p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-5 items-end bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-100 dark:border-white/5">
        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Search Keywords</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Names, Emails, Content..."
              className="w-full bg-white dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl pl-9 pr-3 py-3 text-[11px] font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 outline-none transition-all dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Origin Domain</label>
          <select
            value={filterWebsite}
            onChange={e => setFilterWebsite(e.target.value)}
            className="w-full bg-white dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl px-3 py-3 text-[11px] font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 outline-none transition-all dark:text-white appearance-none"
          >
            <option value="">All Ecosystems</option>
            {websites.map(w => <option key={w._id} value={w._id}>{w.websiteName}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Assigned Agent</label>
          <select
            value={filterAgent}
            onChange={e => setFilterAgent(e.target.value)}
            className="w-full bg-white dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl px-3 py-3 text-[11px] font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/50 outline-none transition-all dark:text-white appearance-none"
          >
            <option value="">All Personnel</option>
            {agents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </div>

        <div className="space-y-2 col-span-1 md:col-span-2 xl:col-span-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Temporal Range</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="flex-1 bg-white dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl px-2 py-3 text-[10px] font-bold outline-none dark:text-white"
            />
            <span className="text-slate-300">→</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="flex-1 bg-white dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl px-2 py-3 text-[10px] font-bold outline-none dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
        >
          Sync Results
        </button>
      </form>

      {(() => {
        const paginatedSessions = getPaginationMeta(sessions, page);
        return (
          <>
            {/* Results List */}
            <div className="premium-card p-0 bg-white dark:bg-slate-900 border-none shadow-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-black/20 border-b border-slate-100 dark:border-white/5">
                      <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Temporal Log</th>
                      <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Visitor Entity</th>
                      <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Origin Source</th>
                      <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned Agent</th>
                      <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                    {paginatedSessions.pageItems.map(session => (
                      <tr key={session._id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-900 dark:text-white">
                              {new Date(session.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-[11px] border border-indigo-100 dark:border-indigo-500/20">
                              {session.visitorId?.name?.[0] || session.visitorId?.visitorId?.[0] || "V"}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{session.visitorId?.name || "Anonymous Visitor"}</p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold tracking-wider">{session.visitorId?.email || session.visitorId?.visitorId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                            <Globe size={12} className="text-indigo-500" />
                            {session.websiteId?.websiteName || "Root Proxy"}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{session.assignedAgent?.name || "System Routed"}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button
                            onClick={() => viewSession(session)}
                            className="p-3 text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all border border-transparent hover:border-indigo-100"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {sessions.length === 0 && !loading && (
                  <div className="py-40 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto">
                      <Search size={32} className="text-slate-200" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Zero records match the current frequency</p>
                  </div>
                )}

                {loading && (
                  <div className="py-40 text-center">
                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                  </div>
                )}
              </div>
            </div>
            {!loading && (
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

      {/* Modal for viewing historical chat */}
      {selectedSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md" onClick={() => setSelectedSession(null)} />
          <div className="relative w-full max-w-5xl h-[85vh] bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-white/5">
            <div className="px-8 py-5 border-b border-slate-50 dark:border-white/5 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Conversation Audit</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{selectedSession.visitorId?.name} • {new Date(selectedSession.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
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
