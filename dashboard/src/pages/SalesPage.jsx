import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { exportToCSV } from "../utils/exportUtils.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useWebsite } from "../context/WebsiteContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { api } from "../api/client.js";
import CRMManager from "../components/CRMManager.jsx";
import InsightsPanel from "../components/InsightsPanel.jsx";
import PaginationControls from "../components/PaginationControls.jsx";
import Layout from "../components/Layout.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import {
  Activity,
  MessageCircle,
  FileText,
  CheckSquare,
  Clock,
  Calendar,
  Phone,
  Mail,
  Zap,
  ArrowRight,
  ChevronRight,
  ArrowLeft,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  RefreshCw,
  Boxes,
  Layers,
  Tag,
  Truck,
  Receipt,
  Search,
  Plus,
  Trash2,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  Video,
  Sparkles
} from "lucide-react";
import ChatPanel from "../components/ChatPanel.jsx";
import { hasModule } from "../utils/planAccess.js";
import { hasPermission } from "../utils/permissions.js";
import { PERMISSIONS } from "../constants/domain.js";
import CustomerManager from "../components/CustomerManager.jsx";
import InventoryManager from "../components/InventoryManager.jsx";
import TicketManager from "../components/TicketManager.jsx";
import CrmTasksView from "../components/CrmSystem/CrmTasksView.jsx";
import CrmInvoicesView from "../components/CrmSystem/CrmInvoicesView.jsx";

