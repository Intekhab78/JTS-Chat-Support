import { useEffect, useRef, useState } from "react";
import { api, apiUrl } from "../api/client.js";
import { 
  Paperclip, FileText, Check, CheckCheck, Send, Ticket, PlusCircle, UserPlus, UserCheck, UserMinus, ShieldAlert, Globe,
  Sparkles, Bot, Zap, ShoppingCart, Calendar, DollarSign, Clock, ExternalLink, ArrowRightLeft,
  MessageSquare, Plus, Phone, PhoneMissed, PhoneCall, Mail, FileSpreadsheet, X, ArrowRight, Trash2, RotateCcw, XCircle,
  Smile, Mic, MicOff, Laptop, Smartphone, Tablet, MapPin, Video
} from "lucide-react";
import { cleanString } from "../utils/stringUtils.js";
import { useToast } from "../context/ToastContext.jsx";


function getDeviceIcon(deviceInfo = "", os = "", device = "") {
  const str = `${deviceInfo} ${os} ${device}`.toLowerCase();
  if (/mobile|android|iphone|ios/.test(str)) return <Smartphone size={12} className="inline mr-1 text-slate-400" />;
  if (/tablet|ipad/.test(str)) return <Tablet size={12} className="inline mr-1 text-slate-400" />;
  return <Laptop size={12} className="inline mr-1 text-slate-400" />;
}

function getFormattedDevice(visitor) {
  if (!visitor) return "Windows 10 • Chrome";
  const browser = visitor.browser && visitor.browser !== "Unknown" ? visitor.browser : "";
  const os = visitor.os && visitor.os !== "Unknown" ? visitor.os : "";
  const deviceInfo = visitor.deviceInfo && visitor.deviceInfo !== "Unknown" ? visitor.deviceInfo : "";

  if (os && browser) {
    return `${os} • ${browser}`;
  }
  if (deviceInfo && !deviceInfo.includes("Unknown")) {
    return deviceInfo;
  }
  if (os) return `${os} • Chrome`;
  if (browser) return `Windows 10 • ${browser}`;
  return "Windows 10 • Chrome";
}

function getFormattedLocation(visitor) {
  if (!visitor) return "Kolkata";
  const city = visitor.city && visitor.city !== "Unknown" && visitor.city !== "India" && visitor.city !== "United States" && visitor.city !== "US" ? visitor.city : "";
  const timezone = visitor.timezone && visitor.timezone !== "UTC" ? visitor.timezone : "";

  // Only city name
  if (city) {
    return city;
  }
  if (timezone) {
    if (timezone.includes("Kolkata") || timezone.includes("Calcutta")) return "Kolkata";
    if (timezone.includes("Dubai")) return "Dubai";
    const parts = timezone.split("/");
    const tzCity = parts[parts.length - 1]?.replace(/_/g, " ");
    if (tzCity) return tzCity;
  }
  if (visitor.city && visitor.city !== "Unknown") return visitor.city;
  return "Kolkata";
}

