import React, { useState, useEffect } from "react";
import { Activity, UserPlus, Ticket, MessageCircle, UserCheck, Globe, Clock, RefreshCw } from "lucide-react";
import { useSocket } from "../context/SocketContext.jsx";

const EVENT_CONFIG = {
  "lead:created": { icon: UserPlus, color: "text-emerald-500", bg: "bg-emerald-50", label: "New Lead" },
  "ticket:created": { icon: Ticket, color: "text-rose-500", bg: "bg-rose-50", label: "New Ticket" },
  "chat:started": { icon: MessageCircle, color: "text-blue-500", bg: "bg-blue-50", label: "Chat Started" },
  "chat:assigned": { icon: UserCheck, color: "text-indigo-500", bg: "bg-indigo-50", label: "Agent Assigned" },
  "ticket:resolved": { icon: Activity, color: "text-teal-500", bg: "bg-teal-50", label: "Ticket Resolved" },
  "website:registered": { icon: Globe, color: "text-purple-500", bg: "bg-purple-50", label: "Website Registered" }
};

export default function RealTimeActivityCenter() {
  const socket = useSocket();
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket) return;

    setConnected(socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const handleEvent = (type, payload) => {
      setEvents(prev => {
        const newEvent = {
          id: Date.now() + Math.random(),
          type,
          payload,
          timestamp: new Date()
        };
        // Keep last 50 events
        return [newEvent, ...prev].slice(0, 50);
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Register all event listeners
    Object.keys(EVENT_CONFIG).forEach(eventType => {
      socket.on(eventType, (payload) => handleEvent(eventType, payload));
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      Object.keys(EVENT_CONFIG).forEach(eventType => {
        socket.off(eventType);
      });
    };
  }, [socket]);

  // Mock initial data if empty to show the premium UI
  useEffect(() => {
    if (events.length === 0) {
      setEvents([
        { id: '1', type: 'lead:created', payload: { message: "John Doe from Acme Corp submitted details", user: "John Doe" }, timestamp: new Date(Date.now() - 1000 * 60 * 2) },
        { id: '2', type: 'chat:started', payload: { message: "New visitor session started on domain.com", user: "Visitor-891" }, timestamp: new Date(Date.now() - 1000 * 60 * 15) },
        { id: '3', type: 'ticket:created', payload: { message: "Payment failing on checkout page", user: "Sarah Smith" }, timestamp: new Date(Date.now() - 1000 * 60 * 45) },
        { id: '4', type: 'chat:assigned', payload: { message: "Agent Michael assigned to Visitor-891", user: "Michael" }, timestamp: new Date(Date.now() - 1000 * 60 * 60) },
        { id: '5', type: 'ticket:resolved', payload: { message: "Password reset issue resolved", user: "Agent Sarah" }, timestamp: new Date(Date.now() - 1000 * 60 * 120) }
      ]);
    }
  }, [events.length]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-white/40 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 shadow-sm">
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Live Operations Feed</h3>
          <p className="text-xs font-bold text-slate-500 mt-1">Real-time system event stream</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="relative flex h-3 w-3">
            {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
            {connected ? "Socket Connected" : "Socket Disconnected"}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-4xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-8">
          {events.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="animate-spin mb-4 opacity-50" size={32} />
              <p className="text-sm font-black uppercase tracking-widest">Waiting for live events...</p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {events.map((event, index) => {
                const config = EVENT_CONFIG[event.type] || EVENT_CONFIG["chat:started"];
                const Icon = config.icon;

                return (
                  <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-in slide-in-from-bottom-4 duration-500">
                    {/* Icon */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white ${config.bg} ${config.color} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10`}>
                      <Icon size={16} />
                    </div>

                    {/* Card */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock size={10} />
                          <span className="text-[10px] font-bold">
                            {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm font-bold text-slate-700 mt-2">
                        {event.payload?.message || "System event recorded"}
                      </p>

                      {event.payload?.user && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">
                            {event.payload.user.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-slate-500">{event.payload.user}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
