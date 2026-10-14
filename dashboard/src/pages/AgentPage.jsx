import { useEffect, useMemo, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useSearchParams } from "react-router-dom";
import { Ticket, Link, Copy, CheckCheck, X, History, AlertCircle, Archive, RotateCcw, Trash2, ShieldCheck, User, Lock, CheckCircle, Activity } from "lucide-react";
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
import IncomingCallModal from "../components/IncomingCallModal.jsx";
import ActiveCallBar from "../components/ActiveCallBar.jsx";
import TransferCallModal from "../components/TransferCallModal.jsx";
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

  // Live WebRTC Voice Call Handoff States
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isCallHeld, setIsCallHeld] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(typeof Audio !== "undefined" ? new Audio() : null);

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

    const handleVisitorStatus = ({ sessionId, visitorId, isOnline, lastActiveAt }) => {
      setSessions(prev => prev.map(s => {
        const matchesSession = sessionId && s.sessionId === sessionId;
        const matchesVisitor = visitorId && (
          s.visitorId?._id === visitorId ||
          s.visitorId?.visitorId === visitorId ||
          String(s.visitorId) === String(visitorId)
        );
        if (matchesSession || matchesVisitor) {
          return {
            ...s,
            isOnline: Boolean(isOnline),
            visitorId: s.visitorId && typeof s.visitorId === "object"
              ? { ...s.visitorId, isOnline: Boolean(isOnline), lastVisitTime: lastActiveAt || new Date() }
              : s.visitorId
          };
        }
        return s;
      }));
    };

    socket.on("visitor:status", handleVisitorStatus);
    socket.on("visitor:online", (data) => handleVisitorStatus({ ...data, isOnline: true }));
    socket.on("visitor:offline", (data) => handleVisitorStatus({ ...data, isOnline: false }));

    // Voice Call Handoff & WebRTC Signaling
    socket.on("call:incoming", (callData) => {
      console.log("[AgentPage] Incoming voice call:", callData);
      setIncomingCall(callData);
    });

    socket.on("call:answered", ({ callId }) => {
      setIncomingCall(prev => (prev?.callId === callId ? null : prev));
    });

    socket.on("call:webrtc-signal", async ({ senderSocketId, signalData }) => {
      if (!peerConnectionRef.current) return;
      try {
        if (signalData.sdp) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
          if (signalData.sdp.type === "offer") {
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            socket.emit("call:webrtc-signal", {
              targetSocketId: senderSocketId,
              signalData: { sdp: peerConnectionRef.current.localDescription }
            });
          }
        } else if (signalData.candidate) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
      } catch (err) {
        console.error("[AgentPage] WebRTC signal error:", err);
      }
    });

    socket.on("call:transferred-success", ({ callId, newAgentName }) => {
      setToast({
        show: true,
        message: `Call successfully transferred to ${newAgentName || 'Senior Specialist'}!`,
        type: "success"
      });
      endActiveCall();
    });

    socket.on("call:ended", () => {
      endActiveCall();
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
      socket.off("visitor:status", handleVisitorStatus);
      socket.off("visitor:online");
      socket.off("visitor:offline");
      socket.off("chat:control-requested");
      socket.off("call:incoming");
      socket.off("call:answered");
      socket.off("call:webrtc-signal");
      socket.off("call:ended");
    };
  }, [user?._id, socket]);

  const handleAcceptCall = async () => {
    if (!incomingCall || !socket) return;
    const currentCall = incomingCall;
    setIncomingCall(null);
    setActiveCall(currentCall);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:webrtc-signal", {
            targetSocketId: currentCall.visitorSocketId,
            signalData: { candidate: event.candidate }
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0] && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(e => console.warn("Remote audio play error:", e));
        }
      };

      socket.emit("call:accept", {
        callId: currentCall.callId,
        sessionId: currentCall.sessionId,
        visitorSocketId: currentCall.visitorSocketId,
        isTransferred: currentCall.isTransferred,
        transferredBySocketId: currentCall.transferredBySocketId
      });

    } catch (err) {
      console.error("[AgentPage] Mic access or WebRTC error:", err);
      setToast({ show: true, message: "Microphone permission required to accept voice call.", type: "error" });
      setActiveCall(null);
    }
  };

  const handleDeclineCall = () => {
    if (incomingCall && socket) {
      socket.emit("call:reject", {
        callId: incomingCall.callId,
        visitorSocketId: incomingCall.visitorSocketId
      });
    }
    setIncomingCall(null);
  };

  const handleTransferCall = (targetAgentId, transferNote) => {
    if (!activeCall || !socket) return;
    socket.emit("call:transfer", {
      callId: activeCall.callId,
      sessionId: activeCall.sessionId,
      visitorSocketId: activeCall.visitorSocketId,
      targetAgentId,
      transferNote,
      callerDetails: activeCall
    });

    setToast({
      show: true,
      message: "Call transfer initiated. Ringing senior agent...",
      type: "info"
    });
  };

  const endActiveCall = () => {
    if (activeCall && socket) {
      socket.emit("call:end", {
        callId: activeCall.callId,
        targetSocketId: activeCall.visitorSocketId
      });
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setActiveCall(null);
    setIsCallMuted(false);
    setIsCallHeld(false);
  };

  const toggleMuteCall = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsCallMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleHoldCall = () => {
    setIsCallHeld(prev => !prev);
  };

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

    const vName = (ticketForm.visitorName || selectedSession?.visitorId?.name || "").trim();
    const vEmail = (ticketForm.visitorEmail || selectedSession?.visitorId?.email || "").trim();

    if (!vName || vName.toLowerCase() === "anonymous" || vName.toLowerCase() === "anonymous user" || vName.startsWith("visitor_")) {
      setToast({ show: true, message: "Visitor Name is required. Anonymous tickets cannot be generated.", type: "error" });
      return;
    }

    if (!vEmail || !vEmail.includes("@")) {
      setToast({ show: true, message: "A valid Visitor Email is required to generate a ticket.", type: "error" });
      return;
    }

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
          subcategory: selectedSub || undefined,
          visitorName: vName,
          visitorEmail: vEmail
        })
      });
      setTicketResult(result);
      setTicketForm({ subject: "", priority: "medium", crmStage: "none", visitorName: "", visitorEmail: "" });
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
      s.visitorId?.name?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      s.visitorId?.visitorId?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      s.crn?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      s.lastMessagePreview?.toLowerCase().includes(sessionSearch.toLowerCase())
    )
    : sessions;

  const LEGACY_TRASH_AGE_MS = 7 * 86400000;
  const isLegacyTrashSession = (session) =>
    !session.archivedAt &&
    !session.restoredAt &&
    session.status === "closed" &&
    (Date.now() - new Date(session.closedAt || session.updatedAt).getTime()) > LEGACY_TRASH_AGE_MS;

  // Group unique visitors for clean presentation
  const groupUniqueVisitors = (list) => {
    const map = new Map();
    list.forEach(session => {
      const rawName = (session.visitorId?.name || "").trim().toLowerCase();
      const rawEmail = (session.visitorId?.email || "").trim().toLowerCase();
      const siteId = session.websiteId?._id || session.websiteId || "site";
      const isNamed = rawName && rawName !== "visitor" && !rawName.startsWith("visitor_");

      const visitorKey = 
        session.crn ||
        rawEmail ||
        (isNamed ? `${rawName}_${siteId}` : null) ||
        session.visitorId?._id || 
        session.visitorId?.visitorId || 
        session.sessionId;

      if (!map.has(visitorKey)) {
        map.set(visitorKey, { ...session, allSessions: [session] });
      } else {
        const existing = map.get(visitorKey);
        existing.allSessions.push(session);
        const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
        const currentTime = new Date(session.updatedAt || session.createdAt).getTime();
        if (currentTime > existingTime) {
          map.set(visitorKey, { ...session, allSessions: existing.allSessions });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  };

  const rawActive = searchedSessions.filter(s => !s.archivedAt && s.status !== "closed" && (s.status === "active" || s.status === "queued"));
  const rawClosed = searchedSessions.filter(s => !s.archivedAt && s.status === "closed" && !isLegacyTrashSession(s));
  const rawTrash = searchedSessions.filter(s => !!s.archivedAt || isLegacyTrashSession(s));

  const activeSessions = useMemo(() => groupUniqueVisitors(rawActive), [rawActive]);
  const closedSessions = useMemo(() => groupUniqueVisitors(rawClosed), [rawClosed]);
  const trashSessions = useMemo(() => groupUniqueVisitors(rawTrash), [rawTrash]);

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
      const exists = visibleSessions.some(s => s.sessionId === selectedSessionId || (s.allSessions && s.allSessions.some(as => as.sessionId === selectedSessionId)));
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

  const [mobileView, setMobileView] = useState("queue");
  const content = tab === "chats" ? (
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0 flex-1 overflow-hidden animate-fade-in">
        {/* Left Column: My Chats Session List */}
        <div className={`lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col h-full min-h-0 ${mobileView === "chat" ? "hidden lg:flex" : "flex"}`}>
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-white/10 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Operation Chats</h3>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {sessions.length} Total
                </span>
              </div>
              <button
                type="button"
                onClick={toggleAvailability}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${user?.isAvailable
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
              >
                <span className={`w-2 h-2 rounded-full ${user?.isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                <span>{user?.isAvailable ? "Online" : "Go Online"}</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                value={sessionSearch}
                onChange={e => setSessionSearch(e.target.value)}
                placeholder="Search visitor, CRN, or website..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1">
              {SESSION_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setSessionTab(t.key)}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${sessionTab === t.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 border border-slate-200 dark:border-white/5"
                    }`}
                >
                  <span>{t.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${sessionTab === t.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sessions Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {loadingSessions ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 animate-pulse space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-2 bg-slate-200 rounded w-1/2" />
                </div>
              ))
            ) : paginatedVisibleSessions.pageItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium">
                No conversations found under this filter.
              </div>
            ) : (
              paginatedVisibleSessions.pageItems.map((session) => {
                const isSelected = selectedSessionId === session.sessionId || (session.allSessions && session.allSessions.some(as => as.sessionId === selectedSessionId));
                return (
                <div
                  key={session._id}
                  onClick={() => { setSelectedSessionId(session.sessionId); setMobileView("chat"); }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${isSelected
                    ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500/30 shadow-sm"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/5 hover:border-slate-300"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>
                      {session.visitorId?.name || session.visitorId?.visitorId || "Visitor"}
                    </span>
                    
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      session.status === 'queued'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : session.status === 'closed'
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : (session.visitorId?.isOnline || session.isOnline)
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1'
                            : 'bg-slate-100 text-slate-500 border-slate-200 flex items-center gap-1'
                    }`}>
                      {session.status === 'queued' ? (
                        "Queued"
                      ) : session.status === 'closed' ? (
                        "Closed"
                      ) : (session.visitorId?.isOnline || session.isOnline) ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Online</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Offline</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate max-w-[150px]">{session.websiteId?.websiteName || "General Website"}</span>
                    {session.crn && (
                      <span className="text-[10px] font-semibold bg-purple-50 text-purple-600 px-1.5 py-0.2 rounded border border-purple-100">
                        {session.crn}
                      </span>
                    )}
                  </div>

                  {session.lastMessagePreview && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-1 font-medium">
                      {session.lastMessagePreview}
                    </p>
                  )}

                  {typingSessions[session.sessionId] && (
                    <p className="text-xs text-indigo-600 font-bold animate-pulse mt-0.5">Visitor is typing...</p>
                  )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {!loadingSessions && paginatedVisibleSessions.totalPages > 1 && (
            <div className="p-2 border-t border-slate-100 dark:border-white/5">
              <PaginationControls
                currentPage={paginatedVisibleSessions.currentPage}
                totalPages={paginatedVisibleSessions.totalPages}
                totalItems={paginatedVisibleSessions.totalItems}
                itemLabel="chats"
                onPageChange={setChatPage}
              />
            </div>
          )}
        </div>

        {/* Right Column: Chat Panel */}
        <div className={`lg:col-span-8 h-full min-h-0 flex flex-col overflow-hidden relative ${mobileView === "queue" ? "hidden lg:flex" : "flex"}`}>
          <div className="lg:hidden flex items-center justify-between bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm mb-2">
            <button
              type="button"
              onClick={() => setMobileView("queue")}
              className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold"
            >
              ← Back to Chats
            </button>
            <span className="text-xs font-bold text-slate-700">
              {selectedSession?.websiteId?.websiteName || "Chat Panel"}
            </span>
          </div>

          <ChatPanel
            session={selectedSession}
            messages={messages}
            onSend={sendMessage}
            onTyping={sendTyping}
            isTyping={typingSessions[selectedSessionId]}
            viewers={sessionViewers[selectedSessionId] || []}
            typingAgent={typingAgents[selectedSessionId]}
            currentUser={user}
            onConvertToTicket={isBasicUser || !canUseTickets ? null : () => {
              const existingName = (selectedSession?.visitorId?.name && selectedSession?.visitorId?.name !== "Anonymous" && !selectedSession?.visitorId?.name.startsWith("visitor_")) ? selectedSession?.visitorId?.name : "";
              const existingEmail = selectedSession?.visitorId?.email || "";
              setTicketForm({
                subject: `Support – ${selectedSession?.websiteId?.websiteName || 'Chat Session'}`,
                priority: "medium",
                crmStage: "none",
                visitorName: existingName,
                visitorEmail: existingEmail
              });
              setTicketModal(true);
              setTicketResult(null);
            }}
            canUseShortcuts={!isBasicUser && canUseShortcuts}
            onTakeOver={() => socket.emit("agent:take-over-chat", { sessionId: selectedSessionId })}
            onRelease={() => socket.emit("agent:release-chat", { sessionId: selectedSessionId })}
            onRequestControl={() => socket.emit("agent:request-control", { sessionId: selectedSessionId })}
            onClose={closeChat}
            onMoveToTrash={moveChatToTrash}
            onRestore={restoreChat}
            onDeletePermanent={deleteChatPermanently}
          />
        </div>
      </section>
    ) : tab === "settings" ? (
    <section className="w-full space-y-3 animate-in fade-in duration-500">
      {/* ── Main Unified Settings Console Card ── */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        
        {/* Top Profile Summary Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 uppercase">
              {user?.name?.[0] || "A"}{user?.name?.split(" ")?.[1]?.[0] || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">{user?.name || "Agent User"}</h3>
                <span className="bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-500/20 uppercase tracking-wider">
                  {user?.role || "Agent"}
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{user?.email || "agent@gmail.com"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleAvailability}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                user?.isAvailable
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100/70"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${user?.isAvailable ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              <span>{user?.isAvailable ? "Online & Ready" : "Standby Mode"}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Content Grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Form: Profile Credentials */}
          <form className="space-y-4" onSubmit={updateProfile}>
            <div className="pb-2.5 border-b border-slate-100 dark:border-white/5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <User size={13} className="text-sky-600" /> Personal Identity Details
              </h4>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Public Display Name *
                </label>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-sky-500 focus:bg-white transition-all"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Communication Access (Email) *
                </label>
                <input
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  type="email"
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-sky-500 focus:bg-white transition-all"
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Update Password <span className="font-normal text-slate-400">(Optional — leave blank if unchanged)</span>
                </label>
                <input
                  value={profileForm.password}
                  onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                  type="password"
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-sky-500 focus:bg-white transition-all"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={14} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>

          {/* Right Info: Live Status & Account Security */}
          <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 dark:border-white/5 pt-4 md:pt-0 md:pl-6">
            <div className="pb-2.5 border-b border-slate-100 dark:border-white/5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-500" /> Account & Security Details
              </h4>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Role</span>
                <span className="font-extrabold text-sky-600 dark:text-sky-400 uppercase">{user?.role || "Agent"}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Security</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">JWT Encrypted</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Status</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">Active</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50/40 dark:bg-sky-500/5 border border-sky-100 dark:border-sky-500/10">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Your agent profile is active for routing visitor chat queues, handling real-time communications, and resolving customer tickets across assigned websites.
              </p>
            </div>
          </div>

        </div>
      </div>
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
    <section className="animate-in fade-in duration-500">
      <TicketManager websiteId="" />
    </section>
  ) : tab === "crm" ? (
    <section className="animate-in fade-in duration-500">
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
              <form onSubmit={generateTicket} className="p-8 space-y-4 overflow-y-auto custom-scrollbar">
                {/* Mandatory Visitor Identity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Visitor Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      value={ticketForm.visitorName || ""}
                      onChange={e => setTicketForm(f => ({ ...f, visitorName: e.target.value }))}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Visitor Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={ticketForm.visitorEmail || ""}
                      onChange={e => setTicketForm(f => ({ ...f, visitorEmail: e.target.value }))}
                      placeholder="visitor@example.com"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

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
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    Ticket Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={ticketForm.subject}
                    onChange={e => setTicketForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder={`Support – ${selectedSession?.websiteId?.websiteName || 'Chat Session'}`}
                    required
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

      {incomingCall && (
        <IncomingCallModal
          callData={incomingCall}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {activeCall && (
        <ActiveCallBar
          callData={activeCall}
          onEndCall={endActiveCall}
          onToggleMute={toggleMuteCall}
          onToggleHold={toggleHoldCall}
          onOpenTransfer={() => setIsTransferModalOpen(true)}
          isMuted={isCallMuted}
          isHeld={isCallHeld}
        />
      )}

      {activeCall && (
        <TransferCallModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          activeCall={activeCall}
          onConfirmTransfer={handleTransferCall}
        />
      )}
    </Layout>
  );
}
