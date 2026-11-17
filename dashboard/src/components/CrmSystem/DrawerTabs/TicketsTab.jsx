import React, { useState } from "react";
import { Ticket as TicketIcon, ArrowLeft, MessageCircle, ChevronRight, User, Bot, Loader2, Paperclip } from "lucide-react";
import { TicketStatusBadge } from "../CrmUIComponents.jsx";
import { api } from "../../../api/client.js";

function PriorityBadge({ priority }) {
  const colors = {
    high: "bg-red-50 text-red-600 border-red-100",
    medium: "bg-amber-50 text-amber-600 border-amber-100",
    low: "bg-slate-50 text-slate-500 border-slate-200"
  };
  return (
    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${colors[priority] || colors.medium}`}>
      {priority || "medium"}
    </span>
  );
}

function ChatBubble({ message }) {
  const sender = String(message.role || message.senderType || message.sender || "").toLowerCase();
  const isAgent = ["agent", "bot", "admin", "client", "manager", "system"].includes(sender);
  const bodyText =
    message.content ||
    message.text ||
    message.message ||
    message.body ||
    (message.attachmentUrl || message.fileName ? `Attachment: ${message.fileName || "File"}` : "No text content");

  return (
    <div className={`flex items-end gap-1.5 ${isAgent ? "flex-row" : "flex-row-reverse"}`}>
      <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white ${isAgent ? "bg-indigo-500" : "bg-slate-400"}`}>
        {isAgent ? <Bot size={10} /> : <User size={10} />}
      </div>
      <div className={`max-w-[78%] rounded-xl px-2.5 py-1.5 border ${isAgent ? "bg-indigo-50/70 border-indigo-100 text-indigo-950" : "bg-white border-slate-200/80 text-slate-800"}`}>
        {message.senderName && (
          <p className="text-[8px] font-bold uppercase tracking-wider mb-0.5 opacity-60">{message.senderName}</p>
        )}
        <p className="text-[11px] font-medium leading-snug break-words flex items-center gap-1">
          {(message.attachmentUrl || message.fileName) && !message.content && !message.text && <Paperclip size={10} className="shrink-0 opacity-60" />}
          <span>{bodyText}</span>
        </p>
        {message.createdAt && (
          <p className="text-[8px] font-semibold opacity-45 mt-0.5 text-right">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TicketsTab({ tickets }) {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setTicketDetail(null);
    setLoading(true);
    try {
      const data = await api(`/api/tickets/${ticket._id}`);
      setTicketDetail(data);
    } catch (err) {
      console.error("Failed to load ticket detail:", err);
      setTicketDetail({ ticket, messages: [] });
    } finally {
      setLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedTicket(null);
    setTicketDetail(null);
  };

  // Compact Ticket list view
  if (!selectedTicket) {
    return (
      <div className="space-y-2">
        {tickets?.length > 0 ? tickets.map(ticket => (
          <button
            key={ticket._id}
            onClick={() => openTicket(ticket)}
            className="w-full bg-white rounded-xl border border-slate-200/80 px-3 py-2.5 shadow-2xs hover:border-indigo-200 hover:bg-slate-50/40 transition-all group text-left flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <TicketStatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <span className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  {ticket.ticketId}
                </span>
              </div>
              <h4 className="text-[11px] font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                {ticket.subject}
              </h4>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-medium text-slate-400">
                {new Date(ticket.createdAt).toLocaleDateString()}
              </span>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>
          </button>
        )) : (
          <div className="py-8 text-center space-y-1.5 bg-slate-50/60 rounded-xl border border-slate-200/60">
            <TicketIcon size={20} className="mx-auto text-slate-300" />
            <p className="text-[9.5px] font-bold uppercase text-slate-400 tracking-wider">No tickets linked</p>
          </div>
        )}
      </div>
    );
  }

  // Compact Ticket detail + chat view
  const detail = ticketDetail?.ticket || selectedTicket;
  const messages = ticketDetail?.messages || [];

  return (
    <div className="flex flex-col gap-2.5">
      {/* Compact Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <button
          onClick={closeDetail}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
          title="Back to tickets"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <h4 className="text-[11.5px] font-bold text-slate-900 truncate">{detail.subject}</h4>
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{detail.ticketId}</p>
        </div>
        <TicketStatusBadge status={detail.status} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* Compact 4-Column Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl px-2.5 py-1.5">
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Priority</p>
              <PriorityBadge priority={detail.priority} />
            </div>
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl px-2.5 py-1.5">
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Channel</p>
              <p className="text-[10px] font-bold text-slate-800 uppercase">{detail.channel || "Chat"}</p>
            </div>
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl px-2.5 py-1.5">
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Agent</p>
              <p className="text-[10px] font-bold text-slate-800 truncate">{detail.assignedAgent?.name || "Unassigned"}</p>
            </div>
            <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl px-2.5 py-1.5">
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Created</p>
              <p className="text-[10px] font-bold text-slate-800">{new Date(detail.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {detail.crmStage && detail.crmStage !== "none" && (
            <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100 rounded-xl px-3 py-1.5">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-indigo-500">CRM Stage</span>
              <span className="text-[10px] font-bold text-indigo-700 uppercase">{detail.crmStage}</span>
            </div>
          )}

          {/* Chat Messages */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <MessageCircle size={12} className="text-slate-400" />
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Chat History</p>
              {messages.length > 0 && (
                <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[8.5px] font-bold px-1.5 py-0.2 rounded-full">
                  {messages.length}
                </span>
              )}
            </div>
            {messages.length > 0 ? (
              <div className="space-y-2 bg-slate-50/70 border border-slate-200/70 rounded-xl p-2.5 max-h-60 overflow-y-auto">
                {messages.map((msg, i) => (
                  <ChatBubble key={msg._id || i} message={msg} />
                ))}
              </div>
            ) : (
              <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl py-6 text-center">
                <MessageCircle size={18} className="mx-auto text-slate-300 mb-1" />
                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">No chat messages</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
