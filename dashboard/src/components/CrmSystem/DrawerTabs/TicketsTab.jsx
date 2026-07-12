import React, { useState } from "react";
import { Ticket as TicketIcon, X, MessageCircle, ChevronRight, Clock, AlertCircle, CheckCircle, User, Bot, Loader2 } from "lucide-react";
import { TicketStatusBadge } from "../CrmUIComponents.jsx";
import { api } from "../../../api/client.js";

function PriorityBadge({ priority }) {
  const colors = {
    high: "bg-red-50 text-red-600 border-red-100",
    medium: "bg-amber-50 text-amber-600 border-amber-100",
    low: "bg-slate-50 text-slate-400 border-slate-100"
  };
  return (
    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${colors[priority] || colors.medium}`}>
      {priority || "medium"}
    </span>
  );
}

function ChatBubble({ message }) {
  const isAgent = message.role === "agent" || message.role === "bot";
  return (
    <div className={`flex gap-2 ${isAgent ? "flex-row" : "flex-row-reverse"}`}>
      <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-black ${isAgent ? "bg-indigo-500" : "bg-slate-400"}`}>
        {isAgent ? <Bot size={12} /> : <User size={12} />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isAgent ? "bg-indigo-50 text-indigo-900" : "bg-slate-100 text-slate-800"}`}>
        {message.senderName && (
          <p className="text-[8px] font-black uppercase tracking-widest mb-1 opacity-60">{message.senderName}</p>
        )}
        <p className="text-[11px] font-medium leading-relaxed">{message.content}</p>
        <p className="text-[8px] font-bold opacity-40 mt-1 text-right">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
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

  // Ticket list view
  if (!selectedTicket) {
    return (
      <div className="space-y-3">
        {tickets?.length > 0 ? tickets.map(ticket => (
          <button
            key={ticket._id}
            onClick={() => openTicket(ticket)}
            className="w-full bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group text-left"
          >
            <div className="flex justify-between items-start mb-3">
              <TicketStatusBadge status={ticket.status} />
              <div className="flex items-center gap-2">
                <PriorityBadge priority={ticket.priority} />
                <span className="text-[9px] font-bold text-slate-300 uppercase">{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{ticket.subject}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{ticket.ticketId}</p>
              </div>
              <ChevronRight size={16} className="text-slate-200 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
            </div>
          </button>
        )) : (
          <div className="py-20 text-center space-y-3">
            <TicketIcon size={32} className="mx-auto text-slate-200" />
            <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No tickets linked</p>
          </div>
        )}
      </div>
    );
  }

  // Ticket detail + chat view
  const detail = ticketDetail?.ticket || selectedTicket;
  const messages = ticketDetail?.messages || [];

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
        <button
          onClick={closeDetail}
          className="p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-700"
          title="Back to tickets"
        >
          <X size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-black text-slate-900 truncate">{detail.subject}</h4>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{detail.ticketId}</p>
        </div>
        <TicketStatusBadge status={detail.status} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-indigo-400 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Ticket Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-2xl px-3 py-2.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Priority</p>
              <PriorityBadge priority={detail.priority} />
            </div>
            <div className="bg-slate-50 rounded-2xl px-3 py-2.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Channel</p>
              <p className="text-[10px] font-black text-slate-700 uppercase">{detail.channel || "Chat"}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl px-3 py-2.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Agent</p>
              <p className="text-[10px] font-black text-slate-700">{detail.assignedAgent?.name || "Unassigned"}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl px-3 py-2.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Created</p>
              <p className="text-[10px] font-black text-slate-700">{new Date(detail.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* CRM Stage */}
          {detail.crmStage && detail.crmStage !== "none" && (
            <div className="bg-indigo-50 rounded-2xl px-4 py-3">
              <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400 mb-1">CRM Stage</p>
              <p className="text-xs font-black text-indigo-700 uppercase">{detail.crmStage}</p>
            </div>
          )}

          {/* Chat Messages */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={14} className="text-slate-400" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Chat History</p>
              {messages.length > 0 && (
                <span className="bg-indigo-100 text-indigo-600 text-[8px] font-black px-2 py-0.5 rounded-full">
                  {messages.length} messages
                </span>
              )}
            </div>
            {messages.length > 0 ? (
              <div className="space-y-3 bg-slate-50 rounded-2xl p-4 max-h-80 overflow-y-auto">
                {messages.map((msg, i) => (
                  <ChatBubble key={msg._id || i} message={msg} />
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl py-8 text-center">
                <MessageCircle size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-[9px] font-black uppercase text-slate-300 tracking-widest">No chat messages</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
