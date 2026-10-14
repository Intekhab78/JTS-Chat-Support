import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  PhoneCall, PhoneIncoming, PhoneOutgoing, Mic, Ticket,
  Play, Pause, Sparkles, CheckCircle2, RefreshCw, Clock, MessageSquare,
  Settings, Volume2, VolumeX, Copy, Check, Sliders, ShieldCheck,
  Globe, User, ArrowUpRight, Search, Activity, Zap, ExternalLink,
  ChevronDown, ChevronUp, AlertCircle, Radio, PhoneForwarded
} from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

const AI_VOICES = [
  { id: "ava", name: "Ava - Executive Assistant", lang: "en-US", gender: "Female", desc: "Crisp, professional corporate voice" },
  { id: "james", name: "James - Global Support", lang: "en-GB", gender: "Male", desc: "Calm, reassuring British advisory voice" },
  { id: "fatima", name: "Fatima - UAE Regional Concierge", lang: "ar-AE", gender: "Female", desc: "Fluent Arabic & English bilingual persona" },
  { id: "rohan", name: "Rohan - Technical Specialist", lang: "en-IN", gender: "Male", desc: "Warm, consultative customer service voice" }
];

const PRESET_STATEMENTS = [
  "Hello, I am calling regarding my PRO Express Visa Application for Dubai. Has the visa stamping completed?",
  "Hi, I need assistance with our VAT invoice reconciliation for the current tax quarter.",
  "Can you please check the status of my refund ticket TCK-9021?"
];

