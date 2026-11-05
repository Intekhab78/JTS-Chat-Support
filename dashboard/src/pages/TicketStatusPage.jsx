import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { apiUrl, getApiBase } from "../api/client.js";
import {
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  User,
  ShieldCheck,
  Ticket,
  Headphones,
  Radio,
  Calendar,
  Sparkles,
  Phone,
  PhoneCall,
  Copy,
  Check,
  Hash,
  ExternalLink,
  ChevronRight
} from "lucide-react";

const STATUS_STEPS = ["open", "in_progress", "waiting", "resolved", "closed"];

const STATUS_CONFIG = {
  open: {
    label: "Open",
    desc: "Your ticket has been received and queued for specialist review.",
    color: "#6366f1",
    bg: "bg-indigo-50 dark:bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-500/30"
  },
  in_progress: {
    label: "In Progress",
    desc: "An assigned specialist is actively reviewing and working on this request.",
    color: "#f59e0b",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-500/30"
  },
  waiting: {
    label: "Waiting",
    desc: "We are awaiting additional information or internal verification before next step.",
    color: "#8b5cf6",
    bg: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-500/30"
  },
  pending: {
    label: "In Progress",
    desc: "Your ticket is under review by support specialists.",
    color: "#f59e0b",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-500/30"
  },
  resolved: {
    label: "Resolved",
    desc: "This request has been successfully resolved. You can still message us below if needed.",
    color: "#10b981",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-500/30"
  },
  closed: {
    label: "Closed",
    desc: "This ticket has been officially closed. Thank you for reaching out!",
    color: "#64748b",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700"
  }
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "#94a3b8", bg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  medium: { label: "Medium", color: "#6366f1", bg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" },
  high: { label: "High", color: "#f97316", bg: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400" },
  urgent: { label: "Urgent", color: "#ef4444", bg: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" }
};

export default function TicketStatusPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [senderName, setSenderName] = useState(() => localStorage.getItem("csw_portal_name") || "");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState("");
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const notesEndRef = useRef(null);

  const fetchTicket = () => {
    if (!ticketId) return;
    setLoading(true);
    apiUrl(`/api/tickets/public/${ticketId}`)
      .then((url) => fetch(url))
      .then((r) => (r.ok ? r.json() : r.json().then((e) => Promise.reject(e.message))))
      .then((data) => {
        setTicket(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(typeof err === "string" ? err : "Ticket not found or inaccessible.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  // Real-Time Socket.IO Synchronization
  useEffect(() => {
    if (!ticketId) return;
    let socket = null;

    getApiBase().then((apiBase) => {
      try {
        socket = io(apiBase, {
          transports: ["polling", "websocket"],
          auth: { type: "ticket_viewer", ticketId },
          withCredentials: true
        });

        socket.on("connect", () => {
          setIsLiveConnected(true);
          socket.emit("ticket:subscribe", { ticketId });
        });

        socket.on("disconnect", () => {
          setIsLiveConnected(false);
        });

        socket.on("ticket:updated", (payload) => {
          if (payload.ticketId === ticketId) {
            setTicket((prev) => {
              if (!prev) return prev;
              const next = { ...prev };
              if (payload.status) next.status = payload.status;
              if (payload.priority) next.priority = payload.priority;
              if (payload.updatedAt) next.updatedAt = payload.updatedAt;

              if (payload.newNote) {
                const currentNotes = prev.notes ? [...prev.notes] : [];
                const isDup = currentNotes.some(
                  (n) =>
                    n.content === payload.newNote.content &&
                    Math.abs(new Date(n.createdAt) - new Date(payload.newNote.createdAt)) < 3000
                );
                if (!isDup) {
                  currentNotes.push(payload.newNote);
                }
                next.notes = currentNotes;
              }
              return next;
            });
            setTimeout(() => {
              notesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }
        });
      } catch (err) {
        console.warn("[TicketPortal] Socket connection error:", err);
      }
    });

    return () => {
      if (socket) {
        socket.emit("ticket:unsubscribe", { ticketId });
        socket.disconnect();
      }
    };
  }, [ticketId]);

  const handleCopyTicketId = () => {
    if (!ticketId) return;
    navigator.clipboard?.writeText(ticketId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    if (!replyMessage.trim() || sending) return;

    setSending(true);
    setSendError("");
    setSendSuccess(false);

    try {
      const url = await apiUrl(`/api/tickets/public/${ticketId}/notes`);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: replyMessage.trim(),
          senderName: senderName.trim() || "Customer"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to deliver message");
      }

      if (senderName.trim()) {
        localStorage.setItem("csw_portal_name", senderName.trim());
      }

      setTicket((prev) => {
        if (!prev) return prev;
        const currentNotes = prev.notes ? [...prev.notes] : [];
        if (data.note) {
          const isDup = currentNotes.some((n) => n.content === data.note.content);
          if (!isDup) currentNotes.push(data.note);
        }
        return {
          ...prev,
          status: data.status || prev.status,
          notes: currentNotes
        };
      });

      setReplyMessage("");
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3500);
      setTimeout(() => {
        notesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setSendError(err.message || "Could not post message. Please retry.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const currentStepIndex = ticket ? STATUS_STEPS.indexOf(ticket.status) : -1;
  const primaryColor = ticket?.website?.primaryColor || "#10b981";
  const priorityInfo = PRIORITY_CONFIG[ticket?.priority] || PRIORITY_CONFIG.medium;
  const statusInfo = STATUS_CONFIG[ticket?.status] || STATUS_CONFIG.open;

  return (
    <div className="h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300 overflow-hidden">
      {/* Top Professional Header Bar */}
      <header className="shrink-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs z-30">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-13 flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
              style={{ backgroundColor: primaryColor }}
            >
              <Ticket size={15} strokeWidth={2.4} />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {ticket?.website?.websiteName || "Support Desk"}
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-semibold text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-2">
                Ticket Tracking Portal
              </span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Omnichannel Status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${isLiveConnected
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                }`}
              title={isLiveConnected ? "Real-Time 2-Way Omnichannel Sync Active" : "Connecting..."}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isLiveConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  }`}
              />
              <span className="hidden xs:inline">
                {isLiveConnected ? "Live Connected" : "Connecting..."}
              </span>
            </div>

            {/* Ticket ID Pill */}
            {ticket && (
              <button
                type="button"
                onClick={handleCopyTicketId}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10.5px] font-mono font-bold transition-all border border-slate-200/80 dark:border-slate-700"
                title="Click to copy Ticket ID"
              >
                <span>{ticket.ticketId}</span>
                {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} className="text-slate-400" />}
              </button>
            )}

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={fetchTicket}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh Ticket Data"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-indigo-500" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Equal-Height Two-Column Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 overflow-hidden min-h-0">
        {loading && !ticket && (
          <div className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center shadow-xs">
            <RefreshCw size={24} className="animate-spin mb-2" style={{ color: primaryColor }} />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Loading support ticket details...
            </p>
          </div>
        )}

        {error && (
          <div className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/40 p-8 flex flex-col items-center justify-center max-w-md mx-auto shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Ticket Unavailable</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{error}</p>
            <button
              onClick={fetchTicket}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800"
            >
              Try Again
            </button>
          </div>
        )}

        {ticket && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* Left Column: Equal Height Ticket Overview, Stepper & Meta */}
            <div className="lg:col-span-5 h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-4 sm:p-5 overflow-y-auto justify-between">
              <div className="space-y-4">
                {/* 1. Header Badges & Subject */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: statusInfo.color }} />
                      {statusInfo.label}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                      {ticket.channel === "phone" ? <Phone size={10} /> : <MessageSquare size={10} />}
                      {ticket.channel === "phone" ? "Phone Callback" : ticket.channel || "Live Chat"}
                    </span>
                  </div>

                  <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug flex items-center gap-1.5">
                    {ticket.channel === "phone" ? (
                      <PhoneCall size={14} className="text-emerald-500 shrink-0 inline" />
                    ) : (
                      <Ticket size={14} style={{ color: primaryColor }} className="shrink-0 inline" />
                    )}
                    <span>{(ticket.subject || "").replace(/^[📞🎫]\s*/, "")}</span>
                  </h1>

                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mt-2">
                    {statusInfo.desc}
                  </p>
                </div>

                {/* 2. Resolution Progress Stepper */}
                <div className="bg-slate-50/70 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[9.5px] uppercase font-bold tracking-wider text-slate-400 mb-2.5">
                    <span>Resolution Workflow</span>
                    <span style={{ color: primaryColor }}>
                      Step {Math.max(1, currentStepIndex + 1)} of {STATUS_STEPS.length}
                    </span>
                  </div>

                  <div className="relative pb-1">
                    {/* Stepper Track */}
                    <div className="absolute top-2.5 left-2 right-2 h-0.5 bg-slate-200 dark:bg-slate-700" />
                    <div
                      className="absolute top-2.5 left-2 h-0.5 transition-all duration-700"
                      style={{
                        backgroundColor: primaryColor,
                        width: `${Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 96)}%`
                      }}
                    />

                    {/* Step Nodes */}
                    <div className="relative flex justify-between">
                      {STATUS_STEPS.map((step, i) => {
                        const isCompleted = i <= currentStepIndex;
                        const isCurrent = i === currentStepIndex;
                        return (
                          <div key={step} className="flex flex-col items-center">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-all ${isCompleted
                                  ? "text-white border-white shadow-xs"
                                  : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700"
                                }`}
                              style={isCompleted ? { backgroundColor: primaryColor } : {}}
                            >
                              {isCompleted ? <Check size={10} strokeWidth={3} /> : i + 1}
                            </div>
                            <span
                              className={`text-[8.5px] font-semibold mt-1 tracking-tight capitalize ${isCurrent
                                  ? "text-slate-900 dark:text-white font-bold"
                                  : "text-slate-400 dark:text-slate-500"
                                }`}
                            >
                              {STATUS_CONFIG[step]?.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Detailed Information Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Priority */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Priority Level
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: priorityInfo.color }} />
                      <span className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px]">
                        {ticket.priority}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Agent */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Assigned Agent
                    </span>
                    <div className="flex items-center gap-1.5 truncate">
                      <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate">
                        {ticket.agent?.name || "Support Specialist"}
                      </span>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Opened On
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                      <Calendar size={12} className="text-slate-400 shrink-0" />
                      <span>{new Date(ticket.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>

                  {/* Latest Activity */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Latest Activity
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                      <Clock size={12} className="text-slate-400 shrink-0" />
                      <span>
                        {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Customer CRN (if present) */}
                  {ticket.crn && (
                    <div className="col-span-2 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                        Customer Record Number (CRN)
                      </span>
                      <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                        {ticket.crn}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Bottom Info Banner (Stretches Left Column evenly) */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-emerald-50/60 dark:bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-200/50 dark:border-emerald-500/20 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[10.5px]">
                  <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="leading-snug">
                    <strong>Real-time 2-Way Sync:</strong> Any message you send here syncs directly with our support team room.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Equal Height Communication & Activity Hub */}
            <div className="lg:col-span-7 h-full flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
              {/* Hub Top Bar */}
              <div className="shrink-0 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} style={{ color: primaryColor }} />
                  <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Communication &amp; Activity Log
                  </h2>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {ticket.notes?.length || 0} interaction{(ticket.notes?.length || 0) === 1 ? "" : "s"}
                </span>
              </div>

              {/* Message Feed - Flex-1 takes ALL remaining space & scrolls internally */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20 dark:bg-slate-950/20 min-h-0">
                {(!ticket.notes || ticket.notes.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <MessageSquare size={24} className="text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      No public notes recorded yet.
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      Send a message below to provide extra details or inquire about status.
                    </p>
                  </div>
                ) : (
                  ticket.notes.map((note, idx) => {
                    const isCustomer =
                      note.authorName?.toLowerCase().includes("customer") ||
                      note.authorName?.toLowerCase().includes("you") ||
                      (senderName && note.authorName === senderName);

                    return (
                      <div
                        key={idx}
                        className={`flex gap-2.5 items-start ${isCustomer ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white shadow-2xs ${isCustomer ? "bg-emerald-600" : "bg-indigo-600"
                            }`}
                          style={!isCustomer ? { backgroundColor: primaryColor } : {}}
                          title={note.authorName || (isCustomer ? "Customer" : "Support Specialist")}
                        >
                          {isCustomer ? <User size={13} /> : <ShieldCheck size={14} />}
                        </div>

                        {/* Bubble */}
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 border shadow-2xs ${isCustomer
                              ? "bg-emerald-500/10 text-slate-900 dark:text-white border-emerald-500/25 rounded-tr-xs"
                              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700/80 rounded-tl-xs"
                            }`}
                        >
                          <div className={`flex items-center gap-2 mb-1 text-[9.5px] ${isCustomer ? "justify-end" : "justify-between"}`}>
                            <span
                              className={`font-bold uppercase tracking-wider ${isCustomer
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-indigo-600 dark:text-indigo-400"
                                }`}
                            >
                              {note.authorName || (isCustomer ? "You (Customer)" : "Support Specialist")}
                            </span>
                            <span className="text-slate-400 text-[9px]">
                              {new Date(note.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                            {note.content}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={notesEndRef} />
              </div>

              {/* Bottom Fixed Reply Form */}
              <div className="shrink-0 p-3 sm:p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <form onSubmit={handleSendReply} className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Compact Name Field */}
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full sm:w-36 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors shrink-0"
                    />

                    {/* Message Text Input with Enter to Send */}
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Type your message or inquiry here... (Press Enter to send)"
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    {/* Send Action Button */}
                    <button
                      type="submit"
                      disabled={sending || !replyMessage.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-95 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {sending ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send size={12} />
                          <span>Send Message</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Inline Status Alerts */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
                    <div>
                      {sendSuccess && (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium animate-in fade-in">
                          <CheckCircle2 size={11} className="shrink-0" />
                          Message delivered to support agent!
                        </span>
                      )}
                      {sendError && (
                        <span className="text-red-600 dark:text-red-400 flex items-center gap-1 font-medium animate-in fade-in">
                          <AlertCircle size={11} className="shrink-0" />
                          {sendError}
                        </span>
                      )}
                      {!sendSuccess && !sendError && (
                        <span>Press Enter to send reply</span>
                      )}
                    </div>
                    <span className="hidden sm:inline">Protected by End-to-End Audit Log</span>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
