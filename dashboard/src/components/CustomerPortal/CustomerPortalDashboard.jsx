import React from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  FileText, ShoppingCart, CreditCard, LifeBuoy, Calendar, ArrowRight,
  Wallet, CheckCircle2, Clock
} from "lucide-react";
import { formatPortalMoney } from "./portalPrintUtils.js";

export default function CustomerPortalDashboard({ data, loading, onTabChange, currency = "USD", currencySettings = null }) {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-16 bg-white rounded-xl animate-pulse border border-slate-200/70" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-slate-200/70" />
          ))}
        </div>
      </div>
    );
  }

  const summary = data?.summary || { openTickets: 0, activeQuotes: 0, totalOrders: 0, unpaidInvoices: 0 };
  const financials = data?.financials || { totalBilled: 0, totalPaid: 0, outstandingDue: 0 };
  const recentInvoices = data?.invoices || [];
  const recentOrders = data?.orders || [];
  const recentQuotes = data?.quotes || [];
  const recentTickets = data?.tickets || [];
  const upcomingMeetings = data?.meetings || [];

  const fmt = (val, curr) => formatPortalMoney(val, curr || currency, currencySettings);

  const statCards = [
    { label: "Active Quotes", value: summary.activeQuotes, sub: `${summary.totalQuotes ?? recentQuotes.length} total`, tab: "quotations", icon: FileText, color: "text-indigo-600 bg-indigo-50" },
    { label: "Sales Orders", value: summary.totalOrders, sub: "Track fulfillment", tab: "orders", icon: ShoppingCart, color: "text-amber-600 bg-amber-50" },
    { label: "Unpaid Invoices", value: summary.unpaidInvoices, sub: `${summary.totalInvoices ?? recentInvoices.length} total`, tab: "invoices", icon: CreditCard, color: "text-emerald-600 bg-emerald-50" },
    { label: "Open Tickets", value: summary.openTickets, sub: "Support desk", tab: "support", icon: LifeBuoy, color: "text-sky-600 bg-sky-50" }
  ];

  return (
    <div className="space-y-3">
      {/* Welcome + Financial Overview Strip */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Welcome back, <span className="text-indigo-600">{user?.name || data?.customer?.name || "Customer"}</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Live overview of your quotations, sales orders, billing balance, and support requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2">
            <Wallet size={13} className="text-slate-500" />
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none">Total Billed</span>
              <span className="text-xs font-bold text-slate-900">{fmt(financials.totalBilled)}</span>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-2">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <div>
              <span className="text-[9px] font-bold text-emerald-600 uppercase block leading-none">Total Paid</span>
              <span className="text-xs font-bold text-emerald-800">{fmt(financials.totalPaid)}</span>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
            financials.outstandingDue > 0 ? "bg-amber-50/70 border-amber-200/80" : "bg-slate-50 border-slate-200/80"
          }`}>
            <Clock size={13} className={financials.outstandingDue > 0 ? "text-amber-600" : "text-slate-400"} />
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none">Balance Due</span>
              <span className={`text-xs font-bold ${financials.outstandingDue > 0 ? "text-amber-700" : "text-slate-800"}`}>
                {fmt(financials.outstandingDue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Clickable KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onTabChange(card.tab)}
              className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-xl p-3.5 shadow-2xs flex items-center justify-between text-left transition-all"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">{card.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
              </div>
              <div className={`p-2 rounded-xl ${card.color}`}>
                <Icon size={16} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Row 1: Recent Invoices + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Recent Invoices */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Recent Invoices</h3>
            <button
              type="button"
              onClick={() => onTabChange("invoices")}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">No invoices generated yet.</div>
          ) : (
            <div className="space-y-2">
              {recentInvoices.slice(0, 4).map((inv) => {
                const isPaid = inv.status === "paid" || inv.paymentStatus === "paid";
                return (
                  <button
                    key={inv._id}
                    type="button"
                    onClick={() => onTabChange("invoices")}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/70 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        #{inv.invoiceNumber || inv.invoiceId || inv._id.slice(-6)}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {inv.dueDate ? `Due ${new Date(inv.dueDate).toLocaleDateString()}` : inv.issuedAt ? `Issued ${new Date(inv.issuedAt).toLocaleDateString()}` : "Issued"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-900">
                        {fmt(inv.totalAmount ?? inv.total ?? 0, inv.currency)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        isPaid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {isPaid ? "Paid" : inv.status || "Pending"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Sales Orders */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Recent Sales Orders</h3>
            <button
              type="button"
              onClick={() => onTabChange("orders")}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">No sales orders yet.</div>
          ) : (
            <div className="space-y-2">
              {recentOrders.slice(0, 4).map((ord) => (
                <button
                  key={ord._id}
                  type="button"
                  onClick={() => onTabChange("orders")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-amber-50/40 border border-slate-200/70 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      #{ord.orderNumber || ord.orderId || ord._id.slice(-6).toUpperCase()}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Ordered {new Date(ord.createdAt).toLocaleDateString()} • {(ord.items || []).length} items
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-slate-900">
                      {fmt(ord.totalAmount ?? ord.total ?? 0, ord.currency)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      ord.status === "delivered" || ord.status === "completed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {ord.status || "confirmed"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Recent Quotations + Support Tickets + Upcoming Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Recent Quotations */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Recent Quotations</h3>
            <button
              type="button"
              onClick={() => onTabChange("quotations")}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          {recentQuotes.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">No quotations available.</div>
          ) : (
            <div className="space-y-2">
              {recentQuotes.slice(0, 3).map((q) => (
                <button
                  key={q._id}
                  type="button"
                  onClick={() => onTabChange("quotations")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/70 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      #{q.quotationId || q.quoteNumber || q._id.slice(-6).toUpperCase()}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-slate-900 block">{fmt(q.total, q.currency)}</span>
                    <span className="text-[10px] font-bold uppercase text-indigo-600">{q.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Support Tickets */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Support Tickets</h3>
            <button
              type="button"
              onClick={() => onTabChange("support")}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Open Desk <ArrowRight size={12} />
            </button>
          </div>

          {recentTickets.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-slate-400">No support tickets yet.</p>
              <button
                type="button"
                onClick={() => onTabChange("support")}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold transition-colors"
              >
                Create Support Ticket
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTickets.slice(0, 3).map((t) => (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => onTabChange("support")}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-sky-50/40 border border-slate-200/70 transition-colors text-left"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{t.subject}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t.ticketId || `#${t._id.slice(-6).toUpperCase()}`}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 ${
                    t.status === "closed" ? "bg-slate-100 text-slate-600" : "bg-sky-50 text-sky-700 border border-sky-200"
                  }`}>
                    {t.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Meetings */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs space-y-2.5">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Upcoming Meetings</h3>
          </div>

          {upcomingMeetings.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No scheduled meetings.</div>
          ) : (
            <div className="space-y-2">
              {upcomingMeetings.slice(0, 3).map((m) => (
                <div key={m._id} className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                    <Calendar size={13} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{m.title || "Scheduled Call"}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {m.dueDate ? new Date(m.dueDate).toLocaleString() : "TBD"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
