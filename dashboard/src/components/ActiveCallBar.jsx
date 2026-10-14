import React, { useState, useEffect } from "react";
import { PhoneOff, Mic, MicOff, Pause, Play, Volume2, Shield, PhoneForwarded } from "lucide-react";

export default function ActiveCallBar({ callData, onEndCall, onToggleMute, onToggleHold, onOpenTransfer, isMuted, isHeld }) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!callData) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[140] w-full max-w-2xl px-4 animate-slide-down">
      <div className="bg-slate-900/95 text-white border border-white/10 rounded-2xl shadow-2xl p-3 sm:px-5 sm:py-3.5 backdrop-blur-md flex items-center justify-between gap-3">
        
        {/* Left: Caller Info & Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-emerald-500/30">
              {callData.visitorName?.[0]?.toUpperCase() || "V"}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold truncate">{callData.visitorName || "Website Visitor"}</h4>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                {isHeld ? "On Hold" : "Live Audio"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono font-bold flex items-center gap-1.5 mt-0.5">
              <span>⏱️ {formatDuration(duration)}</span>
              <span>•</span>
              <span className="text-indigo-300 truncate">{callData.telemetry?.city || "Visitor"}</span>
            </p>
          </div>
        </div>

        {/* Center/Right: Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Mute Button */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
              isMuted
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
            }`}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
            <span className="hidden sm:inline text-[11px]">{isMuted ? "Muted" : "Mute"}</span>
          </button>

          {/* Hold Button */}
          <button
            type="button"
            onClick={onToggleHold}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
              isHeld
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
            }`}
            title={isHeld ? "Resume Call" : "Put on Hold"}
          >
            {isHeld ? <Play size={15} /> : <Pause size={15} />}
            <span className="hidden sm:inline text-[11px]">{isHeld ? "Resume" : "Hold"}</span>
          </button>

          {/* Transfer Button */}
          {onOpenTransfer && (
            <button
              type="button"
              onClick={onOpenTransfer}
              className="p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30"
              title="Transfer call to senior agent"
            >
              <PhoneForwarded size={15} />
              <span className="hidden sm:inline text-[11px]">Transfer</span>
            </button>
          )}

          {/* End Call Button */}
          <button
            type="button"
            onClick={onEndCall}
            className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-rose-600/30 active:scale-95"
          >
            <PhoneOff size={15} />
            <span>End Call</span>
          </button>
        </div>

      </div>
    </div>
  );
}
