import { useEffect, useRef, useState } from "react";
import { api, API_BASE } from "../api/client.js";
import { Paperclip, FileText, Check, CheckCheck, Send, Ticket, PlusCircle, UserPlus } from "lucide-react";
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

export default function ChatPanel({ session, messages, onSend, onTyping, isTyping, disabled, onConvertToTicket, onConvertToLead, onIntelClick, canUseShortcuts = true }) {
  const toast = useToast();
  const [draft, setDraft] = useState("");
  const viewportRef = useRef(null);
  const fileInputRef = useRef(null);
  const [shortcuts, setShortcuts] = useState([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shortcutQuery, setShortcutQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!disabled && canUseShortcuts) {
      api("/api/canned-responses").then(setShortcuts).catch((error) => {
        console.error("Failed to load canned responses:", error);
      });
    }
  }, [disabled, canUseShortcuts]);

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
        onSend({ text: resolvedShortcut.content });
        setDraft("");
        setShowShortcuts(false);
        setShortcutQuery("");
        return;
      }
    }

    onSend({ text: value });
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
      const res = await fetch(`${API_BASE}/api/chat/upload`, {
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
    onSend({ text: content });
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

  const visitor = session.visitorId;
  const visitorName = cleanString(visitor?.name) || cleanString(visitor?.visitorId, "Anonymous User");
  const avatarColor = getAvatarColor(visitorName);

  const getRelativeStatus = () => {
    if (visitor?.isOnline) return "Active Now";
    if (!visitor?.lastVisitTime) return "Away";
    const diff = Math.floor((new Date() - new Date(visitor.lastVisitTime)) / 60000);
    if (diff < 1) return "Last active: Just now";
    if (diff < 60) return `Last active: ${diff}m ago`;
    return `Last active: ${Math.floor(diff / 60)}h ago`;
  };

  return (
    <section className="bg-white dark:bg-slate-900/90 flex flex-col h-[700px] rounded-3xl border border-slate-100 dark:border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden relative animate-in fade-in slide-in-from-bottom-2 duration-500 transition-colors duration-500">

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
                {session.firstPage ? (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                      First page: {session.firstPage}
                    </span>
                  </>
                ) : null}
              </div>

              {/* ── Bot Journey Path ── */}
              {session.botMetadata?.path?.length > 0 && (
                <div className="flex items-center gap-2 mt-2 py-1.5 px-3 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100/50 dark:border-indigo-500/10 w-fit">
                  <span className="text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest leading-none">Bot Journey:</span>
                  <div className="flex items-center gap-1">
                    {session.botMetadata.path.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{step}</span>
                        {idx < session.botMetadata.path.length - 1 && (
                          <span className="text-slate-300 dark:text-slate-700">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="hidden 2xl:flex items-center gap-4 p-3 bg-slate-50/70 dark:bg-white/5 border border-slate-100/50 dark:border-white/5 rounded-2xl shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">IP Tracking</span>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono tracking-tighter">{visitor?.ipAddress || "0.0.0.0"}</span>
            </div>
            <div className="w-px h-6 bg-slate-200/50 dark:bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">System</span>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{visitor?.os || "Unknown"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0 w-full sm:w-auto">
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
            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border ${session.status === "queued"
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20"
              : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
              }`}>
              {session.status}
            </span>
          </div>
        </div>
      </div>

      {/* ── Messages Zone ── */}
      <div
        ref={viewportRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]"
      >
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
      </div>

      {/* ── Input Zone ── */}
      {!disabled && (
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 relative shadow-[0_-10px_30px_rgba(0,0,0,0.02)] transition-colors">
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
                    onClick={() => handleShortcutClick(s.content)}
                    className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl group transition-all"
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest leading-none">/{s.shortcut}</span>
                      <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600 transition-colors uppercase tracking-widest leading-none">Shortcut</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{s.content}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="relative group">
              <textarea
                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-slate-50 dark:border-white/5 rounded-3xl px-6 py-4 text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500/50 outline-none transition-all resize-none shadow-inner min-h-[80px] dark:text-white"
                placeholder={
                  disabled
                    ? "Session is read-only..."
                    : canUseShortcuts
                      ? "Type your message or '/' for shortcuts..."
                      : "Type your message..."
                }
                disabled={disabled || isUploading}
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
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/10 rounded-2xl transition-all"
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>
                <button
                  type="submit"
                  disabled={disabled || (!draft.trim() && !isUploading)}
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
    </section>
  );
}
