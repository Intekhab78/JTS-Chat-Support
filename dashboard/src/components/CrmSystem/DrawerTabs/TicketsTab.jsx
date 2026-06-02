import React from "react";
import { Ticket as TicketIcon } from "lucide-react";
import { TicketStatusBadge } from "../CrmUIComponents.jsx";

export default function TicketsTab({ tickets }) {
  return (
    <div className="space-y-3">
      {tickets?.length > 0 ? tickets.map(ticket => (
        <div key={ticket._id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-indigo-200 transition-all">
          <div className="flex justify-between items-start mb-3">
            <TicketStatusBadge status={ticket.status} />
            <span className="text-[9px] font-bold text-slate-300 uppercase">{new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
          <h4 className="text-xs font-black text-slate-900 mb-1">{ticket.subject}</h4>
          <p className="text-[10px] font-medium text-slate-500 line-clamp-2">{ticket.description}</p>
        </div>
      )) : (
        <div className="py-20 text-center space-y-3">
          <TicketIcon size={32} className="mx-auto text-slate-200" />
          <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No tickets linked</p>
        </div>
      )}
    </div>
  );
}
