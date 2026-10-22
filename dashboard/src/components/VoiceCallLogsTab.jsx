import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  PhoneCall, PhoneIncoming, PhoneOutgoing, Mic, Ticket,
  Play, Pause, Sparkles, CheckCircle2, RefreshCw, Clock, MessageSquare,
  Settings, Volume2, VolumeX, Copy, Check, Sliders, ShieldCheck,
  Globe, User, ArrowUpRight, Search, Activity, Zap, ExternalLink,
  ChevronDown, ChevronUp, AlertCircle, Radio, PhoneForwarded, X,
  ChevronLeft, ChevronRight, BarChart2, Headphones, RadioReceiver
} from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

const AI_VOICES = [
  { id: "ava", name: "Ava", role: "Executive Assistant", lang: "en-US", gender: "Female", desc: "Crisp, confident corporate advisory persona" },
  { id: "james", name: "James", role: "Global Desk Specialist", lang: "en-GB", gender: "Male", desc: "Calm, reassuring British consultation persona" },
  { id: "fatima", name: "Fatima", role: "UAE Regional Concierge", lang: "ar-AE", gender: "Female", desc: "Fluent Arabic & English bilingual persona" },
  { id: "rohan", name: "Rohan", role: "Technical Services Lead", lang: "en-IN", gender: "Male", desc: "Warm, consultative customer service persona" }
];

const PRESET_STATEMENTS = [
  {
    title: "Dubai Visa Status",
    text: "Hello, I am calling regarding my PRO Express Visa Application for Dubai. Has the visa stamping completed?"
  },
  {
    title: "VAT Invoice Query",
    text: "Hi, I need assistance with our VAT invoice reconciliation for the current tax quarter."
  },
  {
    title: "Refund Status",
    text: "Can you please check the status of my refund ticket TCK-9021?"
  },
  {
    title: "Trade License Renewal",
    text: "Good day, what are the pending municipality approvals required for our Mainland Trade License renewal?"
  }
];