export default function VoiceCallLogsTab({ websiteId }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [aiSpokenResponse, setAiSpokenResponse] = useState("");
  const [testTranscript, setTestTranscript] = useState(
    "Hello, I am calling regarding my PRO Express Visa Application for Dubai. Has the visa stamping completed?"
  );
  const [callerNumber, setCallerNumber] = useState("+971 50 849 2019");
  
  // Audio Playback State
  const [playingCallId, setPlayingCallId] = useState(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Settings Modal / Accordion
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("ava");
  const [inboundNumber, setInboundNumber] = useState("+971 4 800 5872");
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTicket, setFilterTicket] = useState("all"); // "all" | "tickets" | "no_tickets"

  useEffect(() => {
    loadCallLogs();
  }, [websiteId]);

  // Clean speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
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

  const handleSimulateCall = async () => {
    if (!testTranscript.trim()) return;
    setSimulating(true);
    setAiSpokenResponse("");
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
      toast.success("AI Call Handled! Support Ticket Auto-Created.");
      loadCallLogs();
    } catch (err) {
      toast.error("Failed to simulate call: " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  const speakText = (text, callId) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Speech Synthesis not supported in this browser.");
      return;
    }

    if (playingCallId === callId) {
      window.speechSynthesis.cancel();
      setPlayingCallId(null);
      setPlaybackProgress(0);
      return;
    }

    window.speechSynthesis.cancel();
    setPlayingCallId(callId);
    setPlaybackProgress(10);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const voiceObj = AI_VOICES.find(v => v.id === selectedVoice);
    if (voiceObj && voices.length > 0) {
      const matched = voices.find(v => v.lang.includes(voiceObj.lang.slice(0, 2)));
      if (matched) utterance.voice = matched;
    }

    utterance.onend = () => {
      setPlayingCallId(null);
      setPlaybackProgress(100);
      setTimeout(() => setPlaybackProgress(0), 1000);
    };

    utterance.onerror = () => {
      setPlayingCallId(null);
      setPlaybackProgress(0);
    };

    window.speechSynthesis.speak(utterance);
  };

  const webhookUrl = `${window.location.origin}/api/voice-calls/webhook?websiteId=${websiteId || "default"}`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success("Twilio/SIP Webhook URL copied to clipboard!");
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // Filter call logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPhone = String(log.callerPhone || "").toLowerCase().includes(q);
        const matchTranscript = String(log.transcript || "").toLowerCase().includes(q);
        const matchTicket = String(log.ticketId?.ticketId || "").toLowerCase().includes(q);
        if (!matchPhone && !matchTranscript && !matchTicket) return false;
      }
      if (filterTicket === "tickets" && !log.ticketId) return false;
      if (filterTicket === "no_tickets" && log.ticketId) return false;
      return true;
    });
  }, [logs, searchQuery, filterTicket]);

  const totalCalls = logs.length;
  const totalTicketsCreated = logs.filter(l => l.ticketId).length;
  const avgDuration = totalCalls > 0 
    ? Math.round(logs.reduce((acc, l) => acc + (l.duration || 45), 0) / totalCalls)
    : 45;

  return (
    <div className="space-y-3.5 animate-in fade-in duration-500">
      
      {/* ── Compact Executive Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 px-4 py-3.5 sm:px-5 sm:py-4 text-white border border-indigo-500/20 shadow-md">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-60 h-60 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider rounded-md border border-emerald-500/30 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Telephony IVR
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              AI Telephone Voice Agent & Call Vault
            </h2>
            <p className="text-[11px] text-slate-300 font-medium leading-normal">
              Real-time speech synthesis, inbound SIP routing, caller intent comprehension & automatic CRM ticketing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Metrics */}
            <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-0.5">Calls</span>
                <span className="text-xs font-black text-white">{totalCalls}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block leading-none mb-0.5">Resolution</span>
                <span className="text-xs font-black text-emerald-300">96.4%</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block leading-none mb-0.5">Tickets</span>
                <span className="text-xs font-black text-white">{totalTicketsCreated}</span>
              </div>
            </div>

            <button
              onClick={() => setShowConfigModal(!showConfigModal)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shrink-0"
            >
              <Settings size={13} className="text-indigo-400" />
              <span>Settings</span>
            </button>

            <button
              onClick={loadCallLogs}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              title="Refresh voice logs"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Settings Drawer (Collapsible) ── */}
      {showConfigModal && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 shadow-xs space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sliders size={13} className="text-indigo-600" /> Telephony & SIP Webhook Config
            </h4>
            <button onClick={() => setShowConfigModal(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">AI Voice Persona</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                {AI_VOICES.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.gender})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Dedicated Inbound Hotline</label>
              <input
                type="text"
                value={inboundNumber}
                onChange={(e) => setInboundNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Twilio Webhook URL</label>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full bg-transparent text-[10px] font-mono text-slate-600 dark:text-slate-300 outline-none truncate"
                />
                <button onClick={handleCopyWebhook} className="p-1 text-indigo-600 hover:text-indigo-700">
                  {copiedWebhook ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Compact Live Simulator Box ── */}
      <div className="bg-slate-950 text-white rounded-2xl p-4 border border-slate-800/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic size={14} className="text-indigo-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Live Call Speech Simulator</h4>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Speech Synthesis & Intent Recognition Engine</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-1">
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Caller Phone</label>
            <input
              type="text"
              value={callerNumber}
              onChange={(e) => setCallerNumber(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-indigo-500"
              placeholder="+971 50..."
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Caller Spoken Statement</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testTranscript}
                onChange={(e) => setTestTranscript(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium text-white outline-none focus:border-indigo-500"
                placeholder="e.g. Has my UAE visa stamping completed?"
              />
              <button
                onClick={handleSimulateCall}
                disabled={simulating}
                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                {simulating ? <RefreshCw size={12} className="animate-spin" /> : <PhoneIncoming size={12} />}
                <span>Simulate Call</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[9px] font-black uppercase text-slate-500">Quick Presets:</span>
          {PRESET_STATEMENTS.map((p, i) => (
            <button
              key={i}
              onClick={() => setTestTranscript(p)}
              className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 truncate max-w-[260px]"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Spoken Audio Response */}
        {aiSpokenResponse && (
          <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Volume2 size={12} /> AI Voice Response Spoken to Caller:
              </span>
              <p className="text-xs text-slate-200 italic">"{aiSpokenResponse}"</p>
            </div>
            <button
              onClick={() => speakText(aiSpokenResponse, "simulated")}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 self-start sm:self-center"
            >
              {playingCallId === "simulated" ? <Pause size={11} /> : <Play size={11} />}
              <span>{playingCallId === "simulated" ? "Stop" : "Listen Audio"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Call History & Audio Transcripts Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4 sm:p-5 space-y-3">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Voice Call History & Audio Transcripts
            </h4>
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredLogs.length} Calls
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-black">
              <button
                onClick={() => setFilterTicket("all")}
                className={`px-2 py-0.5 rounded ${filterTicket === "all" ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500"}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterTicket("tickets")}
                className={`px-2 py-0.5 rounded ${filterTicket === "tickets" ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs" : "text-slate-500"}`}
              >
                With Tickets
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone or transcript..."
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl pl-7 pr-3 py-1 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Call Items Feed */}
        <div className="space-y-2">
          {loading ? (
            <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
              Loading voice call transcripts...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-bold">
              No voice calls found.
            </div>
          ) : (
            filteredLogs.map((call) => {
              const isPlaying = playingCallId === call._id;
              const hasTicket = !!call.ticketId;
              const ticketNumber = call.ticketId?.ticketId || (typeof call.ticketId === 'string' ? call.ticketId : null);

              return (
                <div
                  key={call._id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-indigo-50/30 transition-all space-y-1.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <PhoneIncoming size={13} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white">{call.callerPhone || "+971 Caller"}</span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            • {new Date(call.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })} {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">
                          ⏱️ Duration: {call.duration || 45}s • Channel: AI Telephone IVR
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Audio Button */}
                      <button
                        onClick={() => speakText(call.transcript, call._id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          isPlaying
                            ? "bg-indigo-600 text-white shadow-xs animate-pulse"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 hover:bg-slate-100"
                        }`}
                      >
                        {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                        <span>{isPlaying ? "Pause" : "Listen Call"}</span>
                      </button>

                      {/* Ticket Link */}
                      {hasTicket && ticketNumber ? (
                        <a
                          href={`/client?tab=tickets&search=${ticketNumber}`}
                          className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black flex items-center gap-1 hover:bg-emerald-100 transition-colors shadow-xs"
                        >
                          <Ticket size={11} />
                          <span>Ticket: {ticketNumber}</span>
                          <ExternalLink size={9} className="opacity-60" />
                        </a>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-slate-400 text-[9px] font-bold">
                          No Ticket
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transcript */}
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 flex items-start gap-2">
                    <MessageSquare size={12} className="text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed">
                      "{call.transcript}"
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
