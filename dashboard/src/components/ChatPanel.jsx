import { useEffect, useRef, useState } from "react";
import { api, apiUrl } from "../api/client.js";
import { Paperclip, FileText, Check, CheckCheck, Send, Ticket, PlusCircle, UserPlus, Sparkles } from "lucide-react";
import { cleanString } from "../utils/stringUtils.js";
import { useToast } from "../context/ToastContext.jsx";

function getDeviceIcon(deviceInfo = "") {
  if (/mobile|android|iphone/i.test(deviceInfo)) return "📱";
  if (/tablet|ipad/i.test(deviceInfo)) return "📟";
  return "💻";
}

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function getAvatarColor(name = "") {
  const colors = ["bg-indigo-500", "bg-violet-500", "bg-pink-500", "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-teal-500"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const linkify = (text = "") => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-indigo-400/50 hover:decoration-indigo-400 transition-all font-bold"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export default function ChatPanel({
  session,
  messages,
  onSend,
  onTyping,
  isTyping,
  disabled,
  readonly,
  onConvertToTicket,
  onConvertToLead,
  onIntelClick,
  canUseShortcuts = true,
  viewers = [],
  typingAgent = null,
  currentUser = null,
  onTakeOver,
  onRelease,
  onRequestControl
}) {
  const isChatDisabled = disabled || readonly;
  const toast = useToast();
  const [draft, setDraft] = useState("");
  const viewportRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const [shortcuts, setShortcuts] = useState([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shortcutQuery, setShortcutQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(true);

  // Enterprise additions
  const [localViewers, setLocalViewers] = useState([]);
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    setLocalViewers(viewers);
  }, [viewers]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalViewers(prev =>
        prev.map(v => ({
          ...v,
          viewingTimeSec: typeof v.viewingTimeSec === 'number' ? v.viewingTimeSec + 1 : 1
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isChatDisabled && canUseShortcuts) {
      api("/api/canned-responses").then(setShortcuts).catch((error) => {
        console.error("Failed to load canned responses:", error);
      });
    }
  }, [isChatDisabled, canUseShortcuts]);

  if (!session) {
    return (
      <section className="bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-20 text-center space-y-4 min-h-[500px] animate-in fade-in zoom-in duration-500 shadow-inner">
        <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-3xl shadow-sm grayscale opacity-50">💬</div>
        <div className="space-y-1">
          <h3 className="heading-md text-slate-400 dark:text-slate-500">No Session Selected</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-[0.2em]">Select a session from the queue to start.</p>
        </div>
      </section>
    );
  }

  const visitor = session.visitorId;
  const visitorName = cleanString(visitor?.name) || cleanString(visitor?.visitorId, "Anonymous User");
  const avatarColor = getAvatarColor(visitorName);
  const otherViewers = localViewers.filter(v => v._id !== currentUser?._id);

  // Session assigned status
  const assignedAgentId = session.assignedAgent?._id || session.assignedAgent;
  const assignedAgentName = session.assignedAgent?.name || "another agent";
  const isAssignedToMe = assignedAgentId && currentUser?._id && assignedAgentId.toString() === currentUser._id.toString();
  const isUnassigned = !assignedAgentId;

  const getVariableValue = (varName) => {
    switch (varName) {
      case "visitorName":
        return visitorName;
      case "agentName":
        return currentUser?.name || "Support";
      case "websiteName":
        return session.websiteId?.websiteName || "our support";
      case "ticketId":
        return session.crn || session._id || "";
      case "department":
        return session.department || "Support";
      case "companyName":
        return session.websiteId?.companyName || session.websiteId?.websiteName || "";
      case "customerEmail":
        return visitor?.email || "Not provided";
      case "customerPhone":
        return visitor?.phone || "Not provided";
      default:
        return "";
    }
  };

  const variables = [
    { tag: "visitorName", label: "Visitor Name", desc: getVariableValue("visitorName") },
    { tag: "agentName", label: "Agent Name", desc: getVariableValue("agentName") },
    { tag: "websiteName", label: "Website Name", desc: getVariableValue("websiteName") },
    { tag: "ticketId", label: "Ticket ID", desc: getVariableValue("ticketId") },
    { tag: "department", label: "Department", desc: getVariableValue("department") },
    { tag: "companyName", label: "Company Name", desc: getVariableValue("companyName") },
    { tag: "customerEmail", label: "Customer Email", desc: getVariableValue("customerEmail") },
    { tag: "customerPhone", label: "Customer Phone", desc: getVariableValue("customerPhone") }
  ];

  const interpolateText = (text = "") => {
    return text
      .replace(/\{\{visitorName\}\}/g, getVariableValue("visitorName"))
      .replace(/\{\{agentName\}\}/g, getVariableValue("agentName"))
      .replace(/\{\{websiteName\}\}/g, getVariableValue("websiteName"))
      .replace(/\{\{ticketId\}\}/g, getVariableValue("ticketId"))
      .replace(/\{\{department\}\}/g, getVariableValue("department"))
      .replace(/\{\{companyName\}\}/g, getVariableValue("companyName"))
      .replace(/\{\{customerEmail\}\}/g, getVariableValue("customerEmail"))
      .replace(/\{\{customerPhone\}\}/g, getVariableValue("customerPhone"));
  };

  const checkMissingVariables = () => {
    const matches = draft.match(/\{\{([a-zA-Z0-9]+)\}\}/g) || [];
    const missing = [];
    matches.forEach(m => {
      const varName = m.replace(/\{\{|\}\}/g, "");
      const val = getVariableValue(varName);
      if (!val || val === "Not provided") {
        missing.push(varName);
      }
    });
    return missing;
  };

  const getSentimentTrend = () => {
    const history = session.sentimentHistory || [];
    if (history.length < 2) return null;
    const current = history[history.length - 1].score;
    const previous = history[history.length - 2].score;
    if (current < previous) return "decreasing";
    if (current > previous) return "increasing";
    return "stable";
  };

  const insertVariable = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const placeholder = `{{${tag}}}`;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newValue = before + placeholder + after;
    setDraft(newValue);
    setShowVariablePicker(false);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
    }, 0);
  };

  function submit(event) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;

    if (canUseShortcuts && value.startsWith("/")) {
      const shortcutValue = value.slice(1).trim().toLowerCase();
      const exactShortcut = shortcuts.find(
        (shortcut) => shortcut.shortcut.toLowerCase() === shortcutValue
      );
      const singleFilteredShortcut =
        !exactShortcut && filteredShortcuts.length === 1 ? filteredShortcuts[0] : null;
      const resolvedShortcut = exactShortcut || singleFilteredShortcut;

      if (resolvedShortcut) {
        onSend({ text: interpolateText(resolvedShortcut.content) });
        setDraft("");
        setShowShortcuts(false);
        setShortcutQuery("");
        return;
      }
    }

    onSend({ text: interpolateText(value) });
    setDraft("");
    setShowShortcuts(false);
    setShortcutQuery("");
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("attachment", file);

    try {
      const token = localStorage.getItem("dashboard_token");
      const res = await fetch(await apiUrl("/api/chat/upload"), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Server returned non-JSON response");
      }
      if (!res.ok) throw new Error(data.message || "Upload failed");

      onSend({ text: draft || "Sent an attachment", attachmentUrl: data.url, attachmentType: data.attachmentType });
      setDraft("");
    } catch (err) {
      toast.error("Failed to upload file: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleShortcutClick = (content) => {
    onSend({ text: interpolateText(content) });
    setDraft("");
    setShowShortcuts(false);
    setShortcutQuery("");
  };

  const filteredShortcuts = shortcutQuery
    ? shortcuts.filter(s =>
      s.shortcut.toLowerCase().includes(shortcutQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(shortcutQuery.toLowerCase())
    )
    : shortcuts;

  const formatViewingTime = (sec) => {
    if (!sec || sec < 0) return "0s";
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}m`;
  };

  const getRelativeStatus = () => {
    if (visitor?.isOnline) return "Active Now";
    if (!visitor?.lastVisitTime) return "Away";
    const diff = Math.floor((new Date() - new Date(visitor.lastVisitTime)) / 60000);
    if (diff < 1) return "Last active: Just now";
    if (diff < 60) return `Last active: ${diff}m ago`;
    return `Last active: ${Math.floor(diff / 60)}h ago`;
  };

  // Local Intelligence Calculations
  const leadScore = Math.min(100, Math.max(10, (messages.length * 4) + (session.botMetadata?.path?.length || 0) * 10));
  const customerValue = leadScore > 75 ? "High Value (VIP)" : leadScore > 40 ? "Medium Value" : "Standard Value";
  const moodEmoji = {
    positive: "😊",
    satisfied: "🙂",
    neutral: "😐",
    concerned: "😟",
    frustrated: "😡"
  }[session.sentimentLabel] || "😐";
  const sentimentPercentage = Math.round(((session.sentimentScore || 0) + 1) * 50);

  const suggestions = [
    { label: "Greeting", text: `Hello ${visitorName}, thank you for reaching out! How can I assist you today?` },
    { label: "Acknowledge Issue", text: "I understand the issue you are facing, let me check that for you right now." },
    { label: "Request Details", text: "Could you please share your ticket/session details so I can check our logs?" },
    { label: "Close Session", text: `Is there anything else I can help you with today, ${visitorName}?` }
  ];

  const missingVars = checkMissingVariables();

  return (
    <section className={`bg-white dark:bg-slate-900/90 flex flex-col h-[700px] rounded-3xl border shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden relative animate-in fade-in slide-in-from-bottom-2 duration-500 transition-all duration-500 ${session.sentimentLabel === 'negative'
      ? 'border-rose-500/30 dark:border-rose-500/20 shadow-[0_0_30px_rgba(239,68,68,0.05)]'
      : 'border-slate-100 dark:border-white/5'
      }`}>

      {/* ── Header with Premium Visitor Intel ── */}
      <div className="px-5 md:px-8 py-4 md:py-5 border-b border-slate-50 dark:border-white/5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shrink-0 sticky top-0 z-10 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            onClick={onIntelClick}
            className="flex items-center gap-3 lg:gap-4 flex-[1_1_min(100%,400px)] lg:flex-1 cursor-pointer group hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-2xl transition-all"
          >
            <div className={`w-12 h-12 rounded-2xl ${avatarColor} flex items-center justify-center text-white font-black text-sm shadow-xl shadow-indigo-100 ring-4 ring-white dark:ring-slate-800 select-none group-hover:scale-105 transition-transform`}>
              {getInitials(visitorName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-black text-slate-900 dark:text-white truncate tracking-tight">{visitorName}</h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                  <span className={`w-1.5 h-1.5 rounded-full ${visitor?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'} shrink-0`} />
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{getRelativeStatus()}</span>
                </div>
                {session.sentimentLabel && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest shadow-sm transition-all ${session.sentimentLabel === "positive"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                    : session.sentimentLabel === "negative"
                      ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20 animate-pulse"
                      : "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-white/5"
                    }`} title={`Sentiment score: ${session.sentimentScore?.toFixed(2) || 0}`}>
                    <span>{moodEmoji}</span>
                    <span>{session.sentimentLabel}</span>
                  </div>
                )}

                {assignedAgentId ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-100 dark:border-indigo-500/20 text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    <span>👤</span>
                    <span>Assigned to: {isAssignedToMe ? "Me" : assignedAgentName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-100 dark:border-amber-500/20 text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    <span>⚠️</span>
                    <span>Unassigned</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                <span>{getDeviceIcon(visitor?.deviceInfo)} {visitor?.browser || "Unknown"}</span>
                <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                <span className="flex items-center gap-1.5">
                  <span className="grayscale">{visitor?.country === "IN" ? "🇮🇳" : "📍"}</span>
                  {visitor?.city || "Unknown"}, {visitor?.country || "Earth"}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                <span className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400 lowercase italic">
                  Browsing: {session.currentPage ? new URL(session.currentPage).pathname : "Landing Page"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0 w-full sm:w-auto">
            {/* Auto-Translate AI Toggle */}
            <button
              type="button"
              onClick={() => setAutoTranslate(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm ${
                autoTranslate 
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/20" 
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
              }`}
              title="Toggle Real-time Multilingual Auto-Translation"
            >
              <span>🌐</span>
              <span>{autoTranslate ? "Auto-Translate ON" : "Translate OFF"}</span>
            </button>

            {otherViewers.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100/50 dark:border-indigo-500/10 shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                </span>
                <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none">
                  Viewing: {otherViewers.map(v => `${v.name} (${v.role}, ${formatViewingTime(v.viewingTimeSec)})`).join(", ")}
                </span>
              </div>
            )}

            {/* Takeover/Release/Request control buttons */}
            {!isChatDisabled && session?.status !== "closed" && !session?.archivedAt && (
              <div className="flex items-center gap-1.5">
                {isAssignedToMe ? (
                  <button
                    onClick={onRelease}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 rounded-xl transition-all shadow-sm text-[9px] font-black uppercase tracking-widest"
                    title="Release Chat to Queue"
                  >
                    Release Chat
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onTakeOver}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl transition-all shadow-sm text-[9px] font-black uppercase tracking-widest"
                      title={isUnassigned ? "Accept Chat" : "Take over this chat session"}
                    >
                      Take Over
                    </button>
                    {!isUnassigned && (
                      <button
                        onClick={onRequestControl}
                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl transition-all shadow-sm text-[9px] font-black uppercase tracking-widest"
                        title="Request control of this chat session"
                      >
                        Request Control
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-3 border rounded-2xl flex items-center gap-2 transition-all shadow-sm group text-[10px] font-black uppercase tracking-widest ${showSidebar
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                }`}
              title="Toggle Intelligence Sidebar"
            >
              <Sparkles size={14} className="group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Intel</span>
            </button>

            {onConvertToLead && !session.customerId ? (
              <button
                onClick={() => onConvertToLead(session)}
                className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl flex items-center gap-2 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all shadow-sm group"
                title="Convert to CRM Lead"
              >
                <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Convert to Lead</span>
              </button>
            ) : null}
            {onConvertToTicket ? (
              <button
                onClick={() => onConvertToTicket(session)}
                className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm group"
                title="Convert to Ticket"
              >
                <Ticket size={18} className="group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Convert to Ticket</span>
              </button>
            ) : null}
            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border ${session.status === "queued"
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
              : session.status === "closed"
                ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-white/10"
                : visitor?.isOnline
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10"
              }`}>
              {session.status === "queued"
                ? "Queued"
                : session.status === "closed"
                  ? "Closed"
                  : visitor?.isOnline
                    ? "Active (Online)"
                    : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Chat/Sidebar Split View ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left Workspace (Chat messages, typing, input box) */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 border-r border-slate-50 dark:border-white/5 relative">

          {/* Messages Zone */}
          <div
            ref={viewportRef}
            className="flex-1 overflow-y-auto p-8 space-y-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]"
          >
            {session.aiSummary && (
              <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100/50 dark:border-indigo-500/10 p-5 rounded-2xl flex items-start gap-3.5 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white shadow-md shrink-0">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">AI Session Brief</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-bold leading-relaxed">{session.aiSummary}</p>
                </div>
              </div>
            )}

            {/* Sentiment Alerts & Trends */}
            {getSentimentTrend() === "decreasing" && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800/50 dark:text-amber-300 p-4 rounded-2xl flex items-center gap-3 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="text-lg">⚠️</span>
                <div className="flex-1">
                  <span className="text-[9px] font-black uppercase tracking-widest block mb-0.5">Sentiment Alert</span>
                  <p className="text-xs font-bold">Customer satisfaction is decreasing based on recent messages.</p>
                </div>
              </div>
            )}

            {session.sentimentScore < -0.6 && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-800/50 dark:text-rose-300 p-4 rounded-2xl flex items-center gap-3 mb-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="text-lg">🚨</span>
                <div className="flex-1">
                  <span className="text-[9px] font-black uppercase tracking-widest block mb-0.5">De-escalation Suggested</span>
                  <p className="text-xs font-bold">Critical Sentiment Threshold reached ({session.sentimentLabel}, {session.sentimentScore?.toFixed(2)}). Supervisor support or immediate override is highly recommended.</p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const isMe = msg.sender === "agent";
              return (
                <div key={msg._id || i} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                  <div className={`max-w-[80%] group flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`px-5 py-3.5 rounded-2xl text-sm font-medium shadow-sm transition-all hover:shadow-md ${isMe
                      ? "bg-slate-900 dark:bg-indigo-600 text-white rounded-tr-none"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-tl-none shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                      }`}>
                      {msg.attachmentUrl ? (
                        <div className="space-y-3">
                          {msg.attachmentType === "image" ? (
                            <img src={msg.attachmentUrl} className="max-w-full rounded-lg shadow-sm border border-white/10" alt="Attachment" />
                          ) : (
                            <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white/5 dark:bg-black/20 rounded-xl border border-white/10">
                              <Paperclip size={18} />
                              <span className="text-xs font-bold underline">View Attachment</span>
                            </a>
                          )}
                          {msg.message && <p className="opacity-90">{msg.message}</p>}
                        </div>
                      ) : (
                        linkify(msg.message)
                      )}

                      {/* Real-time Multilingual Translation Badge */}
                      {autoTranslate && msg.translatedText && msg.detectedLanguage && msg.detectedLanguage !== "en" && (
                        <div className="mt-2 text-[11px] font-bold p-2.5 rounded-xl border bg-indigo-50/70 border-indigo-100 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-500/20 dark:text-indigo-200">
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1">
                            <span>{msg.flagSymbol || "🌐"}</span>
                            <span>Auto-Translated from {msg.detectedLanguageName || msg.detectedLanguage}:</span>
                          </div>
                          <p className="leading-relaxed font-semibold">"{msg.translatedText}"</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest leading-none">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <div className="flex items-center gap-0.5">
                          {msg.readAt ? (
                            <CheckCheck size={10} className="text-indigo-500" />
                          ) : msg.deliveredAt ? (
                            <CheckCheck size={10} className="text-slate-300 dark:text-slate-600" />
                          ) : (
                            <Check size={10} className="text-slate-300 dark:text-slate-600" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 px-4 py-2 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {typingAgent && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-500/10 px-4 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                    Agent {typingAgent.agentName} is typing
                  </span>
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Zone */}
          {!isChatDisabled && (
            <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 relative shadow-[0_-10px_30px_rgba(0,0,0,0.02)] transition-colors shrink-0">
              {typingAgent && (
                <div className="mb-3 px-4 py-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl flex items-center gap-2 shadow-sm">
                  <span className="text-xs">⚠️</span>
                  <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                    Another agent is already responding to this customer.
                  </span>
                </div>
              )}

              {/* Missing variables validation alert */}
              {missingVars.length > 0 && (
                <div className="mb-3 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                  <span className="text-xs">⚠️</span>
                  <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                    Warning: The variables [ {missingVars.join(", ")} ] are empty or missing in this session.
                  </span>
                </div>
              )}

              {/* Live Preview */}
              {draft.includes("{{") && (
                <div className="mb-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner animate-in slide-in-from-bottom-2 duration-300">
                  <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Live Preview</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-bold whitespace-pre-wrap">{interpolateText(draft)}</p>
                </div>
              )}

              {showShortcuts && (
                <div className="absolute bottom-full left-6 right-6 mb-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 z-50">
                  <div className="p-4 bg-slate-50/50 dark:bg-black/10 border-b border-slate-50 dark:border-white/5">
                    <input
                      autoFocus
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white"
                      placeholder="Search canned replies (use / to trigger)..."
                      value={shortcutQuery}
                      onChange={(e) => setShortcutQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2">
                    {filteredShortcuts.map((s) => (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => handleShortcutClick(s.content)}
                        className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl group transition-all"
                      >
                        <div className="flex items-center gap-3 mb-1">
                          <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest leading-none">/{s.shortcut}</span>
                          <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600 transition-colors uppercase tracking-widest leading-none">Shortcut</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{interpolateText(s.content)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showVariablePicker && (
                <div className="absolute bottom-full right-6 mb-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 z-50 max-w-xs w-64">
                  <div className="p-4 bg-slate-50/50 dark:bg-black/10 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Insert Variable</span>
                    <button type="button" onClick={() => setShowVariablePicker(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2">
                    {variables.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => insertVariable(v.tag)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all flex flex-col"
                      >
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">{"{{"}{v.tag}{"}}"}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{v.label}</span>
                        {v.desc && <span className="text-[9px] text-slate-500 italic truncate max-w-full">Value: {v.desc}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={submit} className="flex flex-col gap-4">
                <div className="relative group">
                  <textarea
                    ref={textareaRef}
                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-slate-50 dark:border-white/5 rounded-3xl px-6 py-4 text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500/50 outline-none transition-all resize-none shadow-inner min-h-[80px] dark:text-white"
                    placeholder={
                      isChatDisabled
                        ? "Session is read-only..."
                        : canUseShortcuts
                          ? "Type your message or '/' for shortcuts..."
                          : "Type your message..."
                    }
                    disabled={isChatDisabled || isUploading}
                    value={draft}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraft(val);
                      onTyping(val.length > 0);
                      if (canUseShortcuts && val.startsWith("/") && !showShortcuts) {
                        setShowShortcuts(true);
                        setShortcutQuery(val.substring(1));
                      } else if (!canUseShortcuts || !val.startsWith("/")) {
                        setShowShortcuts(false);
                      } else if (showShortcuts) {
                        setShortcutQuery(val.substring(1));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submit(e);
                      }
                    }}
                  />

                  <div className="absolute right-4 bottom-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowVariablePicker(!showVariablePicker)}
                      className={`w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 rounded-2xl transition-all font-mono font-bold text-sm ${showVariablePicker ? "text-indigo-600 bg-indigo-50 dark:bg-white/10" : ""}`}
                      title="Insert placeholder variable"
                    >
                      {"{ }"}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 rounded-2xl transition-all"
                      title="Attach file"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button
                      type="submit"
                      disabled={isChatDisabled || (!draft.trim() && !isUploading)}
                      className="bg-slate-950 dark:bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-slate-200 dark:shadow-none"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>

                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              </form>
            </div>
          )}
        </div>

        {/* Collapsible Intelligence Sidebar */}
        {showSidebar && (
          <div className="w-80 border-l border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900 flex flex-col h-full overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-500" />
                Live AI Intelligence
              </span>
              <button
                type="button"
                onClick={() => setShowSidebar(false)}
                className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
              >
                Hide
              </button>
            </div>

            {/* Mood Meter */}
            <div className="space-y-2 p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Customer Mood Meter</span>
              <div className="flex items-center justify-between text-xs font-bold dark:text-white">
                <span>Mood: {moodEmoji} {session.sentimentLabel || "neutral"}</span>
                <span>{sentimentPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${session.sentimentLabel === "positive" || session.sentimentLabel === "satisfied"
                    ? "bg-emerald-500"
                    : session.sentimentLabel === "concerned" || session.sentimentLabel === "frustrated"
                      ? "bg-rose-500 animate-pulse"
                      : "bg-amber-500"
                    }`}
                  style={{ width: `${sentimentPercentage}%` }}
                />
              </div>
            </div>

            {/* Customer Value Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white dark:bg-slate-850 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Lead Score</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">{leadScore}/100</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-850 border border-slate-100 dark:border-white/5 rounded-2xl shadow-sm text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">LTV Assessment</span>
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 truncate block">{customerValue}</span>
              </div>
            </div>

            {/* Suggestions reply template list */}
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">AI Suggested Replies</span>
              <div className="flex flex-col gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDraft(s.text);
                      toast.success(`Loaded suggested template: ${s.label}`);
                    }}
                    className="w-full text-left p-3.5 bg-white dark:bg-slate-850 hover:bg-indigo-50/50 dark:hover:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl transition-all flex flex-col group"
                  >
                    <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em] block mb-1 group-hover:underline">{s.label}</span>
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-350 line-clamp-2 leading-relaxed">{s.text}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Past Activity Summary */}
            <div className="p-4 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-500/10 rounded-2xl">
              <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] block mb-2">Visitor Navigation Brief</span>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                Visited {session.botMetadata?.path?.length || 1} flow nodes.
                {session.botMetadata?.dropOffNode ? ` Last active node before stall: "${session.botMetadata.dropOffNode}".` : ""}
                {session.botMetadata?.conversions?.length > 0 ? " This customer achieved active conversions." : ""}
              </p>
            </div>

          </div>
        )}

      </div>

    </section>
  );
}