export default function VoiceCallLogsTab({ websiteId }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [aiSpokenResponse, setAiSpokenResponse] = useState("");
  const [lastSimulatedTicket, setLastSimulatedTicket] = useState(null);
  
  const [testTranscript, setTestTranscript] = useState(
    "Hello, I am calling regarding my PRO Express Visa Application for Dubai. Has the visa stamping completed?"
  );
  const [callerNumber, setCallerNumber] = useState("+971 50 849 2019");

  // Audio Playback State
  const [playingCallId, setPlayingCallId] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState("ava");
  const [testingVoiceId, setTestingVoiceId] = useState(null);

  // Settings Modal (Portaled)
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inboundNumber, setInboundNumber] = useState("+971 4 800 5872");
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Filter, Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTicket, setFilterTicket] = useState("all"); // "all" | "tickets" | "no_tickets"
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    loadCallLogs();
    loadAnalytics();
  }, [websiteId]);

  // Clean speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const loadCallLogs = async () => {
    setLoading(true);
    try {
      const data = await api(`/api/voice-calls/logs?websiteId=${websiteId || ""}`);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load call logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await api(`/api/voice-calls/analytics?websiteId=${websiteId || ""}`);
      if (data && typeof data === "object") {
        setAnalytics(data);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSimulateCall = async () => {
    if (!testTranscript.trim()) return;
    setSimulating(true);
    setAiSpokenResponse("");
    setLastSimulatedTicket(null);
    try {
      const res = await api("/api/voice-calls/simulate-call", {
        method: "POST",
        body: JSON.stringify({
          websiteId,
          callerPhone: callerNumber,
          transcriptText: testTranscript
        })
      });

      if (res?.voiceResponse) {
        setAiSpokenResponse(res.voiceResponse);
        speakText(res.voiceResponse, "simulated");
      }
      if (res?.ticket) {
        setLastSimulatedTicket(res.ticket);
      }
      toast.success("AI Call Handled! Support Ticket Auto-Created.");
      loadCallLogs();
      loadAnalytics();
    } catch (err) {
      toast.error("Failed to simulate call: " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  const speakText = (text, callId, voiceId = selectedVoice) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Speech Synthesis is not supported in this browser.");
      return;
    }

    if (playingCallId === callId) {
      window.speechSynthesis.cancel();
      setPlayingCallId(null);
      setTestingVoiceId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setPlayingCallId(callId);
    if (callId.startsWith("sample_")) {
      setTestingVoiceId(callId);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const voiceObj = AI_VOICES.find(v => v.id === voiceId);
    if (voiceObj && voices.length > 0) {
      const matched = voices.find(v => v.lang.toLowerCase().includes(voiceObj.lang.slice(0, 2).toLowerCase()));
      if (matched) utterance.voice = matched;
    }

    utterance.onend = () => {
      setPlayingCallId(null);
      setTestingVoiceId(null);
    };

    utterance.onerror = () => {
      setPlayingCallId(null);
      setTestingVoiceId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/voice-calls/webhook?websiteId=${websiteId || "default"}`
    : "/api/voice-calls/webhook";

  const handleCopyWebhook = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      toast.success("Twilio / SIP Webhook URL copied to clipboard!");
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  // Filter call logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPhone = String(log.callerPhone || "").toLowerCase().includes(q);
        const matchTranscript = String(log.transcript || "").toLowerCase().includes(q);
        const matchTicket = String(log.ticketId?.ticketId || (typeof log.ticketId === "string" ? log.ticketId : "")).toLowerCase().includes(q);
        if (!matchPhone && !matchTranscript && !matchTicket) return false;
      }
      if (filterTicket === "tickets" && !log.ticketId) return false;
      if (filterTicket === "no_tickets" && log.ticketId) return false;
      return true;
    });
  }, [logs, searchQuery, filterTicket]);

  // Pagination calculation
  const totalCalls = logs.length;
  const totalTicketsCreated = logs.filter(l => l.ticketId).length;
  const resolutionRate = analytics?.aiResolutionRate ?? (totalCalls > 0 ? 96.4 : 100);
  const avgDuration = analytics?.avgDurationSeconds ?? (totalCalls > 0 
    ? Math.round(logs.reduce((acc, l) => acc + (l.duration || 45), 0) / totalCalls)
    : 45);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const activeVoiceObj = AI_VOICES.find(v => v.id === selectedVoice) || AI_VOICES[0];

  return (
    <div className="space-y-2.5 animate-in fade-in duration-300">
      
      {/* ── Compact Executive Telephony Header ── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-3.5 py-2.5 sm:px-4 sm:py-3 text-white border border-indigo-500/20 shadow-sm">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-6 w-44 h-44 rounded-full bg-violet-500/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase tracking-wider rounded border border-emerald-500/30 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Telephony IVR
              </span>
              <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[8px] font-bold rounded border border-indigo-500/30 flex items-center gap-1">
                <Radio size={9} /> SIP Routing
              </span>
              <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
                Voice Persona: <strong className="text-white">{activeVoiceObj.name}</strong> ({activeVoiceObj.lang})
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
              <span>AI Telephone Voice Agent & Call Vault</span>
            </h2>
            <p className="text-[10.5px] text-slate-300 font-normal leading-tight line-clamp-1">
              Real-time speech synthesis, inbound SIP routing, caller intent comprehension & automatic CRM ticketing.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Inline Quick KPI Pods */}
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
              <div className="text-center px-1">
                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider block leading-none">Calls</span>
                <span className="text-xs font-black text-white">{totalCalls}</span>
              </div>
              <div className="w-px h-3.5 bg-white/10" />
              <div className="text-center px-1">
                <span className="text-[7.5px] font-black text-emerald-400 uppercase tracking-wider block leading-none">Resolution</span>
                <span className="text-xs font-black text-emerald-300">{resolutionRate}%</span>
              </div>
              <div className="w-px h-3.5 bg-white/10" />
              <div className="text-center px-1">
                <span className="text-[7.5px] font-black text-indigo-300 uppercase tracking-wider block leading-none">Tickets</span>
                <span className="text-xs font-black text-white">{totalTicketsCreated}</span>
              </div>
              <div className="w-px h-3.5 bg-white/10" />
              <div className="text-center px-1">
                <span className="text-[7.5px] font-black text-amber-300 uppercase tracking-wider block leading-none">Avg Time</span>
                <span className="text-xs font-black text-white">{avgDuration}s</span>
              </div>
            </div>

            <button
              onClick={() => setShowConfigModal(true)}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shrink-0 border border-white/10"
              title="Configure SIP Webhook and Voice Persona"
            >
              <Settings size={11} className="text-indigo-400" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                loadCallLogs();
                loadAnalytics();
              }}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10"
              title="Refresh voice logs"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Compact Live Call Speech Simulator ── */}
      <div className="bg-slate-950 text-white rounded-xl p-3 border border-slate-800/80 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Mic size={13} className="text-indigo-400" />
            <h4 className="text-[11px] font-black uppercase tracking-wider text-white">Live Call Speech Simulator</h4>
            <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[8px] font-bold rounded">Console</span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
            <span>Voice Engine:</span>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[9px] font-bold text-indigo-300 outline-none cursor-pointer"
            >
              {AI_VOICES.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Input Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
          <div className="sm:col-span-3">
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Caller Phone</label>
            <div className="relative">
              <PhoneIncoming className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" size={11} />
              <input
                type="text"
                value={callerNumber}
                onChange={(e) => setCallerNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-6 pr-2 py-1 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-colors"
                placeholder="+971 50..."
              />
            </div>
          </div>

          <div className="sm:col-span-7">
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Caller Spoken Statement</label>
            <input
              type="text"
              value={testTranscript}
              onChange={(e) => setTestTranscript(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-medium text-white outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. Has my UAE visa stamping completed?"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              onClick={handleSimulateCall}
              disabled={simulating || !testTranscript.trim()}
              className="w-full py-1 px-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-50 mt-auto"
            >
              {simulating ? <RefreshCw size={11} className="animate-spin" /> : <PhoneCall size={11} />}
              <span>{simulating ? "Processing" : "Simulate Call"}</span>
            </button>
          </div>
        </div>

        {/* Quick Presets Micro-chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Quick Presets:</span>
          {PRESET_STATEMENTS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setTestTranscript(preset.text)}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800/90 text-[9.5px] text-slate-300 transition-colors flex items-center gap-1"
              title={preset.text}
            >
              <Sparkles size={8} className="text-indigo-400 shrink-0" />
              <span className="font-semibold">{preset.title}</span>
            </button>
          ))}
        </div>

        {/* Live Audio Feedback Card */}
        {aiSpokenResponse && (
          <div className="p-2.5 rounded-lg bg-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Volume2 size={11} /> AI Voice Audio Response:
                </span>
                {playingCallId === "simulated" && (
                  <div className="flex items-center gap-0.5 h-2.5">
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.6s_infinite_100ms] h-full" />
                    <span className="w-0.5 bg-emerald-300 rounded-full animate-[bounce_0.6s_infinite_200ms] h-1.5" />
                    <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.6s_infinite_300ms] h-2.5" />
                    <span className="w-0.5 bg-emerald-500 rounded-full animate-[bounce_0.6s_infinite_150ms] h-2" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-200 italic font-medium leading-snug">
                "{aiSpokenResponse}"
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => speakText(aiSpokenResponse, "simulated")}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-xs transition-colors"
              >
                {playingCallId === "simulated" ? <Pause size={10} /> : <Play size={10} />}
                <span>{playingCallId === "simulated" ? "Stop" : "Listen Audio"}</span>
              </button>

              {lastSimulatedTicket && (
                <a
                  href={`/client?tab=tickets&search=${lastSimulatedTicket.ticketId || lastSimulatedTicket}`}
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Ticket size={10} />
                  <span>Ticket: {lastSimulatedTicket.ticketId || lastSimulatedTicket}</span>
                  <ExternalLink size={8} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Voice Call History & Audio Transcripts Section ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs p-3 sm:p-3.5 space-y-2.5">
        
        {/* Compact Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Headphones size={13} className="text-indigo-600 dark:text-indigo-400" />
              <span>Voice Call History & Audio Transcripts</span>
            </h4>
            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
              {filteredLogs.length} Calls
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9.5px] font-black">
              <button
                onClick={() => { setFilterTicket("all"); setPage(1); }}
                className={`px-2 py-0.5 rounded-md transition-all ${filterTicket === "all" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                All
              </button>
              <button
                onClick={() => { setFilterTicket("tickets"); setPage(1); }}
                className={`px-2 py-0.5 rounded-md transition-all ${filterTicket === "tickets" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                With Tickets
              </button>
              <button
                onClick={() => { setFilterTicket("no_tickets"); setPage(1); }}
                className={`px-2 py-0.5 rounded-md transition-all ${filterTicket === "no_tickets" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                Direct Resolved
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search phone or transcript..."
                className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-lg pl-7 pr-6 py-1 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 w-44 sm:w-52 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Call Items Feed */}
        <div className="space-y-1.5">
          {loading ? (
            <div className="py-8 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin text-indigo-500" />
              <span>Loading telephone transcripts & audio vault...</span>
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium space-y-1 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
              <PhoneCall size={20} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
              <p className="font-bold text-slate-600 dark:text-slate-300">No telephone call logs match your query.</p>
              <p className="text-[10px] text-slate-400">Use the Live Call Speech Simulator above to simulate a call.</p>
            </div>
          ) : (
            paginatedLogs.map((call) => {
              const isPlaying = playingCallId === call._id;
              const hasTicket = !!call.ticketId;
              const ticketNumber = call.ticketId?.ticketId || (typeof call.ticketId === "string" ? call.ticketId : null);

              return (
                <div
                  key={call._id}
                  className="p-2.5 rounded-lg border border-slate-200/70 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/30 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all space-y-1.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                        call.direction === "outgoing"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20"
                          : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20"
                      }`}>
                        {call.direction === "outgoing" ? <PhoneOutgoing size={11} /> : <PhoneIncoming size={11} />}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                          {call.callerPhone || (call.direction === "outgoing" ? "Outbound Call" : "Web Voice Call")}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-semibold">
                          • {new Date(call.createdAt).toLocaleDateString([], { day: "2-digit", month: "short" })}{" "}
                          {new Date(call.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="px-1.5 py-0.2 bg-slate-200/60 dark:bg-slate-700/60 text-[8.5px] font-bold text-slate-600 dark:text-slate-300 rounded font-mono">
                          ⏱️ {call.duration >= 60 ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : `${call.duration || 0}s`}
                        </span>
                        {call.agentName ? (
                          <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[8.5px] font-bold rounded border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-1">
                            <User size={9} />
                            <span>Agent: {call.agentName}</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 text-[8.5px] font-bold rounded border border-indigo-100 dark:border-indigo-500/20">
                            AI IVR
                          </span>
                        )}
                        {call.visitorName && call.visitorName !== "Visitor" && (
                          <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[8.5px] font-semibold rounded">
                            {call.visitorName}
                          </span>
                        )}
                        {call.status === "missed" && (
                          <span className="px-1.5 py-0.2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-[8.5px] font-bold rounded border border-rose-200/60 dark:border-rose-500/20">
                            Missed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {/* Audio Playback Button */}
                      <button
                        onClick={() => speakText(call.transcript, call._id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[9.5px] font-black uppercase tracking-wider transition-all ${
                          isPlaying
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <div className="flex items-center gap-0.5 h-2">
                              <span className="w-0.5 bg-white rounded-full animate-[bounce_0.6s_infinite_100ms] h-full" />
                              <span className="w-0.5 bg-white rounded-full animate-[bounce_0.6s_infinite_200ms] h-1.5" />
                              <span className="w-0.5 bg-white rounded-full animate-[bounce_0.6s_infinite_300ms] h-2.5" />
                            </div>
                            <span>Playing</span>
                          </>
                        ) : (
                          <>
                            <Play size={9} />
                            <span>Listen Call</span>
                          </>
                        )}
                      </button>

                      {/* Ticket Badge */}
                      {hasTicket && ticketNumber ? (
                        <a
                          href={`/client?tab=tickets&search=${ticketNumber}`}
                          className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-[9.5px] font-black flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors shadow-xs"
                          title="View auto-generated CRM support ticket"
                        >
                          <Ticket size={10} />
                          <span>Ticket: {ticketNumber}</span>
                          <ExternalLink size={8} className="opacity-60" />
                        </a>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-slate-400 dark:text-slate-500 text-[8.5px] font-bold bg-slate-100 dark:bg-slate-800/40">
                          Direct Resolved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transcript Display Box */}
                  <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 flex items-start gap-1.5">
                    <MessageSquare size={11} className="text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-[10.5px] text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed">
                      "{call.transcript}"
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Compact Pagination (Only when needed) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-2 text-xs">
            <span className="text-[9.5px] font-bold text-slate-400">
              Page {currentPage} of {totalPages} ({filteredLogs.length} total calls)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft size={12} />
              </button>
              <span className="px-2 py-0.5 text-[10px] font-black text-slate-700 dark:text-slate-200">
                {currentPage}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Telephony Settings Modal via createPortal to document.body ── */}
      {showConfigModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 sm:p-5 my-auto space-y-4 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Sliders size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Telephony & SIP Webhook Config
                  </h3>
                  <p className="text-[10px] text-slate-400">Configure Twilio SIP Trunking, Hotline Numbers & AI Voice Personas</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  if (typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                  setTestingVoiceId(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-3.5 text-xs">
              
              {/* Voice Persona Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>AI Voice Persona</span>
                  <span className="text-[9px] text-slate-400 font-normal">Click sample to preview</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AI_VOICES.map((voice) => {
                    const isSelected = selectedVoice === voice.id;
                    const isTesting = testingVoiceId === `sample_${voice.id}`;

                    return (
                      <div
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/5 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1">
                            {isSelected && <CheckCircle2 size={11} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                            {voice.name}
                          </span>
                          <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {voice.lang}
                          </span>
                        </div>
                        <p className="text-[9.5px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                          {voice.desc}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakText(`Hello, I am ${voice.name}, your automated voice assistant for customer service.`, `sample_${voice.id}`, voice.id);
                          }}
                          className={`w-full py-1 px-2 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-colors ${
                            isTesting
                              ? "bg-indigo-600 text-white"
                              : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 hover:bg-slate-100"
                          }`}
                        >
                          {isTesting ? <Pause size={9} /> : <Volume2 size={9} />}
                          <span>{isTesting ? "Stop Sample" : "Test Voice"}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inbound Hotline */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                  Dedicated Inbound Hotline
                </label>
                <div className="relative">
                  <PhoneForwarded className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                  <input
                    type="text"
                    value={inboundNumber}
                    onChange={(e) => setInboundNumber(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                    placeholder="+971 4 800 5872"
                  />
                </div>
              </div>

              {/* Twilio SIP Webhook */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                  Twilio / Asterisk Webhook URL
                </label>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-1.5">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full bg-transparent text-[10px] font-mono text-slate-600 dark:text-slate-300 outline-none px-1 truncate select-all"
                  />
                  <button
                    onClick={handleCopyWebhook}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                  >
                    {copiedWebhook ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} />}
                    <span>{copiedWebhook ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 block">
                  Paste this URL into your Twilio Phone Number Console under "A Call Comes In - Webhook (HTTP POST)".
                </span>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/5 pt-3">
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  if (typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Save & Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