function SessionStatusBadge({ status, session }) {
  if (session) {
    if (session.status === "queued") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Queued
        </span>
      );
    }
    if (session.status === "closed") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          Closed
        </span>
      );
    }
    const isOnline = Boolean(session.visitorId?.isOnline || session.isOnline);
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
          isOnline
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-slate-100 text-slate-500 border-slate-200"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
        <span>{isOnline ? "Online" : "Offline"}</span>
      </span>
    );
  }

  const styles = {
    active: "bg-emerald-50 text-emerald-600 border-emerald-100",
    queued: "bg-amber-50 text-amber-600 border-amber-100",
    closed: "bg-slate-100 text-slate-500 border-slate-200"
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${styles[status] || styles.closed}`}>
      {status || "unknown"}
    </span>
  );
}

function SalesChatsPanel({ onConvertToLead }) {
  const { user } = useAuth();
  const socket = useSocket();
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const splitContainerRef = useRef(null);
  const [listWidth, setListWidth] = useState(() => {
    const saved = Number(localStorage.getItem("sales_chat_list_width"));
    return Number.isFinite(saved) && saved >= 250 && saved <= 620 ? saved : 340;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e) => {
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const maxW = Math.min(620, Math.floor(rect.width * 0.58));
      const next = Math.max(250, Math.min(maxW, Math.round(e.clientX - rect.left)));
      setListWidth(next);
      localStorage.setItem("sales_chat_list_width", String(next));
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api("/api/chat/sessions");
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) {
          setSessions(list);
          if (list.length > 0) setSelectedSession((prev) => prev || list[0]);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load sales chats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    let cancelled = false;
    async function loadMessages() {
      try {
        const data = await api(`/api/chat/sessions/${selectedSession.sessionId}/messages`);
        if (!cancelled) setMessages(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    }
    loadMessages();
    if (socket) {
      socket.emit("agent:join-session", { sessionId: selectedSession.sessionId });
      socket.emit("agent:read-session", { sessionId: selectedSession.sessionId });
    }
    return () => { cancelled = true; };
  }, [selectedSession, socket]);

  useEffect(() => {
    if (!socket || !selectedSession) return;
    const activeSid = selectedSession.sessionId;
    const onMsg = (payload) => {
      if (payload?.sessionId !== activeSid) return;
      setMessages((prev) => {
        const idx = prev.findIndex(
          (m) => (payload.tempId && m.tempId === payload.tempId) || (payload._id && m._id === payload._id)
        );
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], ...payload };
          return copy;
        }
        return [...prev, payload];
      });
    };
    const onTyping = ({ sessionId, isTyping, sender }) => {
      if (sessionId === activeSid && (sender === "visitor" || sender === "client" || !sender)) {
        setVisitorTyping(Boolean(isTyping));
      }
    };
    socket.on("chat:new-message", onMsg);
    socket.on("chat:message", onMsg);
    socket.on("chat:typing", onTyping);
    return () => {
      socket.off("chat:new-message", onMsg);
      socket.off("chat:message", onMsg);
      socket.off("chat:typing", onTyping);
    };
  }, [socket, selectedSession]);

  useEffect(() => {
    if (!socket) return;

    const patchSession = (sessionId, patch) => {
      setSessions((prev) => prev.map((s) => (s.sessionId === sessionId ? { ...s, ...patch } : s)));
      setSelectedSession((prev) => (prev?.sessionId === sessionId ? { ...prev, ...patch } : prev));
    };

    const handleSessionUpdated = (session) => {
      if (!session?.sessionId) return;
      setSessions((prev) => {
        const exists = prev.some((s) => s.sessionId === session.sessionId);
        if (!exists) return [session, ...prev];
        return prev.map((s) => (s.sessionId === session.sessionId ? { ...s, ...session } : s));
      });
      setSelectedSession((prev) => (prev?.sessionId === session.sessionId ? { ...prev, ...session } : prev));
    };

    const handleClosed = ({ sessionId }) => {
      if (sessionId) patchSession(sessionId, { status: "closed", closedAt: new Date().toISOString() });
    };

    const handleAssigned = (data = {}) => {
      if (!data.sessionId) return;
      const patch = { status: "active" };
      if (data.assignedAgent !== undefined) patch.assignedAgent = data.assignedAgent;
      patchSession(data.sessionId, patch);
    };

    const handleQueued = (data = {}) => {
      if (data.sessionId) patchSession(data.sessionId, { status: "queued" });
    };

    const handleListPreview = (payload = {}) => {
      if (!payload.sessionId) return;
      const preview = payload.message || (payload.attachmentUrl ? "Sent an attachment" : undefined);
      const patch = { updatedAt: payload.createdAt || new Date().toISOString() };
      if (preview !== undefined) patch.lastMessagePreview = preview;
      patchSession(payload.sessionId, patch);
    };

    const handleVisitorStatus = ({ sessionId, visitorId, isOnline }) => {
      const matchVisitor = (s) =>
        s.sessionId === sessionId ||
        (visitorId && (s.visitorId?._id === visitorId || s.visitorId?.visitorId === visitorId));
      const applyOnline = (s) => ({
        ...s,
        isOnline: Boolean(isOnline),
        visitorId:
          s.visitorId && typeof s.visitorId === "object"
            ? { ...s.visitorId, isOnline: Boolean(isOnline) }
            : s.visitorId,
      });
      setSessions((prev) => prev.map((s) => (matchVisitor(s) ? applyOnline(s) : s)));
      setSelectedSession((prev) => (prev && matchVisitor(prev) ? applyOnline(prev) : prev));
    };

    const handleVisitorOnline = (data) => handleVisitorStatus({ ...data, isOnline: true });
    const handleVisitorOffline = (data) => handleVisitorStatus({ ...data, isOnline: false });

    socket.on("chat:session-updated", handleSessionUpdated);
    socket.on("chat:closed", handleClosed);
    socket.on("chat:assigned", handleAssigned);
    socket.on("chat:queued", handleQueued);
    socket.on("chat:new-message", handleListPreview);
    socket.on("chat:message", handleListPreview);
    socket.on("visitor:status", handleVisitorStatus);
    socket.on("visitor:online", handleVisitorOnline);
    socket.on("visitor:offline", handleVisitorOffline);

    return () => {
      socket.off("chat:session-updated", handleSessionUpdated);
      socket.off("chat:closed", handleClosed);
      socket.off("chat:assigned", handleAssigned);
      socket.off("chat:queued", handleQueued);
      socket.off("chat:new-message", handleListPreview);
      socket.off("chat:message", handleListPreview);
      socket.off("visitor:status", handleVisitorStatus);
      socket.off("visitor:online", handleVisitorOnline);
      socket.off("visitor:offline", handleVisitorOffline);
    };
  }, [socket]);

  const handleSendMessage = async (payload) => {
    if (!selectedSession || !socket) return;
    const tempId = `sales-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic = {
      _id: tempId,
      tempId,
      sessionId: selectedSession.sessionId,
      message: payload.text,
      attachmentUrl: payload.attachmentUrl,
      attachmentType: payload.attachmentType,
      sender: "agent",
      senderName: user?.name || "Sales",
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimistic]);
    socket.emit("agent:message", {
      sessionId: selectedSession.sessionId,
      message: payload.text,
      attachmentUrl: payload.attachmentUrl,
      attachmentType: payload.attachmentType,
      tempId
    });
    socket.emit("agent:typing", { sessionId: selectedSession.sessionId, isTyping: false });
  };

  const handleAcceptChat = async (sessionId) => {
    try {
      const updated = await api(`/api/chat/sessions/${sessionId}/accept`, { method: "PATCH" });
      setSessions((prev) => prev.map((s) => (s.sessionId === sessionId ? { ...s, ...updated } : s)));
      setSelectedSession((prev) => (prev?.sessionId === sessionId ? { ...prev, ...updated } : prev));
      toast.success("Chat accepted and assigned to you!");
    } catch (err) {
      toast.error(err.message || "Failed to accept chat");
    }
  };

  if (loading) {
    return (
      <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400">
        <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Synchronizing assigned queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-red-50 border border-red-100 text-red-600">
        <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400">
        <Activity size={40} className="mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-slate-600 uppercase tracking-tight">No active sales chats</h2>
        <p className="text-sm font-bold mt-2">Only chats assigned to this sales user appear here.</p>
      </div>
    );
  }

  const groupedVisitors = (() => {
    const map = new Map();
    sessions.forEach((session) => {
      const rawName = (session.visitorId?.name || "").trim().toLowerCase();
      const rawEmail = (session.visitorId?.email || "").trim().toLowerCase();
      const isNamed = rawName && rawName !== "visitor" && !rawName.startsWith("visitor_");
      const visitorKey =
        rawEmail ||
        (isNamed ? `${rawName}_${session.websiteId?._id || session.websiteId || "site"}` : null) ||
        session.visitorId?._id ||
        session.visitorId?.visitorId ||
        session.sessionId;

      const isActive = session.status !== "closed" && !session.archivedAt;
      const isUnassigned = isActive && !session.assignedAgent;

      if (!map.has(visitorKey)) {
        map.set(visitorKey, {
          key: visitorKey,
          primarySession: session,
          allSessions: [session],
          hasActiveSession: isActive,
          hasUnassignedActive: isUnassigned,
        });
      } else {
        const existing = map.get(visitorKey);
        existing.allSessions.push(session);
        if (isActive) existing.hasActiveSession = true;
        if (isUnassigned) existing.hasUnassignedActive = true;

        const getRank = (s) => {
          if (s.archivedAt) return 0;
          if (s.status === "closed") return 1;
          if (s.visitorId?.isOnline || s.isOnline) return 3;
          return 2;
        };
        const existingRank = getRank(existing.primarySession);
        const currentRank = getRank(session);
        const existingTime = new Date(existing.primarySession.updatedAt || existing.primarySession.createdAt).getTime();
        const currentTime = new Date(session.updatedAt || session.createdAt).getTime();

        if (currentRank > existingRank || (currentRank === existingRank && currentTime > existingTime)) {
          existing.primarySession = session;
        }
        existing.hasUnassignedActive = existing.hasActiveSession && !existing.primarySession.assignedAgent;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const onlineA = a.primarySession.status !== "closed" && !a.primarySession.archivedAt && (a.primarySession.visitorId?.isOnline || a.primarySession.isOnline) ? 1 : 0;
      const onlineB = b.primarySession.status !== "closed" && !b.primarySession.archivedAt && (b.primarySession.visitorId?.isOnline || b.primarySession.isOnline) ? 1 : 0;
      if (onlineA !== onlineB) return onlineB - onlineA;

      const activeA = a.hasActiveSession ? 1 : 0;
      const activeB = b.hasActiveSession ? 1 : 0;
      if (activeA !== activeB) return activeB - activeA;

      const timeA = new Date(a.primarySession.updatedAt || a.primarySession.createdAt).getTime();
      const timeB = new Date(b.primarySession.updatedAt || b.primarySession.createdAt).getTime();
      return timeB - timeA;
    });
  })();

  const unassignedCount = groupedVisitors.filter((g) => g.hasUnassignedActive).length;

  const filteredSessions = groupedVisitors
    .filter((group) => {
      if (statusFilter === "unassigned") return group.hasUnassignedActive;
      if (statusFilter === "active") return group.hasActiveSession;
      if (statusFilter === "closed") return !group.hasActiveSession;
      return true;
    })
    .map((group) => group.primarySession)
    .filter((s) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return `${s.visitorId?.name || ""} ${s.visitorId?.email || ""} ${s.websiteId?.websiteName || ""} ${s.lastMessagePreview || ""}`
        .toLowerCase()
        .includes(q);
    });

  return (
    <div
      ref={splitContainerRef}
      className="flex flex-col lg:flex-row gap-3 lg:gap-0 h-full min-h-0 flex-1 overflow-hidden"
    >
      {/* Left Column: Compact Searchable Scrollable Chat List */}
      <div
        style={{ "--sales-list-width": `${listWidth}px` }}
        className="w-full lg:w-[var(--sales-list-width)] lg:shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden h-full min-h-0"
      >
        <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Sales Chats ({filteredSessions.length})</h3>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "all", label: "all" },
                { id: "active", label: "active" },
                { id: "unassigned", label: `unassigned (${unassignedCount})`, highlight: unassignedCount > 0 },
                { id: "closed", label: "closed" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-indigo-600 text-white"
                      : st.highlight
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-white text-slate-500 border border-slate-200"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search visitor, email, message..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-semibold outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-[11px] font-bold text-slate-400">No matching chats</div>
          ) : (
            filteredSessions.map((session) => {
              const isSelected = selectedSession?._id === session._id;
              return (
                <button
                  key={session._id}
                  type="button"
                  onClick={() => setSelectedSession(session)}
                  className={`w-full text-left p-3 transition-colors cursor-pointer flex items-start gap-2.5 ${
                    isSelected ? "bg-indigo-50/70 border-l-2 border-l-indigo-600" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {session.visitorId?.name?.[0]?.toUpperCase() || "V"}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-900 truncate">{session.visitorId?.name || "Anonymous visitor"}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {session.status !== "closed" && !session.assignedAgent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Unassigned
                          </span>
                        )}
                        <SessionStatusBadge status={session.status} session={session} />
                      </div>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 truncate">
                      {session.websiteId?.websiteName || "Website"} &middot; {session.visitorId?.email || "No email"}
                    </p>
                    <p className="text-[11px] text-slate-600 truncate">
                      {session.lastMessagePreview || "Waiting for interaction..."}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Draggable Splitter Bar */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sales chats panel"
        title="Drag to resize · Double-click to reset"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        onDoubleClick={() => {
          setListWidth(340);
          localStorage.setItem("sales_chat_list_width", "340");
        }}
        className="hidden lg:flex w-3 shrink-0 cursor-col-resize select-none items-center justify-center group relative z-10"
      >
        <div
          className={`w-[2px] h-full rounded-full transition-colors duration-150 ${
            isResizing
              ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
              : "bg-transparent group-hover:bg-indigo-500"
          }`}
        />
      </div>

      {/* Right Column: Live ChatPanel */}
      <div className="flex-1 min-w-0 h-full min-h-0 flex flex-col overflow-hidden">
        {selectedSession ? (
          <ChatPanel
            session={selectedSession}
            messages={messages}
            onSend={handleSendMessage}
            onTyping={(isTyping) => socket?.emit("agent:typing", { sessionId: selectedSession.sessionId, isTyping })}
            isTyping={visitorTyping}
            currentUser={user}
            onAcceptChat={handleAcceptChat}
            onConvertToLead={() => onConvertToLead(selectedSession)}
          />
        ) : (
          <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-center text-xs font-bold text-slate-400">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}

function GlobalTasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api("/api/crm/tasks/my");
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load global tasks", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">Synchronizing action items...</div>;

  if (tasks.length === 0) {
    return (
      <div className="p-16 border-2 border-dashed border-slate-200 rounded-[40px] bg-slate-50 text-center mt-6">
        <CheckSquare size={48} className="mx-auto mb-4 text-slate-200" />
        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Zero pending actions</h3>
        <p className="text-sm font-bold text-slate-500 mt-2">All your follow-ups are completed. Great work!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-700 mt-6">
      {tasks.map(task => (
        <div key={task._id} className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${task.status === "completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
              }`}>
              {task.type === "call" ? <Phone size={20} /> : task.type === "email" ? <Mail size={20} /> : <CheckSquare size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.type}</p>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${task.customerId?.priority === "high" ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}>{task.customerId?.priority || "Medium"}</span>
              </div>
              <h4 className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{task.title}</h4>
              <p className="text-[11px] font-bold text-indigo-500 truncate mt-1">
                {task.customerId?.name} <span className="text-slate-300 mx-1">•</span> {task.customerId?.crn}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(task.dueAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1.5"><Clock size={12} /> {task.status}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GlobalNotesPanel({ websiteId, onOpenCustomer }) {
  const [notes, setNotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, websiteId]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [noteForm, setNoteForm] = useState({ customerId: "", type: "note", text: "" });

  const loadNotes = async () => {
    setLoading(true);
    setError("");
    try {
      const url = websiteId ? `/api/crm/notes/my?websiteId=${websiteId}` : "/api/crm/notes/my";
      const data = await api(url);
      setNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load global notes", err);
      setError("Failed to load lead notes.");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const url = websiteId ? `/api/crm?limit=150&websiteId=${websiteId}` : "/api/crm?limit=150";
      const res = await api(url);
      setCustomers(res.customers || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error("Failed to load customers", err);
    }
  };

  useEffect(() => {
    loadNotes();
    loadCustomers();
  }, [websiteId]);

  useEffect(() => {
    if (showAddModal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [showAddModal]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteForm.customerId || !noteForm.text.trim()) {
      setError("Please select a lead and enter note details.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api(`/api/crm/${noteForm.customerId}/notes`, {
        method: "POST",
        body: JSON.stringify({ type: noteForm.type, text: noteForm.text.trim() })
      });
      setShowAddModal(false);
      setNoteForm({ customerId: "", type: "note", text: "" });
      setSuccess("Note logged successfully!");
      loadNotes();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to log note.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (customerId, noteId) => {
    try {
      await api(`/api/crm/${customerId}/notes/${noteId}`, { method: "DELETE" });
      setConfirmDeleteKey(null);
      setSuccess("Note deleted.");
      loadNotes();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to delete note.");
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (typeFilter !== "all" && (n.type || "note") !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          n.text?.toLowerCase().includes(q) ||
          n.customerName?.toLowerCase().includes(q) ||
          n.customerCompany?.toLowerCase().includes(q) ||
          n.customerCrn?.toLowerCase().includes(q) ||
          n.authorName?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [notes, typeFilter, search]);

  const counts = useMemo(() => ({
    all: notes.length,
    note: notes.filter((n) => (n.type || "note") === "note").length,
    call: notes.filter((n) => n.type === "call").length,
    meeting_email: notes.filter((n) => n.type === "meeting" || n.type === "manual_email").length
  }), [notes]);

  const handleExportNotesCSV = () => {
    const rows = filteredNotes.map((n) => ({
      "Lead": n.customerName || "-",
      "Company": n.customerCompany || "-",
      "CRN": n.customerCrn || "-",
      "Type": (n.type || "note").toUpperCase(),
      "Note": n.text || "",
      "Author": n.authorName || "-",
      "Logged At": n.createdAt ? new Date(n.createdAt).toLocaleString() : "-"
    }));
    exportToCSV(rows, `Lead_Notes_${new Date().toISOString().slice(0, 10)}`);
  };

  const getNoteIcon = (type) => {
    switch (type) {
      case "call": return <Phone size={13} className="text-amber-500" />;
      case "meeting": return <Video size={13} className="text-violet-500" />;
      case "manual_email": return <Mail size={13} className="text-sky-500" />;
      default: return <Zap size={13} className="text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Compact White Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-4 text-slate-900 shadow-sm border border-slate-200/80">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-widest border border-indigo-200">
              <Sparkles size={10} className="text-indigo-500" /> Lead Intelligence Vault
            </span>
            <h1 className="text-lg lg:text-xl font-black tracking-tight text-slate-900 uppercase">
              Internal Notes & Observations
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Centralized timeline of internal observations, call logs, and meeting notes across active leads.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleExportNotesCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            >
              <Download size={12} /> CSV
            </button>
            <button
              onClick={loadNotes}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-all border border-slate-200"
              title="Refresh Notes"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg transition-all flex items-center gap-1.5"
            >
              <Plus size={14} /> Log Note
            </button>
          </div>
        </div>
      </div>

      {/* Compact KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: "all", label: "Total Notes", val: counts.all, sub: "All Logged Intel", activeClass: "bg-white text-slate-900 border-indigo-500 ring-1 ring-indigo-500/20" },
          { key: "note", label: "General Notes", val: counts.note, sub: "Internal Context", activeClass: "bg-white text-slate-900 border-indigo-500 ring-1 ring-indigo-500/20" },
          { key: "call", label: "Call Logs", val: counts.call, sub: "Phone Summaries", activeClass: "bg-white text-slate-900 border-amber-500 ring-1 ring-amber-500/20" },
          { key: "meeting", label: "Meetings & Emails", val: counts.meeting_email, sub: "Outreach Notes", activeClass: "bg-white text-slate-900 border-violet-500 ring-1 ring-violet-500/20" }
        ].map((card) => (
          <div
            key={card.key}
            onClick={() => setTypeFilter(card.key)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${typeFilter === card.key ? `${card.activeClass} shadow-sm` : "bg-white text-slate-900 border-slate-200/80 hover:border-slate-300 shadow-sm"
              }`}
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{card.label}</p>
            <p className="text-xl font-black mt-1 tracking-tight text-slate-900">{card.val}</p>
            <p className="text-[9px] font-bold mt-0.5 text-slate-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-[11px] font-bold">
          <span className="flex items-center gap-2"><AlertTriangle size={14} className="text-rose-500" /> {error}</span>
          <button onClick={() => setError("")}><X size={13} /></button>
        </div>
      )}
      {success && (
        <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-700 text-[11px] font-bold">
          <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {success}</span>
          <button onClick={() => setSuccess("")}><X size={13} /></button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: "all", label: "All" },
            { key: "note", label: "Notes" },
            { key: "call", label: "Calls" },
            { key: "meeting", label: "Meetings" },
            { key: "manual_email", label: "Emails" }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${typeFilter === t.key ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search notes, lead, CRN, author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-slate-200/80 text-slate-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">
          Aggregating lead intelligence...
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="py-12 px-5 border border-dashed border-slate-200 rounded-2xl bg-white text-center space-y-2.5">
          <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-400">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">No Notes Found</h3>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              {notes.length === 0 ? "Log your first note from here or any lead profile." : "Try clearing search or filter criteria."}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            {notes.length > 0 && (
              <button
                onClick={() => { setSearch(""); setTypeFilter("all"); }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
            >
              <Plus size={12} /> Log First Note
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {getPaginationMeta(filteredNotes, page, 10).pageItems.map((note, idx) => {
              const noteKey = note._id || `${note.customerId}-${idx}`;
              return (
                <div key={noteKey} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between space-y-2.5">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                          {getNoteIcon(note.type)}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => onOpenCustomer && onOpenCustomer({ _id: note.customerId, name: note.customerName }, "notes")}
                            className="text-xs font-black text-indigo-600 hover:text-indigo-800 truncate flex items-center gap-1 text-left"
                          >
                            {note.customerName}
                            <ArrowRight size={11} className="shrink-0" />
                          </button>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                            {(note.type || "note").replace("_", " ")} {note.customerCrn ? `• ${note.customerCrn}` : ""}
                          </p>
                        </div>
                      </div>

                      {note._id && (
                        confirmDeleteKey === noteKey ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleDeleteNote(note.customerId, note._id)}
                              className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black uppercase rounded-md"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteKey(null)}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-md"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteKey(noteKey)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                            title="Delete Note"
                          >
                            <Trash2 size={13} />
                          </button>
                        )
                      )}
                    </div>

                    <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {note.text}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] text-slate-600 font-black">
                        {note.authorName?.[0] || "?"}
                      </span>
                      {note.authorName || "System"}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {note.createdAt ? new Date(note.createdAt).toLocaleString() : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {(() => {
            const paged = getPaginationMeta(filteredNotes, page, 10);
            return (
              <PaginationControls
                currentPage={paged.currentPage}
                totalPages={paged.totalPages}
                totalItems={paged.totalItems}
                itemLabel="notes"
                onPageChange={setPage}
              />
            );
          })()}
        </>
      )}

      {/* Add Note Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[9999] p-4 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Log Internal Note</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Attach observation or call summary to a lead</p>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddNote} className="px-5 py-4 space-y-3 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Select Lead / Customer</label>
                <select
                  required
                  value={noteForm.customerId}
                  onChange={(e) => setNoteForm({ ...noteForm, customerId: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Lead / Customer --</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>{c.name} ({c.companyName || c.crn || "Client"})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Interaction Type</label>
                <select
                  value={noteForm.type}
                  onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                >
                  <option value="note">General Note</option>
                  <option value="call">Phone Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="manual_email">Email Summary</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Note Details</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Write internal observation or next steps..."
                  value={noteForm.text}
                  onChange={(e) => setNoteForm({ ...noteForm, text: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-60"
              >
                {submitting ? "Saving..." : "+ Save Note"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}



export default function SalesPage() {
  const { user } = useAuth();
  const { websites, selectedWebsiteId, setSelectedWebsiteId } = useWebsite();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "pipeline";
  const [initialLeadData, setInitialLeadData] = useState(null);
  const [highlightLeadId, setHighlightLeadId] = useState(null);
  const canUseCRM = hasModule(user, "crm");
  const canUseReports = hasModule(user, "reports");
  const [inventorySubTab, setInventorySubTab] = useState("master");

  const handleConvertLead = (session) => {
    setInitialLeadData({
      name: session.visitorId?.name || "Anonymous",
      email: session.visitorId?.email || "",
      phone: session.visitorId?.phone || "",
      leadSource: "chat",
      notes: `Lead converted from chat session: ${session.sessionId || session._id}`,
      sessionId: session._id
    });
    setSearchParams({ tab: "pipeline" });
  };

  const handleViewLead = (lead) => {
    setHighlightLeadId(lead._id);
    setSearchParams({ tab: "pipeline" });
  };

  const canUseOperations = hasModule(user, "operations");
  const canUseTickets = hasModule(user, "tickets");

  const menuItems = [
    ...(canUseCRM && hasPermission(user, PERMISSIONS.CRM_VIEW) ? [
      { label: "Pipeline", href: "/sales" },
      { label: "Tasks", href: "/sales?tab=tasks" },
      { label: "Notes", href: "/sales?tab=notes" }
    ] : [])
  ];

  if (hasModule(user, "chat") && hasPermission(user, PERMISSIONS.CHAT_VIEW)) {
    menuItems.push({ label: "Chats", href: "/sales?tab=chats" });
  }

  if (canUseOperations && hasPermission(user, PERMISSIONS.INVENTORY_VIEW)) {
    menuItems.push({
      label: "Inventory",
      href: "/sales?tab=inventory",
      children: [
        { label: "Item Master", href: "/sales?tab=inventory&subtab=master" },
        { label: "Categories", href: "/sales?tab=inventory&subtab=category" },
        { label: "Subcategories", href: "/sales?tab=inventory&subtab=subcategory" },
        { label: "Brands", href: "/sales?tab=inventory&subtab=brand" },
        { label: "Sizes", href: "/sales?tab=inventory&subtab=size" },
        { label: "Colors", href: "/sales?tab=inventory&subtab=color" },
        { label: "Units", href: "/sales?tab=inventory&subtab=unit" },
        { label: "Suppliers", href: "/sales?tab=inventory&subtab=supplier" },
        { label: "VAT Master", href: "/sales?tab=inventory&subtab=vat" },
        { label: "Stock Movement", href: "/sales?tab=inventory&subtab=history" }
      ]
    });
  }

  if (canUseTickets && hasPermission(user, PERMISSIONS.TICKET_VIEW)) {
    menuItems.push({ label: "Tickets", href: "/sales?tab=tickets" });
  }

  if (canUseReports && hasPermission(user, PERMISSIONS.REPORTS_VIEW)) {
    menuItems.push({ label: "Insights", href: "/sales?tab=insights" });
  }

  if (canUseCRM && hasPermission(user, PERMISSIONS.CRM_VIEW)) {
    menuItems.push({ label: "Customer Master", href: "/sales?tab=customer-master" });
  }

  if (hasPermission(user, PERMISSIONS.INVOICE_VIEW) || hasPermission(user, PERMISSIONS.INVOICE_MANAGE)) {
    menuItems.push({ label: "Invoices", href: "/sales?tab=invoices" });
  }


  if (!canUseCRM && (activeTab === "pipeline" || activeTab === "tasks" || activeTab === "notes" || activeTab === "customer-master")) {
    return (
      <Layout menuItems={menuItems} title="Plan Upgrade Required" subtitle="CRM is available on Pro only">
        <div className="rounded-[40px] border border-emerald-100 bg-emerald-50 p-12 text-center">
          <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight">Pro plan required</h3>
          <p className="mt-3 text-sm font-bold text-emerald-700">This sales account can only use CRM when the client is on the Pro plan.</p>
        </div>
      </Layout>
    );
  }

  if (activeTab === "insights") {
    if (!canUseReports) {
      return (
        <Layout menuItems={menuItems} title="Plan Upgrade Required" subtitle="Reports are not enabled for this account">
          <div className="rounded-[40px] border border-sky-100 bg-sky-50 p-12 text-center">
            <h3 className="text-lg font-black text-sky-900 uppercase tracking-tight">Reports not included</h3>
            <p className="mt-3 text-sm font-bold text-sky-700">Enable reporting to unlock sales insights and performance analytics.</p>
          </div>
        </Layout>
      );
    }
    return (
      <Layout menuItems={menuItems} title="Sales Intelligence" subtitle="Performance metrics and revenue projection">
        <InsightsPanel websiteId={selectedWebsiteId} onViewLead={handleViewLead} />
      </Layout>
    );
  }

  if (activeTab === "chats") {
    return (
      <Layout menuItems={menuItems} title="Sales Chats" subtitle="Manage your assigned visitor conversations">
        <SalesChatsPanel onConvertToLead={handleConvertLead} />
      </Layout>
    );
  }

  if (activeTab === "tasks") {
    return (
      <Layout menuItems={menuItems} title="My Tasks" subtitle="Follow-ups and scheduled activities">
        <CrmTasksView websiteId={selectedWebsiteId} onOpenCustomer={handleViewLead} />
      </Layout>
    );
  }

  if (activeTab === "notes") {
    return (
      <Layout menuItems={menuItems} title="My Notes" subtitle="Internal observations and lead context">
        <GlobalNotesPanel websiteId={selectedWebsiteId} onOpenCustomer={handleViewLead} />
      </Layout>
    );
  }

  if (activeTab === "customer-master") {
    return (
      <Layout menuItems={menuItems} title="Customer Master Registry" subtitle="Global management of customer profiles and accounts">
        <CustomerManager websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  if (activeTab === "inventory" && canUseOperations && hasPermission(user, PERMISSIONS.INVENTORY_VIEW)) {
    const subtabParam = searchParams.get("subtab");
    const currentSubTab = subtabParam || inventorySubTab || "master";

    return (
      <Layout menuItems={menuItems} title="Stock Intelligence" subtitle="Real-time inventory levels, sub-masters and movement history">
        <InventoryManager websiteId={selectedWebsiteId} activeTab={currentSubTab} readOnly={false} />
      </Layout>
    );
  }

  if (activeTab === "tickets" && canUseTickets && hasPermission(user, PERMISSIONS.TICKET_VIEW)) {
    return (
      <Layout menuItems={menuItems} title="Service Records" subtitle="Customer support context and ticket history">
        <TicketManager websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  if (activeTab === "invoices" && (hasPermission(user, PERMISSIONS.INVOICE_VIEW) || hasPermission(user, PERMISSIONS.INVOICE_MANAGE))) {
    return (
      <Layout menuItems={menuItems} title="Invoice Management" subtitle="Create, edit, delete and manage customer invoices">
        <CrmInvoicesView websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  // default: pipeline
  return (
    <Layout
      menuItems={menuItems}
      title="Sales Pipeline"
      subtitle="Manage your leads, opportunities, and deals"
    >
      <CRMManager websiteId={selectedWebsiteId} initialLeadData={initialLeadData} highlightLeadId={highlightLeadId} />
    </Layout>
  );
}
