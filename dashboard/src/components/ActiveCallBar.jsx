import React, { useState, useEffect, useRef } from "react";
import { PhoneOff, Mic, MicOff, Pause, Play, PhoneForwarded, GripVertical, Minimize2, Maximize2 } from "lucide-react";

export default function ActiveCallBar({ callData, onEndCall, onToggleMute, onToggleHold, onOpenTransfer, isMuted, isHeld }) {
  const [duration, setDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Draggable positioning state
  const [position, setPosition] = useState(() => {
    try {
      const saved = sessionStorage.getItem("active_call_bar_pos");
      if (saved) return JSON.parse(saved);
    } catch {}
    return null; // null means use default bottom-right positioning
  });

  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const barStartPosRef = useRef({ x: 0, y: 0 });
  const barRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const currentPosRef = useRef(position);
  useEffect(() => {
    currentPosRef.current = position;
  }, [position]);

  // Dragging Handlers
  const handleMouseDown = (e) => {
    // Only drag when clicking the drag handle or non-button areas
    if (e.target.closest("button")) return;
    
    isDraggingRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };

    const rect = barRef.current?.getBoundingClientRect();
    if (rect) {
      barStartPosRef.current = { x: rect.left, y: rect.top };
    }

    const onMouseMove = (moveEvt) => {
      if (!isDraggingRef.current) return;
      const deltaX = moveEvt.clientX - dragStartPosRef.current.x;
      const deltaY = moveEvt.clientY - dragStartPosRef.current.y;
      
      const newX = Math.max(12, Math.min(window.innerWidth - 320, barStartPosRef.current.x + deltaX));
      const newY = Math.max(12, Math.min(window.innerHeight - 70, barStartPosRef.current.y + deltaY));
      
      const newPos = { x: newX, y: newY };
      currentPosRef.current = newPos;
      setPosition(newPos);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      if (currentPosRef.current) {
        try {
          sessionStorage.setItem("active_call_bar_pos", JSON.stringify(currentPosRef.current));
        } catch {}
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  if (!callData) return null;

  const stylePosition = position
    ? { left: `${position.x}px`, top: `${position.y}px`, right: "auto", bottom: "auto" }
    : {};

  const displayName = (callData?.visitorName && callData.visitorName !== "Website Visitor")
    ? callData.visitorName
    : (callData?.telemetry?.city ? `Visitor (${callData.telemetry.city})` : "Visitor");

  const avatarInitial = displayName.replace(/^Visitor\s*#?/, "").trim()[0]?.toUpperCase() || displayName[0]?.toUpperCase() || "V";

  return (
    <div
      ref={barRef}
      onMouseDown={handleMouseDown}
      style={stylePosition}
      className={`fixed z-[160] transition-all duration-200 select-none ${
        !position ? "bottom-6 right-6" : ""
      }`}
    >
      {/* Minimized Pill View */}
      {isMinimized ? (
        <div className="flex items-center gap-2 bg-slate-900/95 backdrop-blur-xl border border-white/15 px-3 py-2 rounded-full shadow-2xl shadow-black/60 cursor-grab active:cursor-grabbing hover:border-emerald-500/40 transition-all">
          <GripVertical size={14} className="text-slate-500 hover:text-slate-300 shrink-0" />
          
          <div className="flex items-center gap-1.5" title={displayName}>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500" />
            <span className="text-xs font-mono font-bold text-emerald-400">{formatDuration(duration)}</span>
          </div>

          <div className="w-px h-4 bg-white/10" />

          {/* Quick Mute in minimized */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              isMuted ? "bg-rose-500 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={13} /> : <Mic size={13} />}
          </button>

          {/* Quick End Call */}
          <button
            type="button"
            onClick={onEndCall}
            className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all shadow-md shadow-rose-600/30 active:scale-95"
            title="End Call"
          >
            <PhoneOff size={13} />
          </button>

          {/* Expand */}
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all ml-0.5"
            title="Expand Call Controls"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      ) : (
        /* Full Clean Attractive Floating Call Bar */
        <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-2xl border border-white/15 p-2 sm:px-3 sm:py-2 rounded-full shadow-2xl shadow-black/70 cursor-grab active:cursor-grabbing hover:border-white/25 transition-all">
          
          {/* Drag Handle */}
          <div className="flex items-center text-slate-500 hover:text-slate-300 pl-1 cursor-grab" title="Drag to move anywhere">
            <GripVertical size={16} />
          </div>

          {/* Caller Avatar & Live Equalizer */}
          <div className="relative shrink-0 flex items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-emerald-500/30">
              {avatarInitial}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
          </div>

          {/* Caller Info & Duration */}
          <div className="min-w-0 pr-1 flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-white truncate max-w-[110px] sm:max-w-[150px]" title={displayName}>
                {displayName}
              </span>

              {/* Animated Live Voice Equalizer Bars */}
              {!isHeld ? (
                <div className="flex items-center gap-0.5 h-3 ml-0.5" title="Live Audio Streaming">
                  <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDuration: "0.6s" }} />
                  <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDuration: "0.45s", animationDelay: "0.15s" }} />
                  <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDuration: "0.7s", animationDelay: "0.3s" }} />
                </div>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded">
                  Hold
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono font-bold leading-none mt-0.5">
              {callData.status === "ringing" ? (
                <span className="text-amber-400 font-sans text-[10.5px] font-semibold animate-pulse">Ringing visitor...</span>
              ) : (
                <span className="text-emerald-400">{formatDuration(duration)}</span>
              )}
              {callData.telemetry?.city && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 font-sans text-[10px] font-medium truncate max-w-[70px]">
                    {callData.telemetry.city}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Vertical Separator */}
          <div className="w-px h-6 bg-white/10 shrink-0" />

          {/* Action Icon Buttons ONLY (No Bulky Text) */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* 1. Mute / Unmute Button */}
            <button
              type="button"
              onClick={onToggleMute}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isMuted
                  ? "bg-rose-500/25 text-rose-400 border border-rose-500/40 hover:bg-rose-500/35 ring-2 ring-rose-500/20 shadow-md shadow-rose-500/20"
                  : "bg-white/10 text-slate-200 hover:text-white hover:bg-white/20 border border-white/10"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* 2. Hold / Resume Button */}
            <button
              type="button"
              onClick={onToggleHold}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                isHeld
                  ? "bg-amber-500/25 text-amber-400 border border-amber-500/40 hover:bg-amber-500/35 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/20"
                  : "bg-white/10 text-slate-200 hover:text-white hover:bg-white/20 border border-white/10"
              }`}
              title={isHeld ? "Resume Call" : "Put Call on Hold"}
            >
              {isHeld ? <Play size={16} className="ml-0.5" /> : <Pause size={16} />}
            </button>

            {/* 3. Transfer Button */}
            {onOpenTransfer && (
              <button
                type="button"
                onClick={onOpenTransfer}
                className="w-9 h-9 rounded-full bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center transition-all active:scale-90"
                title="Transfer Call to Another Specialist"
              >
                <PhoneForwarded size={16} />
              </button>
            )}

            {/* 4. End Call Button (Clean Icon-Only Red Button) */}
            <button
              type="button"
              onClick={onEndCall}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white flex items-center justify-center transition-all shadow-lg shadow-rose-600/40 active:scale-90"
              title="End Live Voice Call"
            >
              <PhoneOff size={16} />
            </button>

            {/* Minimize Toggle */}
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all ml-0.5"
              title="Minimize"
            >
              <Minimize2 size={12} />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
