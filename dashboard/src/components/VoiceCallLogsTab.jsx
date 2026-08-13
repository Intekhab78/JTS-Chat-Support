import { useState, useEffect } from "react";
import {
  PhoneCall, PhoneIncoming, PhoneOutgoing, Mic, Ticket,
  Play, Sparkles, CheckCircle2, RefreshCw, Clock, MessageSquare
} from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

export default function VoiceCallLogsTab({ websiteId }) {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [aiSpokenResponse, setAiSpokenResponse] = useState("");
  const [testTranscript, setTestTranscript] = useState(
    "Hello, I am calling regarding my PRO Express Visa Application for Dubai. Has the visa stamping completed?"
  );

  useEffect(() => {
    loadCallLogs();
  }, [websiteId]);

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
          callerPhone: "+971-50-8492019",
          transcriptText: testTranscript
        })
      });

      if (res?.voiceResponse) {
        setAiSpokenResponse(res.voiceResponse);
      }
      toast.success("AI Call Handled! Support Ticket Auto-Created.");
      loadCallLogs();
    } catch (err) {
      toast.error("Failed to simulate call: " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              24/7 AI TELEPHONE VOICE AGENT ACTIVE
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Voice Calls & Auto-Created Support Tickets</h3>
          <p className="text-xs font-bold text-slate-400">Incoming calls are answered by AI, synthesized into spoken audio, and logged into support tickets.</p>
        </div>

        <button
          onClick={loadCallLogs}
          className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all border border-slate-200"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Simulator Card */}
      <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-[32px] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic size={18} className="text-indigo-400" />
            <h4 className="text-sm font-black uppercase tracking-wider">Test Incoming Phone Call Simulator</h4>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Live AI Speech Processing</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={testTranscript}
            onChange={(e) => setTestTranscript(e.target.value)}
            className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-xs font-bold text-white placeholder-slate-400 outline-none focus:border-indigo-400"
            placeholder="Type caller statement..."
          />
          <button
            onClick={handleSimulateCall}
            disabled={simulating}
            className="px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            {simulating ? <RefreshCw size={16} className="animate-spin" /> : <PhoneIncoming size={16} />}
            Simulate AI Phone Call
          </button>
        </div>

        {aiSpokenResponse && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">🗣️ AI Voice Response Spoken to Caller:</p>
            <p className="text-xs font-bold leading-relaxed">"{aiSpokenResponse}"</p>
          </div>
        )}
      </div>

      {/* Call Logs Table */}
      <div className="bg-white rounded-[36px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Voice Call History Log ({logs.length})</h4>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-20 text-center text-xs font-black uppercase tracking-widest text-slate-300 animate-pulse">Loading Voice Call Records...</div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <PhoneCall className="mx-auto text-slate-200" size={40} />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">No telephone calls logged yet</p>
            </div>
          ) : (
            logs.map((call) => (
              <div key={call._id} className="p-6 hover:bg-slate-50/60 transition-colors space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                      <PhoneIncoming size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{call.callerPhone || "+971 Caller"}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {new Date(call.createdAt).toLocaleString()} | Duration: {call.duration || 45}s
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {call.ticketId ? (
                      <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 size={12} /> Auto Ticket: {call.ticketId.ticketId || "Created"}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-bold">No Ticket</span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Spoken Audio Transcript:</p>
                  <p className="text-xs font-bold text-slate-700 italic">"{call.transcript}"</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
