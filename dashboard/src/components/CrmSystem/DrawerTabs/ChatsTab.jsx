import React from "react";
import { MessageCircle, ChevronRight } from "lucide-react";

export default function ChatsTab({ sessions }) {
  return (
    <div className="space-y-3">
      {sessions?.length > 0 ? sessions.map(session => (
        <button 
          key={session._id} 
          onClick={() => window.open(`/agent?tab=chats&sessionId=${session.sessionId}`, "_blank")}
          className="w-full bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircle size={18} />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{session.sessionId?.substring(0, 12)}…</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(session.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:-translate-x-1 transition-all" />
        </button>
      )) : (
        <div className="py-20 text-center space-y-3">
          <MessageCircle size={32} className="mx-auto text-slate-200" />
          <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No chat history</p>
        </div>
      )}
    </div>
  );
}
