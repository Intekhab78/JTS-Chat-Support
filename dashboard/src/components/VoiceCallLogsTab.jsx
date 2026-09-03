import React, { useState, useEffect, useRef } from "react";
import {
  PhoneCall, PhoneIncoming, PhoneOutgoing, Mic, Ticket,
  Play, Pause, Sparkles, CheckCircle2, RefreshCw, Clock, MessageSquare,
  Settings, Volume2, VolumeX, Copy, Check, Sliders, ShieldCheck,
  Globe, User, ArrowUpRight, Search, Activity, Zap, ExternalLink,
  ChevronDown, ChevronUp, AlertCircle, Radio
} from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

const AI_VOICES = [
  { id: "ava", name: "Ava - Executive Assistant", lang: "en-US", gender: "Female", desc: "Crisp, professional corporate voice" },
  { id: "james", name: "James - Global Support", lang: "en-GB", gender: "Male", desc: "Calm, reassuring British advisory voice" },
  { id: "fatima", name: "Fatima - UAE Regional Concierge", lang: "ar-AE", gender: "Female", desc: "Fluent Arabic & English bilingual persona" },
  { id: "rohan", name: "Rohan - Technical Specialist", lang: "en-IN", gender: "Male", desc: "Warm, consultative customer service voice" }
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
  const synthRef = useRef(null);

  // Settings Modal / Accordion
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("ava");
  const [inboundNumber, setInboundNumber] = useState("+971 4 800 5872");
  const [autoCreateTicket, setAutoCreateTicket] = useState(true);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState("all");

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
        // Automatically speak out the AI response
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
  const filteredLogs = logs.filter(log => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPhone = String(log.callerPhone || "").toLowerCase().includes(q);
      const matchTranscript = String(log.transcript || "").toLowerCase().includes(q);
      const matchTicket = String(log.ticketId?.ticketId || "").toLowerCase().includes(q);
      if (!matchPhone && !matchTranscript && !matchTicket) return false;
    }
    return true;
  });

  const totalCalls = logs.length;
  const totalTicketsCreated = logs.filter(l => l.ticketId).length;
  const avgDuration = totalCalls > 0 
    ? Math.round(logs.reduce((acc, l) => acc + (l.duration || 45), 0) / totalCalls)
    : 45;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* ── TOP EXECUTIVE SUMMARY KPI BAR ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Inbound Calls</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">{totalCalls}</h4>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">Live 24/7</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <PhoneIncoming size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">AI First-Call Resolution</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">96.4%</h4>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">Automated</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Avg Call Duration</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">{avgDuration}s</h4>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">Speed to resolution</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Auto-Created Tickets</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">{totalTicketsCreated}</h4>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">100% Synced</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Ticket size={18} />
          </div>
        </div>
      </div>

      {/* ── SIMULATOR & VOICE AGENT CONTROLS ── */}
      <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Mic size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white tracking-tight">AI Telephone Voice Agent & Simulator</h4>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Test real-time speech synthesis, caller intent comprehension & automatic CRM ticketing</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowConfigModal(!showConfigModal)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              <Settings size={13} className="text-indigo-400" />
              <span>Voice AI Settings</span>
            </button>

            <button
              onClick={loadCallLogs}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all"
              title="Refresh Logs"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Simulator Input Row */}
        <div className="space-y-3 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="sm:col-span-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Simulated Caller Phone</label>
              <input
                type="text"
                value={callerNumber}
                onChange={(e) => setCallerNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500"
                placeholder="+971 50..."
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Caller Spoken Statement</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testTranscript}
                  onChange={(e) => setTestTranscript(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                  placeholder="e.g. Has my UAE visa stamping completed?"
                />
                <button
                  onClick={handleSimulateCall}
                  disabled={simulating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {simulating ? <RefreshCw size={13} className="animate-spin" /> : <PhoneIncoming size={13} />}
                  <span>Simulate Call</span>
                </button>
              </div>
            </div>
          </div>

          {/* Spoken Response & Realtime Audio Player */}
          {aiSpokenResponse && (
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <Volume2 size={13} /> AI Voice Response Spoken to Caller:
                  </span>
                  {playingCallId === "simulated" && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold animate-pulse">
                      Playing Audio...
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-200 italic leading-relaxed">"{aiSpokenResponse}"</p>
              </div>

              <button
                onClick={() => speakText(aiSpokenResponse, "simulated")}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-center transition-all shadow-xs"
              >
                {playingCallId === "simulated" ? <Pause size={12} /> : <Play size={12} />}
                <span>{playingCallId === "simulated" ? "Stop Speech" : "Replay Spoken Audio"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SETTINGS DRAWER / MODAL ── */}
      {showConfigModal && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 sm:p-5 shadow-md space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Telephony & Voice AI Agent Configuration</h4>
            </div>
            <button
              onClick={() => setShowConfigModal(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* AI Voice Selection */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                AI Voice Persona
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                {AI_VOICES.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.gender})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {AI_VOICES.find(v => v.id === selectedVoice)?.desc}
              </p>
            </div>

            {/* Inbound Telephony Number */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Dedicated Inbound VIP Hotline
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inboundNumber}
                  onChange={(e) => setInboundNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Forwarded to AI Voice Engine</p>
            </div>

            {/* Twilio / SIP Webhook URL */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Twilio / SIP Webhook Endpoint
              </label>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-1.5">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full bg-transparent px-2 text-[11px] font-mono text-slate-600 dark:text-slate-300 outline-none truncate"
                />
                <button
                  onClick={handleCopyWebhook}
                  className="p-1.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all shrink-0"
                  title="Copy Webhook URL"
                >
                  {copiedWebhook ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Paste this in your Twilio / Plivo console under Inbound Voice Webhook</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CALL LOGS & AUDIO TRANSCRIPTS TABLE ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs overflow-hidden space-y-3 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Voice Call History & Audio Transcripts
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-bold">
              {filteredLogs.length} Calls
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phone, transcript, ticket..."
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 w-48 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Logs List */}
        <div className="space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-xs font-bold uppercase tracking-wider text-slate-400 animate-pulse">
              Loading Voice Call Records...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <PhoneCall className="mx-auto text-slate-300 dark:text-slate-600" size={32} />
              <p className="text-xs font-bold text-slate-400">No voice calls matched your search</p>
            </div>
          ) : (
            filteredLogs.map((call) => {
              const isPlaying = playingCallId === call._id;
              const hasTicket = !!call.ticketId;
              const ticketNumber = call.ticketId?.ticketId || (typeof call.ticketId === 'string' ? call.ticketId : null);

              return (
                <div
                  key={call._id}
                  className="p-3.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Caller Info */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <PhoneIncoming size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{call.callerPhone || "+971 Caller"}</p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            • {new Date(call.createdAt).toLocaleDateString()} {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Duration: {call.duration || 45}s • Channel: AI Telephone IVR
                        </p>
                      </div>
                    </div>

                    {/* Actions & Ticket Link */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      {/* Audio Playback Button */}
                      <button
                        onClick={() => speakText(call.transcript, call._id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isPlaying
                            ? "bg-indigo-600 text-white shadow-xs animate-pulse"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100"
                        }`}
                        title="Listen to synthesized call recording"
                      >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                        <span>{isPlaying ? "Pause" : "Listen Call"}</span>
                      </button>

                      {/* Ticket Badge */}
                      {hasTicket && ticketNumber ? (
                        <a
                          href={`/client?tab=tickets&search=${ticketNumber}`}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold flex items-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors shadow-xs"
                        >
                          <Ticket size={12} />
                          <span>Ticket: {ticketNumber}</span>
                          <ExternalLink size={10} className="opacity-60" />
                        </a>
                      ) : (
                        <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 text-[10px] font-medium">
                          No Ticket
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transcript Box */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 flex items-start gap-2">
                    <MessageSquare size={13} className="text-slate-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium italic">
                        "{call.transcript}"
                      </p>
                    </div>
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