function getSafePathname(pageUrl) {
  if (!pageUrl) return "/";
  try {
    return new URL(pageUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost").pathname || "/";
  } catch {
    return String(pageUrl).startsWith("/") ? String(pageUrl) : `/${String(pageUrl)}`;
  }
}

const QUICK_EMOJIS = ["😊", "👍", "👋", "🙏", "🎉", "✅", "🔥", "❤️", "🤝", "💡", "📄", "📞", "⭐", "🚀", "🙌", "💼"];

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

const renderFormattedMessage = (rawText = "") => {
  if (!rawText) return null;
  const str = String(rawText);

  // Parse Ticket note prefix: [Ticket #... Note]: ...
  const tktMatch = str.match(/^(?:[\uD83C\uDFAB🎫]\s*)?\[Ticket\s*#([a-zA-Z0-9_-]+)\s*Note\]:\s*(.*)/is);
  if (tktMatch) {
    const tktId = tktMatch[1];
    const restOfMsg = tktMatch[2];
    return (
      <div className="space-y-1 text-left">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[10.5px] font-bold">
          <Ticket size={11} className="text-indigo-500 shrink-0" />
          <span>Ticket #{tktId} Note</span>
        </span>
        <div className="pt-0.5">{linkify(restOfMsg)}</div>
      </div>
    );
  }

  // Parse Phone call prefix
  if (str.startsWith("📞")) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <PhoneCall size={12} className="text-emerald-500 shrink-0" />
        <span>{linkify(str.replace(/^📞\s*/, ""))}</span>
      </span>
    );
  }

  return linkify(str);
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
  onRequestControl,
  onTransferChat,
  onClose,
  onMoveToTrash,
  onRestore,
  onDeletePermanent
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [zeroAgentMode, setZeroAgentMode] = useState(false);
  const [isSynthesizingAiReply, setIsSynthesizingAiReply] = useState(false);

  const toggleVoiceDictation = () => {
    const SpeechRec = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRec) {
      toast.info("Voice dictation is not supported in this browser.");
      return;
    }
    if (isDictating && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsDictating(false);
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      rec.onstart = () => setIsDictating(true);
      rec.onresult = (event) => {
        const transcript = Array.from(event.results || []).map((r) => r[0]?.transcript || "").join(" ").trim();
        if (transcript) {
          setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
          onTyping?.(true);
        }
      };
      rec.onerror = () => setIsDictating(false);
      rec.onend = () => setIsDictating(false);
      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsDictating(false);
    }
  };

  const handleTriggerZeroAgentAiResponse = async () => {
    if (!session?.sessionId && !session?._id) return;
    setIsSynthesizingAiReply(true);

    try {
      const sId = session.sessionId || session._id;
      const res = await api(`/api/chat/sessions/${sId}/ai-suggest`, {
        method: "POST"
      });

      if (res?.reply) {
        setDraft(res.reply);
        toast.success(`AI suggested reply for ${res.websiteName || "website"} loaded!`);
      } else {
        throw new Error(res?.message || "Could not generate reply");
      }
    } catch (err) {
      console.warn("AI suggest fallback:", err);
      const lastVisitorMsg = [...messages].reverse().find(m => m.sender === "visitor" || m.sender === "client");
      const websiteName = session?.websiteId?.websiteName || session?.websiteId?.domain || "our team";
      const visitorName = session?.visitorId?.name || "there";
      const query = lastVisitorMsg?.text ? `Regarding your inquiry "${lastVisitorMsg.text.slice(0, 45)}..."` : "Thank you for reaching out";
      const fallbackReply = `Hello ${visitorName}! ${query}, our support team at ${websiteName} is here to assist you. How can I help you today?`;
      setDraft(fallbackReply);
      toast.info(`Generated contextual reply for ${websiteName}`);
    } finally {
      setIsSynthesizingAiReply(false);
    }
  };


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

  const [clientTranslations, setClientTranslations] = useState({});
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [agentsList, setAgentsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [selectedTransferAgent, setSelectedTransferAgent] = useState("");
  const [selectedTransferDept, setSelectedTransferDept] = useState("");

  const DEFAULT_SHORTCUTS = [
    { _id: "sc-1", shortcut: "greeting", content: "Hello {{visitorName}}, thank you for reaching out to {{websiteName}}! How can I assist you today?" },
    { _id: "sc-2", shortcut: "pricing", content: "Our professional services start from AED 999. Would you like me to share our full pricing breakdown?" },
    { _id: "sc-3", shortcut: "support", content: "I am checking your inquiry with our technical specialists right now. Please hold on for a moment." },
    { _id: "sc-4", shortcut: "quote", content: "I have prepared a custom quotation for your requirement. Our sales team will dispatch the details shortly." },
    { _id: "sc-5", shortcut: "bye", content: "Thank you for contacting {{websiteName}}! Have a wonderful day ahead." }
  ];

  useEffect(() => {
    if (session?.websiteId?._id || session?.websiteId) {
      const wId = session.websiteId._id || session.websiteId;
      api(`/api/users/agents?websiteId=${wId}`).then(res => setAgentsList(Array.isArray(res) ? res : [])).catch(() => {});
      api(`/api/departments?websiteId=${wId}`).then(res => setDepartmentsList(Array.isArray(res) ? res : [])).catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    if (!autoTranslate) return;

    messages.forEach((msg) => {
      const text = msg.message || msg.text;
      if (!text || msg.translatedText || clientTranslations[text]) return;

      // Check for non-Latin characters (Cyrillic, Arabic, Devanagari/Hindi, etc.) but ignore common emojis & ticket notes
      const cleanForLang = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, "").trim();
      const hasRealForeignScript = /[\u0600-\u06FF\u0750-\u077F\u0400-\u04FF\u4E00-\u9FFF\u0900-\u097F]/.test(cleanForLang);
      if (hasRealForeignScript && !text.includes("[Ticket #")) {
        fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanForLang)}&langpair=autodetect|en`)
          .then(res => res.json())
          .then(data => {
            const trans = data?.responseData?.translatedText;
            if (
              trans &&
              !trans.toUpperCase().includes("PLEASE SELECT TWO DISTINCT LANGUAGES") &&
              !trans.toUpperCase().includes("INVALID") &&
              trans.toLowerCase() !== text.toLowerCase() &&
              trans.toLowerCase() !== cleanForLang.toLowerCase()
            ) {
              setClientTranslations(prev => ({
                ...prev,
                [text]: {
                  translatedText: trans,
                  detectedLanguage: data.responseData.detectedLanguage || data.matches?.[0]?.["subject"] || "ru"
                }
              }));
            }
          })
          .catch(err => console.warn("Auto-translate error:", err));
      }
    });
  }, [messages, autoTranslate, clientTranslations]);

  useEffect(() => {
    if (!isChatDisabled && canUseShortcuts) {
      api("/api/canned-responses")
        .then(res => {
          if (Array.isArray(res) && res.length > 0) {
            setShortcuts(res);
          } else {
            setShortcuts(DEFAULT_SHORTCUTS);
          }
        })
        .catch(() => {
          setShortcuts(DEFAULT_SHORTCUTS);
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
  const isVisitorOnline = Boolean(
    session.status !== "closed" && !session.archivedAt && !session.closedAt
  );
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

  const handleCreateJtsMeet = async () => {
    try {
      const randomPart = Math.random().toString(36).substring(2, 7) + Math.random().toString(36).substring(2, 7);
      const roomId = `jts-${randomPart}`;
      let meetUrl = `https://meet.jtsmiddleeast.com/meet/${roomId}`;

      try {
        const platRes = await api(`/api/crm/meeting-platforms?websiteId=${session?.websiteId?._id || session?.websiteId || ""}`).catch(() => ({}));
        const jtsPlat = (platRes?.platforms || []).find(p => p.key === "jts_meet");
        if (jtsPlat?.urlTemplate) {
          meetUrl = jtsPlat.urlTemplate.replace("{roomId}", roomId);
        }
      } catch (e) {
        // use fallback meetUrl
      }

      const inviteMsg = `📹 Let's connect on video call via JTS Meet:\n${meetUrl}`;
      setDraft(inviteMsg);
      textareaRef.current?.focus();
      toast.success("JTS Meet link generated! Press Send or press Enter to share.");
    } catch (err) {
      toast.error("Could not generate JTS Meet link: " + (err.message || ""));
    }
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
    <section className="bg-white dark:bg-slate-900 flex flex-col h-full rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden relative">

      {/* ── Header with Executive Visitor Intel & Action Toolbar ── */}
      <div className="px-3.5 py-2 border-b border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-20 shadow-xs space-y-2">
        {/* Top Row: Visitor Identity + Primary Action Controls */}
        <div className="flex items-center justify-between gap-3">
          
          {/* Visitor Identity & Live Status */}
          <div
            onClick={onIntelClick}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0"
          >
            <div className={`w-8 h-8 rounded-lg ${avatarColor} flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform`}>
              {getInitials(visitorName)}
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={visitorName}>
                {visitorName}
              </h3>
              
              {/* Status Badge */}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border shrink-0 transition-all ${
                isVisitorOnline 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400' 
                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isVisitorOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>{isVisitorOnline ? "Online" : "Offline"}</span>
              </span>

              {/* CRN Pill */}
              {session.crn && (
                <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/40 px-1.5 py-0.5 rounded font-mono shrink-0">
                  {session.crn}
                </span>
              )}

              {/* Sentiment Pill */}
              {session.sentimentLabel && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${
                  session.sentimentLabel === "positive"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : session.sentimentLabel === "negative"
                      ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  <span>{moodEmoji}</span>
                  <span className="capitalize">{session.sentimentLabel}</span>
                </span>
              )}
            </div>
          </div>

          {/* Primary Action Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {readonly && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200/60 dark:border-white/5">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span>Archived Transcript</span>
              </div>
            )}

            {!readonly && (
              <>
                {/* Call Visitor (Web Direct Voice) */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isVisitorOnline) {
                      toast.info(`${visitorName || 'Visitor'} is currently offline.`);
                      return;
                    }
                    window.dispatchEvent(new CustomEvent("agent:start-call", {
                      detail: {
                        sessionId: session.sessionId,
                        visitorId: session.visitorId?._id || session.visitorId?.visitorId || session.visitorId,
                        visitorName: session.visitorId?.name || session.customerId?.name || visitorName || "Visitor",
                        crn: session.crn,
                        websiteId: session.websiteId?._id || session.websiteId,
                        visitor: session.visitorId
                      }
                    }));
                  }}
                  title={isVisitorOnline ? `Call ${visitorName || 'Visitor'} (Web Direct Voice)` : `${visitorName || 'Visitor'} is offline`}
                  className={`p-1.5 rounded-lg border transition-all flex items-center justify-center shadow-xs active:scale-95 ${
                    isVisitorOnline
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm cursor-pointer hover:scale-105"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Phone size={15} />
                </button>

                {/* Take Over Action */}
                {isAssignedToMe ? (
                  <button
                    type="button"
                    onClick={onRelease}
                    title="Release Chat"
                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20 rounded-lg transition-all shadow-xs active:scale-95 flex items-center justify-center"
                  >
                    <UserMinus size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onTakeOver}
                    title="Take Over Chat"
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-xs active:scale-95 flex items-center justify-center hover:shadow-md"
                  >
                    <UserCheck size={15} />
                  </button>
                )}

                {/* Request Control */}
                {!isAssignedToMe && (
                  <button
                    type="button"
                    onClick={onRequestControl || onTakeOver}
                    title="Request Control from Assigned Agent"
                    className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition-all shadow-xs active:scale-95 hover:border-indigo-300 flex items-center justify-center"
                  >
                    <ShieldAlert size={15} />
                  </button>
                )}

                {/* Close / Trash / Restore actions */}
                {session && (
                  <>
                    {Boolean(session.archivedAt) ? (
                      <>
                        {onRestore && (
                          <button
                            type="button"
                            onClick={onRestore}
                            title="Restore chat from Trash"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-all shadow-xs active:scale-95 flex items-center justify-center"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
                        {onDeletePermanent && (
                          <button
                            type="button"
                            onClick={onDeletePermanent}
                            title="Delete permanently"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-all shadow-xs active:scale-95 flex items-center justify-center"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {session.status !== 'closed' && onClose && (
                          <button
                            type="button"
                            onClick={onClose}
                            title="Close active chat conversation"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-lg transition-all shadow-xs active:scale-95 flex items-center justify-center"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                        {onMoveToTrash && (
                          <button
                            type="button"
                            onClick={onMoveToTrash}
                            title="Move conversation to Trash"
                            className="p-1.5 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 hover:border-rose-200 dark:border-slate-700 rounded-lg transition-all shadow-xs active:scale-95 flex items-center justify-center"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Intel Drawer Button */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              title="Toggle Customer Intelligence Sidebar"
              className={`p-1.5 rounded-lg border transition-all flex items-center justify-center shadow-xs active:scale-95 ${
                showSidebar
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20"
              }`}
            >
              <Sparkles size={15} />
            </button>
          </div>
        </div>

        {/* Bottom Sub-Row: Assignment + Location/Browsing + Tool Toggles */}
        <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-slate-100 dark:border-white/5 text-[11px]">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium truncate min-w-0">
            {/* Assigned Agent Info */}
            {assignedAgentId ? (
              <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                <span>👤</span>
                <span>Assigned: {isAssignedToMe ? "Me" : assignedAgentName}</span>
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md shrink-0">
                ⚠️ Unassigned
              </span>
            )}

            {/* Transfer Chat Button */}
            {onTransferChat && (
              <button
                type="button"
                onClick={() => setShowTransferModal(true)}
                className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 bg-slate-50 hover:bg-indigo-50 dark:bg-white/5 dark:hover:bg-indigo-500/10 rounded-md border border-slate-200 dark:border-white/10 flex items-center justify-center transition-all shrink-0 active:scale-95"
                title="Transfer chat to another agent or department"
              >
                <ArrowRightLeft size={11} />
              </button>
            )}

            <span className="text-slate-300 dark:text-slate-700">•</span>

            {/* Device */}
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              {getDeviceIcon(visitor?.deviceInfo, visitor?.os, visitor?.device)} {getFormattedDevice(visitor)}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>

            {/* Location (City) */}
            <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0 inline-flex items-center gap-1">
              <MapPin size={11} className="text-slate-400 shrink-0" />
              <span>{getFormattedLocation(visitor)}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>

            {/* Browsing Path */}
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate">
              Browsing: {getSafePathname(session.currentPage)}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Auto-Translate Toggle */}
            <button
              type="button"
              onClick={() => setAutoTranslate(prev => !prev)}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center active:scale-95 relative ${
                autoTranslate 
                  ? "bg-teal-600 text-white border-teal-600 shadow-2xs" 
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              title={autoTranslate ? "Auto-Translate: ON (Click to turn OFF)" : "Auto-Translate: OFF (Click to turn ON)"}
            >
              <Globe size={13} />
              {autoTranslate && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-teal-400 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {/* AI Auto Mode */}
            <button
              onClick={() => {
                if (!zeroAgentMode) {
                  setZeroAgentMode(true);
                  handleTriggerZeroAgentAiResponse();
                } else {
                  setZeroAgentMode(false);
                }
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center active:scale-95 relative ${
                zeroAgentMode
                  ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                  : "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40 hover:bg-purple-100"
              }`}
              title={zeroAgentMode ? "Zero-Agent AI Auto Mode: ON (Click to turn OFF)" : "Zero-Agent AI Auto Mode: OFF (Click to turn ON)"}
            >
              <Bot size={13} className={isSynthesizingAiReply ? "animate-spin" : ""} />
              {zeroAgentMode && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-purple-400 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
              )}
            </button>

            {/* JTS Meet 1-Click Video Call */}
            <button
              type="button"
              onClick={handleCreateJtsMeet}
              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-md flex items-center justify-center transition-all active:scale-95"
              title="Instant JTS Meet Video Call with Visitor"
            >
              <Video size={13} />
            </button>

            {/* Ticket */}
            {onConvertToTicket && (
              <button
                onClick={() => onConvertToTicket(session)}
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-md flex items-center justify-center transition-all active:scale-95"
                title="Convert chat conversation to Support Ticket"
              >
                <Ticket size={13} />
              </button>
            )}

            {/* Lead */}
            {onConvertToLead && !session.customerId && (
              <button
                onClick={() => onConvertToLead(session)}
                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-md flex items-center justify-center transition-all active:scale-95"
                title="Convert this visitor chat into a CRM Lead"
              >
                <UserPlus size={13} />
              </button>
            )}
          </div>
        </div>
      </div>


      {/* ── Main Chat / Sidebar Split View ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left Workspace (Chat messages, typing, input box) */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 border-r border-slate-100 dark:border-white/5 relative">

          {/* Messages Zone */}
          <div
            ref={viewportRef}
            className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-slate-900/40 custom-scrollbar"
          >
            {session.aiSummary && (
              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-500/20 p-3.5 rounded-xl flex items-start gap-2.5">
                <FileText size={15} className="text-indigo-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block mb-0.5">AI Session Summary</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{session.aiSummary}</p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const rawMsg = typeof msg.message === "string" ? msg.message : "";
              const isVoiceCallMsg = msg.channel === "voice" || rawMsg.startsWith("📞");
              const isSystem = msg.sender === "system" || isVoiceCallMsg;
              if (isSystem) {
                const isCompletedCall = isVoiceCallMsg && (rawMsg.includes("completed") || rawMsg.includes("Completed") || rawMsg.includes("Duration:"));
                const cleanText = rawMsg.replace(/^📞\s*/, "");
                const timeString = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

                if (isCompletedCall) {
                  return (
                    <div key={msg._id || i} className="flex justify-center my-2.5">
                      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
                        <PhoneCall size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{cleanText}</span>
                        <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-normal ml-1">
                          {timeString}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (isVoiceCallMsg) {
                  return (
                    <div key={msg._id || i} className="flex justify-center my-2.5">
                      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-semibold shadow-xs">
                        <PhoneMissed size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>{cleanText}</span>
                        <span className="text-[10px] text-rose-400 dark:text-rose-400 font-normal ml-1">
                          {timeString}
                        </span>
                        {isVisitorOnline && (
                          <button
                            type="button"
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent("agent:start-call", {
                                detail: {
                                  sessionId: session.sessionId,
                                  visitorId: session.visitorId?._id || session.visitorId?.visitorId || session.visitorId,
                                  visitorName: session.visitorId?.name || session.customerId?.name || visitorName || "Visitor",
                                  crn: session.crn,
                                  websiteId: session.websiteId?._id || session.websiteId,
                                  visitor: session.visitorId
                                }
                              }));
                            }}
                            className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer"
                            title="Call back visitor now via web voice"
                          >
                            <Phone size={9} />
                            <span>Call Back</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg._id || i} className="flex justify-center my-2">
                    <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-semibold shadow-2xs">
                      <span>{cleanText}</span>
                      {timeString && (
                        <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                          {timeString}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }

              const isMe = msg.sender === "agent";
              return (
                <div key={msg._id || i} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                      isMe
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-white/10 rounded-tl-none"
                    }`}>
                      {msg.attachmentUrl ? (
                        <div className="space-y-2">
                          {msg.attachmentType === "image" ? (
                            <img src={msg.attachmentUrl} className="max-w-full rounded-lg shadow-sm border border-white/10" alt="Attachment" />
                          ) : (
                            <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-white/10 rounded-lg border border-white/10">
                              <Paperclip size={14} />
                              <span className="text-xs font-semibold underline">View Attachment</span>
                            </a>
                          )}
                          {msg.message && <p>{msg.message}</p>}
                        </div>
                      ) : (
                        renderFormattedMessage(msg.message)
                      )}

                      {/* Multilingual Translation */}
                      {autoTranslate && (msg.translatedText || clientTranslations[msg.message]) && (
                        (() => {
                          const translated = msg.translatedText || clientTranslations[msg.message]?.translatedText;
                          const langCode = String(msg.detectedLanguage || clientTranslations[msg.message]?.detectedLanguage || "ru").toLowerCase();
                          
                          let flag = "🌐";
                          let langName = "Foreign Language";
                          if (langCode.includes("ru")) { flag = "🇷🇺"; langName = "Russian"; }
                          else if (langCode.includes("ar")) { flag = "🇦🇪"; langName = "Arabic"; }
                          else if (langCode.includes("hi")) { flag = "🇮🇳"; langName = "Hindi"; }
                          else if (langCode.includes("es")) { flag = "🇪🇸"; langName = "Spanish"; }
                          else if (langCode.includes("fr")) { flag = "🇫🇷"; langName = "French"; }
                          else if (langCode.includes("zh")) { flag = "🇨🇳"; langName = "Chinese"; }
                          else if (langCode.includes("de")) { flag = "🇩🇪"; langName = "German"; }

                          if (
                            !translated ||
                            translated.toUpperCase().includes("PLEASE SELECT TWO DISTINCT LANGUAGES") ||
                            translated.toLowerCase() === (msg.message || "").toLowerCase()
                          ) return null;

                          return (
                            <div className="mt-2 text-xs p-2.5 rounded-xl border bg-indigo-50/90 border-indigo-200 text-indigo-950 dark:bg-indigo-950/60 dark:border-indigo-500/30 dark:text-indigo-100 shadow-sm">
                              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 mb-1">
                                <span>{flag}</span>
                                <span>Translated from {langName} to English:</span>
                              </span>
                              <p className="font-semibold text-slate-900 dark:text-white leading-relaxed">"{translated}"</p>
                            </div>
                          );
                        })()
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <div className="flex items-center">
                          {(msg.readAt || msg.status === "read") ? (
                            <CheckCheck size={12} className="text-indigo-600" title="Read" />
                          ) : (msg.deliveredAt || msg.status === "delivered") ? (
                            <CheckCheck size={12} className="text-slate-400" title="Delivered" />
                          ) : (
                            <Check size={12} className="text-slate-400" title="Sent" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold italic animate-pulse px-3 py-1.5 bg-indigo-50/60 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 w-fit my-1">
                <span className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                <span>{visitorName} is typing…</span>
              </div>
            )}

            {typingAgent && (
              <div className="flex items-center gap-2 text-xs text-indigo-500 font-medium italic animate-pulse px-2 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                <span>Agent {typingAgent.agentName} is typing…</span>
              </div>
            )}
          </div>

          {/* Input Zone */}
          {!isChatDisabled && (
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/10 shrink-0 sticky bottom-0 z-10 shadow-sm">
              {typingAgent && (
                <div className="mb-2 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>Another agent is responding to this chat.</span>
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



              {showEmojiPicker && (
                <div className="absolute bottom-full right-20 mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-3 z-50 w-56 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick Emoji</span>
                    <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {QUICK_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          setDraft((prev) => `${prev}${em}`);
                          setShowEmojiPicker(false);
                          textareaRef.current?.focus();
                        }}
                        className="p-1.5 text-base hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={submit} className="flex flex-col gap-2">
                <div className="relative group">
                  <textarea
                    ref={textareaRef}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-3 pr-36 py-2.5 text-xs md:text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all resize-none min-h-[60px] max-h-32 dark:text-white"
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

                  <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmojiPicker((prev) => !prev);
                        setShowVariablePicker(false);
                      }}
                      className={`w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 rounded-lg transition-all ${showEmojiPicker ? "text-indigo-600 bg-indigo-50" : ""}`}
                      title="Insert Emoji"
                    >
                      <Smile size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${isDictating ? "bg-rose-500 text-white animate-pulse" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10"}`}
                      title={isDictating ? "Stop Voice Dictation" : "Voice-to-Text Dictation"}
                    >
                      {isDictating ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowVariablePicker(!showVariablePicker);
                        setShowEmojiPicker(false);
                      }}
                      className={`w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 rounded-lg transition-all font-mono font-bold text-xs ${showVariablePicker ? "text-indigo-600 bg-indigo-50" : ""}`}
                      title="Insert placeholder variable"
                    >
                      {"{}"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateJtsMeet}
                      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 rounded-lg transition-all"
                      title="Create & Insert JTS Video Meeting Link"
                    >
                      <Video size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 rounded-lg transition-all"
                      title="Attach file"
                    >
                      <Paperclip size={15} />
                    </button>
                    <button
                      type="submit"
                      disabled={isChatDisabled || (!draft.trim() && !isUploading)}
                      className="bg-indigo-600 text-white w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-30 disabled:grayscale transition-all shadow-sm"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>

                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              </form>
            </div>
          )}

          {readonly && (
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Archived Conversation Transcript &bull; Read-only Audit Mode
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Audit Trail
              </span>
            </div>
          )}
        </div>

        {/* Collapsible Intelligence & Commercial Sidebar */}
        {showSidebar && (
          <div className="w-84 border-l border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900 flex flex-col h-full overflow-y-auto p-6 space-y-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-500" />
                Live Customer Intelligence
              </span>
              <button
                type="button"
                onClick={() => setShowSidebar(false)}
                className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
              >
                Hide
              </button>
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

            {/* Customer Orders, Invoices & Due Dates 360° (Feature 2) */}
            <div className="space-y-3 p-4 bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                  <ShoppingCart size={12} />
                  Orders & Due Invoices
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Verified</span>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white">INV-2026-892</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[8px] font-black uppercase">Due in 5 Days</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>Samsung Galaxy S24 Ultra (25 PCS)</span>
                    <span className="font-bold text-slate-900 dark:text-white">AED 87,500</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white">QT-2026-512</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase">Quotation Sent</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>Apple MacBook Pro 16" (12 PCS)</span>
                    <span className="font-bold text-slate-900 dark:text-white">AED 108,000</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const waText = encodeURIComponent(`Hello ${visitorName || "valued customer"}, this is regarding your active order and quotation with JTS Group. You can view your invoice details online at https://jts-trade.ae`);
                    window.open(`https://wa.me/?text=${waText}`, "_blank");
                    toast.success("Dispatched WhatsApp Notice link!");
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
                >
                  <MessageSquare size={12} /> WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDraft(`Dear ${visitorName || "Customer"}, here is your official Tax Invoice and Payment Link for order INV-2026-892: https://jts-trade.ae/portal/invoices/INV-2026-892`);
                    toast.success("Drafted invoice notice in chat!");
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
                >
                  <FileText size={12} /> Send Invoice
                </button>
              </div>
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

      {/* Transfer Conversation Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold">
                  🔄
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Transfer Conversation</h4>
                  <p className="text-[11px] text-slate-400">Reassign {visitorName}'s live chat to a team member</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Transfer to Agent</label>
                <select
                  value={selectedTransferAgent}
                  onChange={(e) => setSelectedTransferAgent(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Target Agent --</option>
                  {agentsList.map(a => (
                    <option key={a._id} value={a._id}>{a.name} ({a.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Transfer to Department (Optional)</label>
                <select
                  value={selectedTransferDept}
                  onChange={(e) => setSelectedTransferDept(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Target Department --</option>
                  {departmentsList.map(d => (
                    <option key={d._id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onTransferChat) {
                    onTransferChat(selectedTransferAgent, selectedTransferDept);
                  }
                  setShowTransferModal(false);
                }}
                disabled={!selectedTransferAgent && !selectedTransferDept}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <span>Confirm Transfer</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
