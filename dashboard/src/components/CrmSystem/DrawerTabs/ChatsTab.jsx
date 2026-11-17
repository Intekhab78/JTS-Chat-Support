import React from "react";
import { MessageCircle, ChevronRight } from "lucide-react";

export default function ChatsTab({ sessions }) {
  const openChatSession = (sessionId) => {
    const basePath = window.location.pathname;
    const targetPath = (basePath === "/" || basePath === "") ? "/agent" : basePath;
    window.open(`${targetPath}?tab=chats&sessionId=${sessionId}`, "_self");
  };

  return (
    <div className="space-y-2">
      {sessions?.length > 0 ? (
        sessions.map((session) => {
          const dateLabel = session.updatedAt || session.createdAt
            ? new Date(session.updatedAt || session.createdAt).toLocaleDateString()
            : "—";

          return (
            <button
              key={session._id || session.sessionId}
              onClick={() => openChatSession(session.sessionId)}
              className="w-full bg-white rounded-xl border border-slate-200/70 p-2.5 flex items-center justify-between gap-2.5 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all group cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/80 flex items-center justify-center shrink-0">
                  <MessageCircle size={14} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[11px] font-bold text-slate-800 truncate">
                      {session.sessionId}
                    </p>
                    {session.status && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        session.status === "open" || session.status === "active"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {session.status}
                      </span>
                    )}
                    {session.channel && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[8px] font-bold uppercase tracking-wider">
                        {session.channel}
                      </span>
                    )}
                  </div>
                  <p className="text-[9.5px] font-medium text-slate-400 mt-0.5">
                    {dateLabel}
                    {typeof session.messageCount === "number" ? ` · ${session.messageCount} msgs` : ""}
                  </p>
                </div>
              </div>
              <ChevronRight
                size={14}
                className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </button>
          );
        })
      ) : (
        <div className="py-8 bg-white rounded-xl border border-dashed border-slate-200 text-center space-y-1.5">
          <MessageCircle size={20} className="mx-auto text-slate-300" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            No chat sessions found
          </p>
        </div>
      )}
    </div>
  );
}
