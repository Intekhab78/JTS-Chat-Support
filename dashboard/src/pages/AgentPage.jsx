import { useEffect, useMemo, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useSearchParams } from "react-router-dom";
import { Ticket, Link, Copy, CheckCheck, X, History, AlertCircle, Archive, RotateCcw, Trash2 } from "lucide-react";
import Layout from "../components/Layout.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import CannedResponseManager from "../components/CannedResponseManager.jsx";
import StatCard from "../components/StatCard.jsx";
import PaginationControls from "../components/PaginationControls.jsx";
import ActivityTimeline from "../components/ActivityTimeline.jsx";
import TicketManager from "../components/TicketManager.jsx";
import AgentPerformanceView from "../components/AgentPerformanceView.jsx";
import CRMManager from "../components/CRMManager.jsx";
import CustomerManager from "../components/CustomerManager.jsx";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { NotificationService } from "../utils/notifications.js";
import { useSocket } from "../context/SocketContext.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { hasModule } from "../utils/planAccess.js";
import { hasPermission } from "../utils/permissions.js";
import { PERMISSIONS } from "../constants/domain.js";

function dedupeMessages(messages) {
  const seen = new Set();
  return messages.filter((message) => {
    const key = message._id || `${message.createdAt}-${message.sender}-${message.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function AgentPage() {
  const { user, setUser } = useAuth();
  const isBasicUser = user?.role === "user";
  const canDeleteChats = !!user;
  const canUseTickets = hasModule(user, "tickets");
  const canUseShortcuts = hasModule(user, "shortcuts");
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [messages, setMessages] = useState([]);
  const socket = useSocket();
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionSearch, setSessionSearch] = useState("");
  const [typingSessions, setTypingSessions] = useState({});
  const [sessionViewers, setSessionViewers] = useState({});
  const [typingAgents, setTypingAgents] = useState({});
  const [ticketModal, setTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: "", priority: "medium", crmStage: "none" });
  const [ticketResult, setTicketResult] = useState(null);
  const [ticketSaving, setTicketSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [customerHistory, setCustomerHistory] = useState(null);
  const [historyModal, setHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sessionActivity, setSessionActivity] = useState([]);
  const [sessionTab, setSessionTab] = useState("active");
  const [chatPage, setChatPage] = useState(1);
  const [dashboardPage, setDashboardPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSub, setSelectedSub] = useState("");

  const selectedSession = useMemo(() => sessions.find((session) => session.sessionId === selectedSessionId) || null, [sessions, selectedSessionId]);
  const selectedSessionIdRef = useRef(selectedSessionId);

  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  async function loadSessions() {
    try {
      const data = await api("/api/chat/agent/sessions");
      setSessions(data);
    } catch (err) {
      setToast({ show: true, message: err.message, type: "error" });
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    loadSessions();
    NotificationService.requestPermission();
  }, []);

  const loadCustomerHistory = async (crn) => {
    if (!crn || !canUseTickets) return;
    setLoadingHistory(true);
    try {
      const data = await api(`/api/tickets/customer-history/${crn}`);
      setCustomerHistory(data);
    } catch (err) {
      console.warn("Failed to load customer history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!selectedSessionId) {
      setCustomerHistory(null);
      return;
    }
    api(`/api/chat/sessions/${selectedSessionId}/messages`).then(setMessages).catch((err) => setToast({ show: true, message: err.message, type: "error" }));
    api(`/api/chat/sessions/${selectedSessionId}/activity`).then(setSessionActivity).catch(() => setSessionActivity([]));
    if (selectedSession && selectedSession.crn) {
      loadCustomerHistory(selectedSession.crn);
    } else {
      setCustomerHistory(null);
    }
    if (ticketModal && selectedSession?.websiteId?._id) {
      api(`/api/categories?websiteId=${selectedSession.websiteId._id}`).then(setCategories).catch(err => console.warn("Categories failed", err));
    }
  }, [selectedSessionId, selectedSession?.crn, ticketModal, selectedSession?.websiteId?._id]);

  useEffect(() => {
    if (!socket) return;

    socket.on("connect_error", () => {
      setToast({ show: true, message: "Live connection interrupted. Auto-reconnecting...", type: "error" });
    });

    socket.on("connect", () => {
      setToast({ show: false, message: "", type: "info" });
      setUser(prev => ({ ...prev, isOnline: true }));
    });

    socket.on("chat:new-message", (payload) => {
      loadSessions();
      if (payload.sender === "visitor") {
        NotificationService.notify(`Message from ${payload.sessionId.substring(0, 8)}`, payload.message);

        if (payload.sessionId === selectedSessionIdRef.current) {
          socket.emit("chat:history:read", { sessionId: payload.sessionId });
        }

        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 660;
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.2);
        } catch (error) {
          console.error("Failed to play new message notification sound:", error);
        }
      }
      if (payload.sessionId === selectedSessionIdRef.current && payload.sender === "visitor") {
        setMessages((current) => dedupeMessages([...current, payload]));
      }
    });

    socket.on("chat:message", (payload) => {
      if (payload.sessionId === selectedSessionIdRef.current) {
        setMessages((current) => {
          const pendingIdx = current.findIndex(m => m.isPending && (m._id === payload.tempId || (m.sender === payload.sender && m.message === payload.message)));
          if (pendingIdx !== -1) {
            const copy = [...current];
            copy[pendingIdx] = { ...payload, isPending: false };
            return dedupeMessages(copy);
          }
          return dedupeMessages([...current, payload]);
        });
      }
    });

    socket.on("chat:typing", ({ sessionId, isTyping, sender, agentId, agentName }) => {
      if (sender === "visitor") {
        setTypingSessions(prev => ({ ...prev, [sessionId]: isTyping }));
      } else if (sender === "agent") {
        if (agentId !== user?._id) {
          setTypingAgents(prev => ({
            ...prev,
            [sessionId]: isTyping ? { agentId, agentName } : null
          }));
        }
      }
    });

    socket.on("presence:viewers", ({ sessionId, viewers }) => {
      setSessionViewers(prev => ({ ...prev, [sessionId]: viewers }));
    });

    socket.on("chat:control-requested", ({ sessionId, requestedBy }) => {
      setToast({
        show: true,
        message: `${requestedBy.name} (${requestedBy.role}) has requested control of this conversation. Please release the chat if you want to hand it over.`,
        type: "warning"
      });
      NotificationService.notify("Control Requested", `${requestedBy.name} is requesting control of the chat.`);
    });

    socket.on("chat:delivered", ({ messageId }) => {
      setMessages(prev => prev.map(m => (m._id === messageId ? { ...m, deliveredAt: new Date() } : m)));
    });

    socket.on("chat:read", ({ sessionId }) => {
      if (sessionId === selectedSessionIdRef.current) {
        setMessages(prev => prev.map(m => (!m.readAt ? { ...m, readAt: new Date() } : m)));
      }
    });

    socket.on("chat:assigned", ({ sessionId }) => {
      loadSessions();
      if (!selectedSessionId) {
        setSelectedSessionId(sessionId);
      }
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch (error) {
        console.error("Failed to play chat assignment notification sound:", error);
      }
      NotificationService.notify("New Chat Assigned", "You have a new visitor waiting for support.");
    });

    socket.on("chat:session-updated", () => {
      loadSessions();
    });

    socket.on("chat:intelligence-updated", ({ sessionId, sentimentScore, sentimentLabel, aiSummary }) => {
      setSessions(prev => prev.map(s => {
        if (s.sessionId === sessionId) {
          return { ...s, sentimentScore, sentimentLabel, aiSummary };
        }
        return s;
      }));
    });

    socket.on("visitor:status", ({ sessionId, isOnline, lastActiveAt }) => {
      setSessions(prev => prev.map(s => {
        const targetId = sessionId || selectedSessionIdRef.current;
        if (s.sessionId === targetId) {
          return { ...s, visitorId: { ...s.visitorId, isOnline, lastVisitTime: lastActiveAt } };
        }
        return s;
      }));
    });

    return () => {
      socket.off("connect_error");
      socket.off("connect");
      socket.off("chat:new-message");
      socket.off("chat:message");
      socket.off("chat:typing");
      socket.off("chat:delivered");
      socket.off("chat:read");
      socket.off("chat:assigned");
      socket.off("chat:session-updated");
      socket.off("chat:intelligence-updated");
      socket.off("presence:viewers");
      socket.off("visitor:status");
      socket.off("chat:control-requested");
    };
  }, [user?._id, socket]);

  useEffect(() => {
    if (socket && selectedSessionId) {
      socket.emit("agent:join-session", { sessionId: selectedSessionId });
      socket.emit("chat:history:read", { sessionId: selectedSessionId });
    }
  }, [socket, selectedSessionId]);

  async function toggleAvailability() {
    const updated = await api("/api/users/availability", {
      method: "PATCH",
      body: JSON.stringify({
        isAvailable: !user.isAvailable
      })
    });
    setUser(updated);
  }

  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "", password: "" });
  async function updateProfile(event) {
    event.preventDefault();
    try {
      const updatedUser = await api("/api/users/profile", {
        method: "PATCH",
        body: JSON.stringify(profileForm)
      });
      setUser(updatedUser);
      setProfileForm({ ...profileForm, password: "" });
      setToast({ show: true, message: "Profile updated securely.", type: "info" });
    } catch (err) {
      setToast({ show: true, message: err.message, type: "error" });
    }
  }

  function sendMessage(payload) {
    if (!socket || !selectedSessionId) return;

    const messageText = typeof payload === 'string' ? payload : (payload.text || "Sent an attachment");

    const tempMsg = {
      _id: `temp-${Date.now()}`,
      sessionId: selectedSessionId,
      message: messageText,
      attachmentUrl: payload.attachmentUrl,
      attachmentType: payload.attachmentType,
      sender: "agent",
      senderName: user.name || "Support",
      createdAt: new Date().toISOString(),
      agentId: user._id,
      isPending: true
    };
    setMessages(prev => dedupeMessages([...prev, tempMsg]));

    if (typeof payload === "string") {
      socket.emit("agent:message", { sessionId: selectedSessionId, message: payload, tempId: tempMsg._id });
    } else {
      socket.emit("agent:message", {
        sessionId: selectedSessionId,
        message: messageText,
        attachmentUrl: payload.attachmentUrl,
        attachmentType: payload.attachmentType,
        tempId: tempMsg._id
      });
    }
  }

  function sendTyping(isTyping) {
    if (!socket || !selectedSessionId) return;
    socket.emit("agent:typing", { sessionId: selectedSessionId, isTyping });
  }

  function closeChat() {
    if (!socket || !selectedSessionId) return;
    socket.emit("agent:close-session", { sessionId: selectedSessionId });
    setSelectedSessionId("");
    loadSessions();
  }

  async function moveChatToTrash() {
    if (!selectedSessionId) return;
    try {
      await api(`/api/chat/sessions/${selectedSessionId}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ reason: "manual_trash" })
      });
      setSelectedSessionId("");
      await loadSessions();
      setToast({ show: true, message: "Chat moved to trash.", type: "info" });
    } catch (err) {
      setToast({ show: true, message: err.message, type: "error" });
    }
  }

  async function restoreChat() {
    if (!selectedSessionId) return;
    try {
      await api(`/api/chat/sessions/${selectedSessionId}/restore`, {
        method: "PATCH"
      });
      setSelectedSessionId("");
      await loadSessions();
      setToast({ show: true, message: "Chat restored from trash.", type: "info" });
    } catch (err) {
      setToast({ show: true, message: err.message, type: "error" });
    }
  }

  async function deleteChatPermanently() {
    if (!selectedSessionId || !canDeleteChats) return;
    if (!window.confirm("Delete this chat permanently? This cannot be undone.")) return;
    try {
      await api(`/api/chat/sessions/${selectedSessionId}`, {
        method: "DELETE"
      });
      setSelectedSessionId("");
      await loadSessions();
      setToast({ show: true, message: "Chat deleted permanently.", type: "info" });
    } catch (err) {
      setToast({ show: true, message: err.message, type: "error" });
    }
  }

  async function generateTicket(e) {
    e.preventDefault();
    if (!selectedSession) return;
    setTicketSaving(true);
    try {
      const result = await api("/api/tickets/convert", {
        method: "POST",
        body: JSON.stringify({
          sessionId: selectedSession._id,
          subject: ticketForm.subject || `Support – ${selectedSession.websiteId?.websiteName || 'Chat'}`,
          priority: ticketForm.priority,
          crmStage: ticketForm.crmStage,
          category: selectedCat || undefined,
          subcategory: selectedSub || undefined
        })
      });
      setTicketResult(result);
      setTicketForm({ subject: "", priority: "medium", crmStage: "none" });
      setSelectedCat("");
      setSelectedSub("");
      loadSessions();
    } catch (err) {
      setToast({ show: true, message: err.message, type: "error" });
      setTicketModal(false);
    } finally {
      setTicketSaving(false);
    }
  }

  function copyTicketLink() {
    const url = `${window.location.origin}/ticket-status/${ticketResult?.ticketId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const menuItems = [
    { label: "Performance", href: "/agent" },
    { label: "Active Queue", href: "/agent?tab=chats" },
  ];

  if (hasPermission(user, PERMISSIONS.TICKET_VIEW)) {
    menuItems.push({ label: "Tickets", href: "/agent?tab=tickets" });
  }

  if (hasPermission(user, PERMISSIONS.CRM_VIEW)) {
    menuItems.push({ label: "CRM", href: "/agent?tab=crm" });
  }

  if (hasPermission(user, PERMISSIONS.CRM_VIEW)) {
    menuItems.push({ label: "Customer Master", href: "/agent?tab=customer-master" });
  }

  if (!isBasicUser && canUseShortcuts) {
    menuItems.push({ label: "Shortcuts", href: "/agent?tab=shortcuts" });
  }

  menuItems.push({ label: "Settings", href: "/agent?tab=settings" });

  const searchedSessions = sessionSearch
    ? sessions.filter(s =>
      s.websiteId?.websiteName?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      s.visitorId?.visitorId?.toLowerCase().includes(sessionSearch.toLowerCase())
    )
    : sessions;

  const LEGACY_TRASH_AGE_MS = 7 * 86400000;
  const isLegacyTrashSession = (session) =>
    !session.archivedAt &&
    !session.restoredAt &&
    session.status === "closed" &&
    (Date.now() - new Date(session.closedAt || session.updatedAt).getTime()) > LEGACY_TRASH_AGE_MS;
  const activeSessions = searchedSessions.filter(s => !s.archivedAt && s.status !== "closed" && (s.status === "active" || s.status === "queued"));
  const closedSessions = searchedSessions.filter(s => !s.archivedAt && s.status === "closed" && !isLegacyTrashSession(s));
  const trashSessions = searchedSessions.filter(s => !!s.archivedAt || isLegacyTrashSession(s));

  const sessionTabMap = { active: activeSessions, closed: closedSessions, trash: trashSessions };
  const visibleSessions = sessionTabMap[sessionTab] ?? activeSessions;
  const paginatedVisibleSessions = getPaginationMeta(visibleSessions, chatPage);
  const paginatedDashboardSessions = getPaginationMeta(sessions, dashboardPage);

  useEffect(() => {
    setChatPage(1);
  }, [sessionTab, sessionSearch, sessions.length]);

  useEffect(() => {
    setDashboardPage(1);
  }, [sessions.length]);

  useEffect(() => {
    if (visibleSessions.length > 0) {
      const exists = visibleSessions.some(s => s.sessionId === selectedSessionId);
      if (!exists) {
        setSelectedSessionId(visibleSessions[0].sessionId);
      }
    } else {
      setSelectedSessionId("");
    }
  }, [visibleSessions, selectedSessionId]);

  const SESSION_TABS = [
    { key: "active", label: "Active", count: activeSessions.length, dot: "bg-emerald-500" },
    { key: "closed", label: "Closed", count: closedSessions.length, dot: "bg-slate-400" },
    { key: "trash", label: "Trash", count: trashSessions.length, dot: "bg-red-400" },
  ];

  const content = tab === "chats" ? (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[700px] animate-in slide-in-from-bottom-4 duration-700">
      <div className="lg:col-span-4 premium-card overflow-hidden flex flex-col p-0 border-none shadow-2xl">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h3 className="heading-md">My Chats</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sessions.length} total sessions</span>
          </div>
          <button
            type="button"
            onClick={toggleAvailability}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all shadow ${user?.isAvailable
              ? "bg-slate-950 text-white hover:bg-black"
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
              }`}
          >
            {user?.isAvailable ? "Deactivate" : "Activate"}
          </button>
        </div>

        <div className="flex border-b border-slate-100 bg-slate-50/40">
          {SESSION_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setSessionTab(t.key)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 ${sessionTab === t.key
                ? "border-indigo-600 text-indigo-600 bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
            >
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                {t.label}
              </span>
              <span className={`text-base font-black leading-none ${sessionTab === t.key ? "text-indigo-600" : "text-slate-500"}`}>{t.count}</span>
            </button>
          ))}
        </div>

        <div className="px-4 pt-3 pb-2">
          <input
            value={sessionSearch}
            onChange={e => setSessionSearch(e.target.value)}
            placeholder="Search by name or visitor ID…"
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all placeholder:text-slate-300"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30">
          {loadingSessions ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5 rounded-2xl border border-slate-100 bg-white animate-pulse space-y-2">
                <div className="h-3 bg-slate-100 rounded-lg w-3/4" />
                <div className="h-2 bg-slate-100 rounded-lg w-1/2" />
              </div>
            ))
          ) : paginatedVisibleSessions.pageItems.map((session) => (
            <div
              key={session._id}
              onClick={() => setSelectedSessionId(session.sessionId)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${selectedSessionId === session.sessionId
                ? "bg-white border-indigo-200 shadow-xl translate-x-1"
                : "bg-white border-slate-100 hover:border-slate-200"
                }`}
            >
              {selectedSessionId === session.sessionId && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-l-2xl" />}
              <div className="relative z-10 space-y-1 pl-1">
                <div className="flex items-center justify-between">
                  <strong className={`text-[10px] font-black tracking-wide block uppercase transition-colors ${selectedSessionId === session.sessionId ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {session.websiteId?.websiteName || "—"}
                  </strong>
                  {session.crn && (
                    <span className="text-[7px] font-black bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded border border-purple-100 uppercase tracking-tighter">
                      {session.crn}
                    </span>
                  )}
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${(session.archivedAt || isLegacyTrashSession(session))
                    ? 'bg-red-50 text-red-600 border-red-100'
                    : session.status === 'queued'
                      ? 'bg-amber-50 text-amber-600 border-amber-100'
                      : session.status === 'closed'
                        ? 'bg-slate-50 text-slate-400 border-slate-100'
                        : session.visitorId?.isOnline
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                    {(session.archivedAt || isLegacyTrashSession(session))
                      ? "Trash"
                      : session.status === 'queued'
                        ? "Queued"
                        : session.status === 'closed'
                          ? "Closed"
                          : session.visitorId?.isOnline
                            ? "Active"
                            : "Offline"}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase block truncate">
                  {session.visitorId?.visitorId}
                </span>
                {session.lastMessagePreview && (
                  <p className="text-[9px] text-slate-400 line-clamp-1 opacity-80">{session.lastMessagePreview}</p>
                )}
                {typingSessions[session.sessionId] && (
                  <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest animate-pulse">typing...</p>
                )}
              </div>
            </div>
          ))}
        </div>
        {!loadingSessions && (
          <div className="px-3 pb-3">
            <PaginationControls
              currentPage={paginatedVisibleSessions.currentPage}
              totalPages={paginatedVisibleSessions.totalPages}
              totalItems={paginatedVisibleSessions.totalItems}
              itemLabel="sessions"
              onPageChange={setChatPage}
            />
          </div>
        )}
      </div>

      <div className="lg:col-span-8 flex flex-col gap-8">
        <ChatPanel
          session={selectedSession}
          messages={messages}
          onSend={sendMessage}
          onTyping={sendTyping}
          isTyping={typingSessions[selectedSessionId]}
          viewers={sessionViewers[selectedSessionId] || []}
          typingAgent={typingAgents[selectedSessionId]}
          currentUser={user}
          onConvertToTicket={isBasicUser || !canUseTickets ? null : () => { setTicketModal(true); setTicketResult(null); }}
          canUseShortcuts={!isBasicUser && canUseShortcuts}
          disabled={!user?.isAvailable}
          onTakeOver={() => socket.emit("agent:take-over-chat", { sessionId: selectedSessionId })}
          onRelease={() => socket.emit("agent:release-chat", { sessionId: selectedSessionId })}
          onRequestControl={() => socket.emit("agent:request-control", { sessionId: selectedSessionId })}
        />

        {selectedSession && (
          <div className="premium-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-in zoom-in-95 duration-500 overflow-hidden">
            <div className="space-y-1">
              <h3 className="heading-md">Session Control</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-xs">
                {(selectedSession.archivedAt || isLegacyTrashSession(selectedSession))
                  ? "Restore this chat from trash or delete it permanently."
                  : selectedSession.status === "closed"
                    ? "Move this closed chat to trash for cleanup."
                    : isBasicUser
                      ? "Reply to and close your assigned chats."
                      : "Convert this chat to a ticket or close the session."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {!(selectedSession.archivedAt || isLegacyTrashSession(selectedSession)) && selectedSession.status !== "closed" && !isBasicUser ? (
                <>
                  {canUseTickets ? (
                    <button
                      type="button"
                      onClick={() => setHistoryModal(true)}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-sm flex items-center gap-2 relative whitespace-nowrap"
                    >
                      <History size={14} /> Customer Profile
                      {customerHistory?.tickets?.some(t => t.status === 'open') && (
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full shadow-lg shadow-red-500/50 animate-pulse" />
                      )}
                    </button>
                  ) : null}
                  {canUseTickets ? (
                    <button
                      type="button"
                      onClick={() => { setTicketModal(true); setTicketResult(null); }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-200 flex items-center gap-2 whitespace-nowrap"
                    >
                      <Ticket size={14} /> Generate Ticket
                    </button>
                  ) : null}
                </>
              ) : null}
              {!(selectedSession.archivedAt || isLegacyTrashSession(selectedSession)) && selectedSession.status !== "closed" ? (
                <button
                  type="button"
                  onClick={closeChat}
                  className="bg-slate-50 border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-100 text-slate-500 px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all whitespace-nowrap"
                >
                  Close Session
                </button>
              ) : null}
              {!(selectedSession.archivedAt || isLegacyTrashSession(selectedSession)) && selectedSession.status === "closed" ? (
                <button
                  type="button"
                  onClick={moveChatToTrash}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-amber-200 flex items-center gap-2 whitespace-nowrap"
                >
                  <Archive size={14} /> Move To Trash
                </button>
              ) : null}
              {(selectedSession.archivedAt || isLegacyTrashSession(selectedSession)) ? (
                <button
                  type="button"
                  onClick={restoreChat}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-sky-200 flex items-center gap-2 whitespace-nowrap"
                >
                  <RotateCcw size={14} /> Restore Chat
                </button>
              ) : null}
              {(selectedSession.archivedAt || isLegacyTrashSession(selectedSession)) && canDeleteChats ? (
                <button
                  type="button"
                  onClick={deleteChatPermanently}
                  className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-red-200 flex items-center gap-2 whitespace-nowrap"
                >
                  <Trash2 size={14} /> Delete Permanently
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  ) : tab === "settings" ? (
    <section className="max-w-xl animate-in slide-in-from-bottom-4 duration-700">
      <form className="premium-card p-10 space-y-8" onSubmit={updateProfile}>
        <div className="flex flex-col gap-1">
          <h3 className="heading-md">Security Identity</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manage your personal platform credentials.</p>
        </div>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="small-label">Display Name</label>
            <input
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
              placeholder="Your Name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="small-label">Communication Access (Email)</label>
            <input
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              type="email"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="space-y-1.5 pt-4 border-t border-slate-100">
            <label className="small-label text-slate-400">Update Encryption Key (Optional)</label>
            <input
              value={profileForm.password}
              onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
              type="password"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
              placeholder="Leave blank to keep unchanged"
            />
          </div>
        </div>
        <button type="submit" className="w-full bg-slate-950 hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center">
          Synchronize Identity Profile
        </button>
      </form>
    </section>
  ) : tab === "shortcuts" && !isBasicUser && canUseShortcuts ? (
    <section className="animate-in slide-in-from-bottom-4 duration-700">
      <CannedResponseManager />
    </section>
  ) : tab === "shortcuts" && !isBasicUser && !canUseShortcuts ? (
    <section className="animate-in slide-in-from-bottom-4 duration-700">
      <div className="rounded-[40px] border border-indigo-100 bg-indigo-50 p-12 text-center">
        <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">Shortcuts not included</h3>
        <p className="mt-3 text-sm font-bold text-indigo-700">This client package does not include the shortcuts module.</p>
      </div>
    </section>
  ) : tab === "tickets" ? (
    <section className="animate-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6 rounded-[32px] border border-indigo-100 bg-indigo-50/80 px-6 py-5">
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-indigo-950">Ticket Workspace</h3>
        <p className="mt-2 text-xs font-bold text-indigo-700">
          Agents can create tickets from active chats, then view and update ticket status here.
        </p>
      </div>
      <TicketManager websiteId="" />
    </section>
  ) : tab === "crm" ? (
    <section className="animate-in slide-in-from-bottom-4 duration-700 space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white/90 px-6 py-5 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-950">CRM Overview</h3>
        <p className="mt-2 text-xs font-bold text-slate-500">
          Agents can view CRM records and status here. Editing remains disabled for this role.
        </p>
      </div>
      <CRMManager websiteId="" />
    </section>
  ) : tab === "customer-master" ? (
    <section className="animate-in slide-in-from-bottom-4 duration-700">
      <CustomerManager websiteId="" />
    </section>
  ) : (
    <AgentPerformanceView />
  );

  const pageTitle =
    tab === "chats" ? "Operation Room" :
      tab === "tickets" ? "Ticket Desk" :
        tab === "crm" ? "CRM Access" :
          tab === "customer-master" ? "Customer Master Registry" :
            tab === "settings" ? "Agent Settings" :
              "Command Center";

  const pageSubtitle =
    tab === "chats" ? "Manage and resolve active visitor streams" :
      tab === "tickets" ? "Create from chats, then view and update support tickets" :
        tab === "crm" ? "View customer pipeline records and current status" :
          tab === "customer-master" ? "Manage and refine the elite customer master database" :
            tab === "settings" ? "Manage your system identity" :
              "High-level performance metrics";

  return (
    <Layout title={pageTitle} subtitle={pageSubtitle} menuItems={menuItems}>
      {toast.show && (
        <div className="fixed bottom-10 right-10 bg-slate-900 border border-slate-800 text-white shadow-2xl px-6 py-4 rounded-2xl text-[12px] font-bold flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-500 z-50">
          <span className={`w-2.5 h-2.5 rounded-full ${toast.type === "error" ? "bg-red-500 animate-pulse" : "bg-indigo-500"}`}></span>
          {toast.message}
          <button onClick={() => setToast({ show: false, message: "", type: "info" })} className="ml-4 text-slate-400 hover:text-white transition-colors">✕</button>
        </div>
      )}
      {content}

      {ticketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => { setTicketModal(false); setTicketResult(null); }} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Ticket size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Generate Support Ticket</h3>
                </div>
              </div>
              <button onClick={() => { setTicketModal(false); setTicketResult(null); }} className="p-2 text-slate-300 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all">
                <X size={16} />
              </button>
            </div>

            {ticketResult ? (
              <div className="p-8 space-y-6 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto">
                  <CheckCheck size={28} className="text-emerald-500" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900">{ticketResult.ticketId}</h4>
                  <p className="text-xs text-slate-500 font-bold mt-1">{ticketResult.subject}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Visitor Status Link</p>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                    <Link size={12} className="text-indigo-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-600 flex-1 truncate">
                      {window.location.origin}/ticket-status/{ticketResult.ticketId}
                    </span>
                    <button onClick={copyTicketLink} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-400">
                      {copiedLink ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setTicketModal(false); setTicketResult(null); }}
                  className="w-full bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={generateTicket} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pipeline Category</label>
                    <select
                      value={selectedCat}
                      onChange={(e) => {
                        setSelectedCat(e.target.value);
                        setSelectedSub("");
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub-Tier</label>
                    <select
                      value={selectedSub}
                      onChange={(e) => setSelectedSub(e.target.value)}
                      disabled={!selectedCat}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 disabled:opacity-50"
                    >
                      <option value="">Select Sub-tier</option>
                      {categories.find(c => c.name === selectedCat)?.subcategories?.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ticket Subject</label>
                  <input
                    value={ticketForm.subject}
                    onChange={e => setTicketForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder={`Support – ${selectedSession?.websiteId?.websiteName || 'Chat Session'}`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 placeholder-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Priority Level</label>
                  <select
                    value={ticketForm.priority}
                    onChange={e => setTicketForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  >
                    <option value="low">🟢 Low — General inquiry</option>
                    <option value="medium">🔵 Medium — Standard issue</option>
                    <option value="high">🟠 High — Needs attention</option>
                    <option value="urgent">🔴 Urgent — Critical problem</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">CRM Sales Stage</label>
                  <select
                    value={ticketForm.crmStage}
                    onChange={e => setTicketForm(f => ({ ...f, crmStage: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  >
                    <option value="none">🛠️ Standard Support</option>
                    <option value="lead">✨ New Lead</option>
                    <option value="qualified">💎 Qualified</option>
                    <option value="opportunity">🚀 Opportunity</option>
                    <option value="won">🏆 Won</option>
                    <option value="lost">❌ Lost</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setTicketModal(false)} className="flex-1 border border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl hover:bg-slate-50 transition-all">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={ticketSaving}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {ticketSaving ? <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : <Ticket size={13} />}
                    {ticketSaving ? "Generating..." : "Create Ticket"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setHistoryModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-full max-h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
                  <History size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Customer Intelligence</h3>
                  {selectedSession?.crn && <span className="text-[9px] font-black text-purple-500 uppercase tracking-[0.3em]">{selectedSession.crn}</span>}
                </div>
              </div>
              <button onClick={() => setHistoryModal(false)} className="p-2 text-slate-300 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <span className="animate-spin w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full mb-4" />
                </div>
              ) : customerHistory ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 border border-purple-100 rounded-2xl bg-purple-50/30">
                      <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1">Customer CRN</p>
                      <p className="text-sm font-black text-purple-900">{selectedSession?.crn || "NOT ASSIGNED"}</p>
                    </div>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Session Identity</p>
                      <p className="text-sm font-black text-slate-800">{selectedSession?.visitorId?.name || "Anonymous"}</p>
                      <p className="text-[10px] text-slate-500 font-bold truncate">{selectedSession?.visitorId?.email || "No email"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span>Ticket History</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{customerHistory.tickets?.length || 0}</span>
                    </h4>
                    <div className="space-y-3">
                      {customerHistory.tickets?.length > 0 ? customerHistory.tickets.map(ticket => (
                        <div key={ticket._id} className="p-5 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-indigo-100 transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-2 py-1 rounded tracking-widest">{ticket.ticketId}</span>
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${ticket.status === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{ticket.status}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700">{ticket.subject}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      )) : (
                        <p className="text-[10px] text-slate-400 text-center py-4 font-bold uppercase">No tickets found for this CRN</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span>Chat Interactions</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{customerHistory.sessions?.length || 0}</span>
                    </h4>
                    <div className="space-y-3">
                      {customerHistory.sessions?.length > 0 ? customerHistory.sessions.map(s => (
                        <div key={s._id} className="p-4 border border-slate-50 rounded-2xl bg-slate-50/50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xs">💬</div>
                            <div>
                              <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{s.websiteId?.websiteName}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[150px]">{s.lastMessagePreview || "No messages"}</p>
                            </div>
                          </div>
                          <span className="text-[8px] font-black text-slate-300">{new Date(s.createdAt).toLocaleDateString()}</span>
                        </div>
                      )) : (
                        <p className="text-[10px] text-slate-400 text-center py-4 font-bold uppercase">No previous chats recorded</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Visitor Name</p>
                      <p className="text-sm font-black text-slate-900">{selectedSession?.visitorId?.name || "Anonymous Visitor"}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-2">Live chat visitor profile</p>
                    </div>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Visitor Email</p>
                      <p className="text-sm font-black text-slate-900 break-all">{selectedSession?.visitorId?.email || "No email shared yet"}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-2">Captured from the visitor session</p>
                    </div>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Visitor ID</p>
                      <p className="text-sm font-black text-slate-900 break-all">{selectedSession?.visitorId?.visitorId || "Unavailable"}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-2">Session identity reference</p>
                    </div>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current CRN</p>
                      <p className="text-sm font-black text-slate-900">{selectedSession?.crn || "Not Assigned"}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-2">CRM customer record has not been created yet</p>
                    </div>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Browser / Device</p>
                      <p className="text-sm font-black text-slate-900">
                        {[selectedSession?.visitorId?.browser, selectedSession?.visitorId?.os].filter(Boolean).join(" / ") || "Not detected"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-2">{selectedSession?.visitorId?.device || "Unknown device"}</p>
                    </div>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                      <p className="text-sm font-black text-slate-900">
                        {[selectedSession?.visitorId?.city, selectedSession?.visitorId?.country].filter(Boolean).join(", ") || selectedSession?.visitorId?.country || "Unknown"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-2">{selectedSession?.visitorId?.timezone || "Timezone unavailable"}</p>
                    </div>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">IP Address</p>
                      <p className="text-sm font-black text-slate-900 break-all">{selectedSession?.visitorId?.ipAddress || "Unavailable"}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-2">Captured from visitor connection</p>
                    </div>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Page</p>
                      <p className="text-sm font-black text-slate-900 break-all">{selectedSession?.currentPage || "Unavailable"}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-2">
                        First visit: {selectedSession?.visitorId?.firstVisitTime ? new Date(selectedSession.visitorId.firstVisitTime).toLocaleString() : "Unknown"}
                      </p>
                    </div>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Journey Entry</p>
                      <p className="text-sm font-black text-slate-900 break-all">{selectedSession?.firstPage || "Unavailable"}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-2">Unread queue count: {selectedSession?.unreadCount || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Visitor Journey Timeline</h4>
                    <div className="rounded-3xl border border-slate-100 bg-white p-5">
                      <ActivityTimeline items={sessionActivity} emptyLabel="No chat session activity recorded yet." />
                    </div>
                    {(selectedSession?.visitHistory || []).length > 0 ? (
                      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Visited Pages</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedSession.visitHistory.map((page, index) => (
                            <span key={`${page}-${index}`} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-black text-slate-600">
                              {page}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-6 border border-dashed border-slate-200 rounded-3xl bg-slate-50/70 text-center text-slate-300">
                    <div className="w-16 h-16 rounded-3xl bg-white border border-slate-100 flex items-center justify-center mx-auto mb-5">
                      <History size={26} className="text-slate-300" />
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      No Customer Intelligence Available
                    </p>
                    <p className="text-[11px] text-slate-400 font-bold mt-3 max-w-md leading-relaxed mx-auto">
                      This visitor is visible here, but the chat is not linked to a CRM customer yet. Customer Intelligence becomes richer after a CRN/customer record or ticket history is created.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-50 bg-slate-50/50 shrink-0">
              <button onClick={() => setHistoryModal(false)} className="w-full bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all">Close Intelligence Tool</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
