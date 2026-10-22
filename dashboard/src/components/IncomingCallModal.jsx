import React, { useEffect, useRef } from "react";
import { PhoneCall, PhoneOff, User, MapPin, Laptop, Bot, Sparkles, Volume2 } from "lucide-react";

export default function IncomingCallModal({ callData, onAccept, onDecline }) {
  const audioCtxRef = useRef(null);
  const ringIntervalRef = useRef(null);

  useEffect(() => {
    // Generate soft synthesizer ringtone using Web Audio API
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtxRef.current = new AudioContext();
        
        const tryResume = () => {
          if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
            audioCtxRef.current.resume().catch(() => {});
          }
        };

        tryResume();
        window.addEventListener("click", tryResume, { once: true });
        window.addEventListener("keydown", tryResume, { once: true });
        window.addEventListener("mousemove", tryResume, { once: true });
        window.addEventListener("focus", tryResume, { once: true });
        
        const playTone = () => {
          if (!audioCtxRef.current || audioCtxRef.current.state === "closed") return;
          if (audioCtxRef.current.state === "suspended") {
            audioCtxRef.current.resume().catch(() => {});
          }
          const now = audioCtxRef.current.currentTime;
          
          const osc1 = audioCtxRef.current.createOscillator();
          const osc2 = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();

          osc1.type = "sine";
          osc1.frequency.setValueAtTime(440, now); // A4
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(480, now); // B4

          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtxRef.current.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.2);
          osc2.stop(now + 1.2);
        };

        playTone();
        ringIntervalRef.current = setInterval(playTone, 2500);
      }
    } catch (e) {
      console.warn("Ringtone audio notice:", e);
    }

    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  if (!callData) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-zoom-in">
        
        {/* Header with pulsating calling animation */}
        <div className="p-6 bg-gradient-to-b from-indigo-500/10 to-transparent flex flex-col items-center text-center relative">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="absolute w-16 h-16 rounded-full bg-emerald-500/30 animate-pulse" />
            <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 relative z-10">
              <PhoneCall size={24} className="animate-bounce" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{callData.isTransferred ? `🔄 Transferred by ${callData.transferredBy || 'Agent'}` : "Incoming Live Voice Call"}</span>
          </div>

          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {(callData.visitorName && callData.visitorName !== "Website Visitor") ? callData.visitorName : (callData.telemetry?.city ? `Visitor (${callData.telemetry.city})` : "Visitor")}
          </h3>
          <p className="text-xs text-slate-500 font-semibold">{callData.callerPhone || "Web Audio Call"}</p>
        </div>

        {/* Caller Details & Context */}
        <div className="px-6 py-3 space-y-3">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-white/5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium truncate">
              <Laptop size={13} className="text-indigo-500 shrink-0" />
              <span className="truncate">{callData.telemetry?.os || "Web"} • {callData.telemetry?.browser || "Browser"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium truncate">
              <MapPin size={13} className="text-rose-500 shrink-0" />
              <span className="truncate">{callData.telemetry?.city || "Website Visitor"}</span>
            </div>
          </div>

          {/* Transfer Note / AI Summary */}
          {(callData.transferNote || callData.aiSummary) && (
            <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/40 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                <Bot size={12} />
                <span>{callData.isTransferred ? "Handover Note & Summary" : "AI Conversation Summary"}</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-3">
                {callData.transferNote ? `Note: "${callData.transferNote}"` : callData.aiSummary}
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-6 pt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 py-3.5 rounded-2xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 hover:border-rose-200 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
          >
            <PhoneOff size={16} />
            <span>Decline</span>
          </button>

          <button
            type="button"
            onClick={onAccept}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-600/30"
          >
            <PhoneCall size={16} className="animate-pulse" />
            <span>Accept Call</span>
          </button>
        </div>

      </div>
    </div>
  );
}
