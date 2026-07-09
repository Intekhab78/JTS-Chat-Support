import React from "react";
import {
  MessageSquare, FileText, ShoppingCart, Receipt, Headphones,
  Calendar, ArrowRight, ShieldCheck, AlertCircle, Clock
} from "lucide-react";

export default function CustomerPortalDashboard({ data, loading, onTabChange }) {
  if (loading) {
    return <p className="text-center py-20 text-slate-400 text-xs font-black uppercase">Loading portal dashboard...</p>;
  }

  const summary = data?.summary || { openTickets: 0, activeQuotes: 0, totalOrders: 0, unpaidInvoices: 0 };

  const cards = [
    { key: "quotes", label: "Active Quotes", value: summary.activeQuotes, icon: FileText, color: "text-blue-600 bg-blue-50/50" },
    { key: "orders", label: "Total Orders", value: summary.totalOrders, icon: ShoppingCart, color: "text-amber-600 bg-amber-50/50" },
    { key: "invoices", label: "Unpaid Invoices", value: summary.unpaidInvoices, icon: Receipt, color: "text-emerald-600 bg-emerald-50/50" },
    { key: "support", label: "Open Tickets", value: summary.openTickets, icon: Headphones, color: "text-indigo-600 bg-indigo-50/50" }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[28px] p-8 text-white relative overflow-hidden shadow-xl border border-slate-700">
        <div className="relative z-10 space-y-2">
          <h2 className="text-xl font-black tracking-tight">Welcome to your Client Portal</h2>
          <p className="text-xs text-slate-300 max-w-md font-bold leading-relaxed">
            Access quote agreements, monitor open sales orders, track support ticket responses, and manage billing history.
          </p>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              onClick={() => onTabChange(card.key)}
              className="bg-white border border-slate-200/80 rounded-[24px] p-6 shadow-sm flex items-center justify-between hover:border-slate-400 hover:shadow-md transition-all text-left group"
            >
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                <p className="text-2xl font-black text-slate-800 mt-2">{card.value}</p>
              </div>
              <div className={`p-4 rounded-2xl ${card.color} group-hover:scale-105 transition-transform`}>
                <Icon size={20} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Recent Invoices</h3>
            <button onClick={() => onTabChange("invoices")} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1 hover:underline">
              View All <ArrowRight size={10} />
            </button>
          </div>
          <div className="space-y-2.5">
            {(!data?.invoices || data.invoices.length === 0) ? (
              <p className="text-[10px] text-slate-400 font-bold py-6 text-center">No invoices logged.</p>
            ) : (
              data.invoices.map(invoice => (
                <div key={invoice._id} className="p-4 border rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-black text-slate-800">#{invoice.invoiceNumber || invoice._id.slice(-6).toUpperCase()}</span>
                    <span className="text-[9px] font-bold text-slate-400 ml-2">📅 {new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-800">₹{invoice.totalAmount}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${invoice.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{invoice.paymentStatus}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Upcoming Meetings</h3>
          </div>
          <div className="space-y-3">
            {(!data?.meetings || data.meetings.length === 0) ? (
              <p className="text-[10px] text-slate-400 font-bold py-6 text-center">No scheduled meetings.</p>
            ) : (
              data.meetings.map(meet => (
                <div key={meet._id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800 font-black text-[11px]">
                    <Clock size={12} className="text-indigo-500" />
                    <span>{meet.title}</span>
                  </div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Start: {new Date(meet.dueDate).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
