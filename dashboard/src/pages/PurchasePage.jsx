import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileSpreadsheet, ShieldCheck, Ticket, Clock3, RefreshCw, Building2, ReceiptText, TrendingUp, Zap } from "lucide-react";
import Layout from "../components/Layout.jsx";
import StatCard from "../components/StatCard.jsx";
import PaginationControls from "../components/PaginationControls.jsx";
import CRMQuotationTab from "../components/CrmSystem/CrmQuotationTab.jsx";
import CRMInvoiceTab from "../components/CrmSystem/CrmInvoiceTab.jsx";
import PurchaseProcurementTab from "../components/PurchaseProcurementTab.jsx";
import InventoryManager from "../components/InventoryManager.jsx";
import CustomerManager from "../components/CustomerManager.jsx";
import ActivityTimeline from "../components/ActivityTimeline.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

import { formatCurrency } from "../utils/currencyFormatter.js";

function formatDate(value) {
  if (!value) return "No activity yet";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    queued: "bg-amber-50 text-amber-700 border-amber-100",
    closed: "bg-slate-100 text-slate-500 border-slate-200",
    open: "bg-indigo-50 text-indigo-700 border-indigo-100",
    waiting: "bg-amber-50 text-amber-700 border-amber-100",
    in_progress: "bg-sky-50 text-sky-700 border-sky-100",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-100"
  };

  return (
    <span className={`inline-flex items-center rounded-xl border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${styles[status] || styles.closed}`}>
      {String(status || "unknown").replaceAll("_", " ")}
    </span>
  );
}

const PURCHASE_WORKFLOW_STEPS = [
  { key: "new", label: "New", action: "Start Review", tone: "bg-slate-100 text-slate-600 border-slate-200" },
  { key: "in_review", label: "In Review", action: "Mark Quotation Ready", tone: "bg-sky-50 text-sky-700 border-sky-100" },
  { key: "quotation_ready", label: "Quotation Ready", action: "Mark Invoice Ready", tone: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  { key: "invoice_ready", label: "Invoice Ready", action: "Complete Purchase", tone: "bg-amber-50 text-amber-700 border-amber-100" },
  { key: "completed", label: "Completed", action: "Completed", tone: "bg-emerald-50 text-emerald-700 border-emerald-100" }
];

const WORKFLOW_STEP_BY_KEY = PURCHASE_WORKFLOW_STEPS.reduce((acc, step, index) => {
  acc[step.key] = { ...step, index };
  return acc;
}, {});

function getWorkflowStatus(customer) {
  return customer?.purchaseWorkflowStatus || "new";
}

function getNextWorkflowStatus(status) {
  const current = WORKFLOW_STEP_BY_KEY[status] || WORKFLOW_STEP_BY_KEY.new;
  return PURCHASE_WORKFLOW_STEPS[current.index + 1]?.key || "";
}

function WorkflowBadge({ status }) {
  const step = WORKFLOW_STEP_BY_KEY[status] || WORKFLOW_STEP_BY_KEY.new;
  return (
    <span className={`inline-flex items-center rounded-xl border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${step.tone}`}>
      {step.label}
    </span>
  );
}

function WorkflowActionButton({ customer, busy, onAdvance }) {
  const status = getWorkflowStatus(customer);
  const nextStatus = getNextWorkflowStatus(status);
  const currentStep = WORKFLOW_STEP_BY_KEY[status] || WORKFLOW_STEP_BY_KEY.new;

  if (!nextStatus) {
    return (
      <span className="inline-flex items-center rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-700">
        Completed
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(event) => {
        event.stopPropagation();
        onAdvance(customer._id, nextStatus);
      }}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
    >
      {busy ? <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Zap size={13} />}
      {currentStep.action}
    </button>
  );
}

function PurchaseOverview({ sessions, tickets, loading, onRefresh, user, customers, quotes, invoices, procurementStats }) {
  const activeRequests = sessions.filter((session) => ["active", "queued"].includes(session.status));
  const openTickets = tickets.filter((ticket) => ["open", "waiting", "in_progress", "pending"].includes(ticket.status));
  const pendingQuotes = quotes.filter((quote) => ["draft", "sent", "viewed", "pending_approval"].includes(quote.status));
  const pendingInvoices = invoices.filter((invoice) => invoice.status !== "paid");
  const workflowStats = PURCHASE_WORKFLOW_STEPS.reduce((acc, step) => {
    acc[step.key] = customers.filter((customer) => getWorkflowStatus(customer) === step.key).length;
    return acc;
  }, {});
  const completedThisMonth = customers.filter((customer) => {
    if (getWorkflowStatus(customer) !== "completed" || !customer.purchaseCompletedAt) return false;
    const completedAt = new Date(customer.purchaseCompletedAt);
    const now = new Date();
    return completedAt.getMonth() === now.getMonth() && completedAt.getFullYear() === now.getFullYear();
  }).length;
  const completionDurations = customers
    .filter((customer) => customer.purchaseRequestedAt && customer.purchaseCompletedAt)
    .map((customer) => new Date(customer.purchaseCompletedAt) - new Date(customer.purchaseRequestedAt))
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
  const averageCompletionDays = completionDurations.length
    ? Math.max(1, Math.round((completionDurations.reduce((sum, duration) => sum + duration, 0) / completionDurations.length) / (1000 * 60 * 60 * 24)))
    : 0;
  const recentActivity = [...activeRequests]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5);

  const formatLocalCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Purchase Control</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Procurement operations at a glance</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dedicated workspace for financial review, follow-up, and request handling.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black"
        >
          <RefreshCw size={14} />
          Refresh Desk
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Assigned Requests" value={activeRequests.length} trend="Live workload" color="indigo" />
        <StatCard label="Open Tickets" value={openTickets.length} trend="Needs review" color="orange" />
        <StatCard label="Pending Quotes" value={pendingQuotes.length} trend={`${customers.length} live accounts`} color="emerald" />
        <StatCard label="Pending Invoices" value={pendingInvoices.length} trend={user?.isAvailable ? "Desk ready" : "Desk standby"} color="rose" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="In Review" value={workflowStats.in_review || 0} trend={`${workflowStats.new || 0} new requests`} color="indigo" />
        <StatCard label="Quote Ready" value={workflowStats.quotation_ready || 0} trend="Commercial proposals ready" color="emerald" />
        <StatCard label="Invoice Ready" value={workflowStats.invoice_ready || 0} trend="Awaiting payment closure" color="orange" />
        <StatCard label="Completed" value={workflowStats.completed || 0} trend={`${completedThisMonth} this month, avg ${averageCompletionDays || "-"} days`} color="rose" />
      </div>

      {procurementStats && (
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
            <Zap size={120} />
          </div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-300">Procurement Intelligence</p>
              <h4 className="text-3xl font-black tracking-tight">Active Supply Chain <span className="text-indigo-400 italic">Pulse</span></h4>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg w-fit">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest">Real-time Monitoring Active</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Total Purchase Value</span>
              <span className="text-4xl font-black tracking-tighter">{formatLocalCurrency(procurementStats.totalSpend)}</span>
              <div className="h-1 w-20 bg-emerald-400 rounded-full mt-2" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mb-1">Low Stock</p>
                <p className={`text-2xl font-black ${procurementStats.lowStockCount > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {procurementStats.lowStockCount}
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mb-1">Active POs</p>
                <p className="text-2xl font-black">
                  {procurementStats.statusDistribution?.reduce((acc, s) => acc + s.count, 0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-8">
        <section className="premium-card p-8 bg-white border border-slate-200/60 shadow-sm rounded-[36px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">Recent assigned requests</h4>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Conversation and request stream for purchase operations</p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 animate-pulse">Loading procurement stream…</div>
          ) : recentActivity.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">No active procurement requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((session) => (
                <article key={session._id} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1 min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-tight text-slate-900 truncate">
                        {session.visitorId?.name || session.visitorId?.visitorId || "Anonymous requester"}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">
                        {session.websiteId?.websiteName || "Unknown website"}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 truncate">
                        {session.lastMessagePreview || "Waiting for request details"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={session.status} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                        {formatDate(session.updatedAt || session.createdAt)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="premium-card p-8 bg-[linear-gradient(145deg,#0f172a,#1e1b4b)] text-white rounded-[36px] border border-slate-900/30 shadow-[0_25px_80px_-35px_rgba(15,23,42,0.9)]">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200">Operational Rules</p>
              <h4 className="text-2xl font-black tracking-tight">Purchase workspace</h4>
              <p className="text-sm font-bold text-slate-300 leading-relaxed">
                This dashboard is separate from the agent workspace. It keeps procurement users focused on requests, approvals, tickets, and account coordination.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <ShieldCheck size={18} className="text-cyan-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Role identity</p>
                </div>
                <p className="text-sm font-black text-white">You are logged in as <span className="italic text-cyan-200">{user?.role}</span>, not as an agent.</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Ticket size={18} className="text-emerald-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Main focus</p>
                </div>
                <p className="text-sm font-bold text-slate-200">Track purchase-related requests, follow operational tickets, and manage your own account settings from one lane.</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Clock3 size={18} className="text-amber-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">Next action</p>
                </div>
                <p className="text-sm font-bold text-slate-200">Use the Requests tab for assigned conversations and the Settings tab to update your purchase account profile.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PurchaseRequests({ sessions, tickets, customers, page, setPage, loading, onRefresh, onSelectCustomer, workflowFilter, setWorkflowFilter, updatingWorkflowId, onAdvanceWorkflow }) {
  const [convertingId, setConvertingId] = useState("");

  const handleConvert = async (item) => {
    setConvertingId(item.id);
    try {
      if (item.kind === "Conversation" || item.kind === "Ticket") {
        await api("/api/crm/promote", {
          method: "POST",
          body: JSON.stringify({
            visitorId: item.original.visitorId?._id || item.original.visitorId,
            sessionId: item.kind === "Conversation" ? item.original._id : undefined,
            leadSource: item.kind === "Conversation" ? "Purchase Request Chat" : "Purchase Request Ticket"
          })
        });
        if (onRefresh) onRefresh();
      } else if (item.kind === "Deal Request") {
        if (getWorkflowStatus(item.original) === "new" && onAdvanceWorkflow) {
          await onAdvanceWorkflow(item.original._id, "in_review");
        }
        if (onSelectCustomer) onSelectCustomer(item.original._id);
      }
    } catch (error) {
      alert("Conversion failed: " + error.message);
    } finally {
      setConvertingId("");
    }
  };

  const combined = useMemo(() => {
    const requestRows = sessions.map((session) => ({
      id: `session-${session._id}`,
      kind: "Conversation",
      title: session.visitorId?.name || session.visitorId?.visitorId || "Anonymous requester",
      subtitle: session.websiteId?.websiteName || "Unknown website",
      detail: session.lastMessagePreview || "Waiting for request details",
      status: session.status,
      updatedAt: session.updatedAt || session.createdAt,
      original: session
    }));

    const ticketRows = tickets.map((ticket) => ({
      id: `ticket-${ticket._id}`,
      kind: "Ticket",
      title: ticket.subject || ticket.ticketId || "Untitled ticket",
      subtitle: ticket.websiteId?.websiteName || ticket.visitorId?.name || "Support queue",
      detail: ticket.ticketId || "Ticket record",
      status: ticket.status,
      updatedAt: ticket.updatedAt || ticket.createdAt,
      original: ticket
    }));

    const crmRows = customers.map((customer) => ({
      id: `customer-${customer._id}`,
      kind: "Deal Request",
      title: customer.companyName || customer.name || customer.crn || "Won deal handoff",
      subtitle: customer.websiteId?.websiteName || customer.email || "Purchase request",
      detail: customer.generatedCode
        ? `Generated code: ${customer.generatedCode}`
        : `Locked won deal${customer.crn ? ` • ${customer.crn}` : ""}`,
      status: customer.isLocked ? "queued" : "open",
      workflowStatus: getWorkflowStatus(customer),
      updatedAt: customer.updatedAt || customer.createdAt,
      original: customer
    }));

    return [...crmRows, ...requestRows, ...ticketRows]
      .filter((row) => workflowFilter === "all" || row.kind !== "Deal Request" || row.workflowStatus === workflowFilter)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [customers, sessions, tickets, workflowFilter]);

  const paginated = getPaginationMeta(combined, page);
  const workflowCounts = useMemo(() => {
    return customers.reduce((acc, customer) => {
      const status = getWorkflowStatus(customer);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [customers]);

  useEffect(() => {
    setPage(1);
  }, [customers.length, sessions.length, tickets.length, workflowFilter, setPage]);

  return (
    <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-1">
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Purchase Request Queue</h3>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Combined view of locked won deals, assigned conversations, and tickets</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setWorkflowFilter("all")}
          className={`rounded-2xl border px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
            workflowFilter === "all" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
          }`}
        >
          All ({customers.length})
        </button>
        {PURCHASE_WORKFLOW_STEPS.map((step) => (
          <button
            key={step.key}
            type="button"
            onClick={() => setWorkflowFilter(step.key)}
            className={`rounded-2xl border px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
              workflowFilter === step.key ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
            }`}
          >
            {step.label} ({workflowCounts[step.key] || 0})
          </button>
        ))}
      </div>

      <div className="premium-card p-6 bg-white rounded-[36px] border border-slate-200/60 shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 animate-pulse">Loading assigned requests…</div>
        ) : paginated.totalItems === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">No locked deals, conversations, or tickets available for this purchase account</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginated.pageItems.map((item) => (
              <article key={item.id} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5 transition-all hover:border-indigo-200 hover:bg-white">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6 flex-1 min-w-0">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-slate-900 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white">{item.kind}</span>
                        <StatusBadge status={item.status} />
                        {item.kind === "Deal Request" ? <WorkflowBadge status={item.workflowStatus} /> : null}
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 truncate">{item.title}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">{item.subtitle}</p>
                      <p className="text-xs font-bold text-slate-500 truncate">{item.detail}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.kind === "Deal Request" ? (
                        <WorkflowActionButton
                          customer={item.original}
                          busy={updatingWorkflowId === item.original._id}
                          onAdvance={onAdvanceWorkflow}
                        />
                      ) : null}
                      <button
                        type="button"
                        disabled={convertingId === item.id}
                        onClick={() => handleConvert(item)}
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                          item.kind === "Deal Request"
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 shadow-sm shadow-emerald-500/10"
                        } disabled:opacity-50`}
                      >
                        {convertingId === item.id ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : item.kind === "Deal Request" ? (
                          <Zap size={14} />
                        ) : (
                          <TrendingUp size={14} />
                        )}
                        {item.kind === "Deal Request" ? "Manage Sale" : "Convert to Sales"}
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                    {formatDate(item.updatedAt)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <PaginationControls
        currentPage={paginated.currentPage}
        totalPages={paginated.totalPages}
        totalItems={paginated.totalItems}
        itemLabel="requests"
        onPageChange={setPage}
      />
    </section>
  );
}

function PurchaseCustomerPicker({ customers, selectedCustomerId, onSelect, loading, onRefresh, updatingWorkflowId, onAdvanceWorkflow }) {
  return (
    <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Purchase Accounts</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Choose a customer to manage quotations and invoices</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black"
        >
          <RefreshCw size={14} />
          Refresh Accounts
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {loading ? (
          <div className="lg:col-span-2 premium-card p-10 bg-white rounded-[36px] border border-slate-200/60 shadow-sm text-center text-[10px] font-black uppercase tracking-widest text-slate-300 animate-pulse">
            Loading purchase accounts...
          </div>
        ) : customers.length === 0 ? (
          <div className="lg:col-span-2 premium-card p-10 bg-white rounded-[36px] border-2 border-dashed border-slate-200 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">No assigned accounts found for this purchase desk</p>
          </div>
        ) : (
          customers.map((customer) => {
            const isActive = selectedCustomerId === customer._id;
            return (
              <article
                key={customer._id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(customer._id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(customer._id);
                  }
                }}
                className={`premium-card rounded-[32px] border p-6 text-left transition-all ${
                  isActive
                    ? "border-indigo-300 bg-indigo-50/60 shadow-[0_20px_60px_-35px_rgba(79,70,229,0.6)]"
                    : "border-slate-200/60 bg-white hover:border-indigo-200 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Customer</p>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight truncate">{customer.name || customer.companyName || "Unnamed account"}</h4>
                    <p className="text-[11px] font-bold text-slate-500 truncate">{customer.email || "No email on file"}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isActive ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-400 border-slate-100"}`}>
                    <Building2 size={18} />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Website</p>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-tight text-slate-900 truncate">{customer.websiteId?.websiteName || "Unassigned site"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Stage</p>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-tight text-slate-900">{customer.pipelineStage || customer.status || "new"}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">Purchase Workflow</p>
                    <WorkflowBadge status={getWorkflowStatus(customer)} />
                  </div>
                  <WorkflowActionButton
                    customer={customer}
                    busy={updatingWorkflowId === customer._id}
                    onAdvance={onAdvanceWorkflow}
                  />
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function PurchaseActivityPanel({ customer, activity, loading, onRefresh }) {
  const purchaseActivity = activity.filter((item) => item.metadata?.workflow === "purchase");

  return (
    <section className="premium-card rounded-[36px] border border-slate-200/60 bg-white p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Purchase Timeline</p>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {customer ? customer.name || customer.companyName || customer.crn : "Select an account"}
          </h3>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Workflow movement, automation, and payment completion history
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={!customer || loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Timeline
        </button>
      </div>

      {!customer ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Choose a purchase account to view workflow history</p>
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-5 py-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 animate-pulse">Loading purchase timeline...</p>
        </div>
      ) : (
        <ActivityTimeline items={purchaseActivity} emptyLabel="No purchase workflow activity yet." />
      )}
    </section>
  );
}



function PurchaseWebsiteSelector({ websites, websiteId, setWebsiteId, label }) {
  return (
    <div className="premium-card overflow-hidden rounded-[32px] border border-slate-200/60 bg-[linear-gradient(135deg,#ffffff_0%,#eef2ff_55%,#ecfeff_100%)] shadow-[0_28px_80px_-50px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">{label}</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Select website scope</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Choose the active website to manage stock, item master, and inventory actions.</p>
          </div>
          <div className="rounded-[26px] border border-white/80 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-300">Active Scope</p>
            <p className="mt-2 text-sm font-black uppercase tracking-tight text-slate-900">
              {websites.find((website) => website._id === websiteId)?.websiteName || "No website selected"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
          <div className="rounded-[26px] border border-white/80 bg-white/90 px-5 py-4 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-300">Available Websites</p>
            <p className="mt-2 text-sm font-bold text-slate-500">Switch the inventory scope without leaving the purchase workspace.</p>
          </div>
          <div className="rounded-[26px] border border-indigo-200 bg-white px-4 py-3 shadow-[0_18px_40px_-30px_rgba(79,70,229,0.65)]">
            <select
              value={websiteId}
              onChange={(event) => setWebsiteId(event.target.value)}
              className="min-w-[280px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none focus:border-indigo-400"
            >
              <option value="">Select website</option>
              {websites.map((website) => (
                <option key={website._id} value={website._id}>
                  {website.websiteName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function PurchaseSettings({ user, setUser }) {
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: ""
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      email: user?.email || "",
      password: ""
    });
  }, [user?.name, user?.email]);

  async function saveProfile(event) {
    event.preventDefault();
    setSavingProfile(true);
    setStatusMessage("");
    try {
      const updatedUser = await api("/api/users/profile", {
        method: "PATCH",
        body: JSON.stringify(profileForm)
      });
      setUser(updatedUser);
      setProfileForm((current) => ({ ...current, password: "" }));
      setStatusMessage("Purchase profile updated successfully.");
    } catch (error) {
      setStatusMessage(error.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function toggleAvailability() {
    setSavingAvailability(true);
    setStatusMessage("");
    try {
      const updated = await api("/api/users/availability", {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !user?.isAvailable })
      });
      setUser(updated);
      setStatusMessage(`Purchase desk is now ${updated.isAvailable ? "ready" : "standby"}.`);
    } catch (error) {
      setStatusMessage(error.message || "Failed to update desk status.");
    } finally {
      setSavingAvailability(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8 animate-in slide-in-from-bottom-4 duration-700">
      <form onSubmit={saveProfile} className="premium-card p-8 bg-white rounded-[36px] border border-slate-200/60 shadow-sm space-y-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Account Settings</p>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Update purchase profile</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</span>
            <input
              value={profileForm.name}
              onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-indigo-400 focus:bg-white"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
            <input
              type="email"
              value={profileForm.email}
              onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-indigo-400 focus:bg-white"
              required
            />
          </label>
        </div>

        <label className="space-y-2 block">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</span>
          <input
            type="password"
            placeholder="Leave blank to keep current password"
            value={profileForm.password}
            onChange={(event) => setProfileForm((current) => ({ ...current, password: event.target.value }))}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-indigo-400 focus:bg-white"
          />
        </label>

        {statusMessage ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-bold text-slate-600">
            {statusMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={savingProfile}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black disabled:opacity-60"
        >
          {savingProfile ? "Saving…" : "Save Profile"}
        </button>
      </form>

      <div className="premium-card p-8 bg-[linear-gradient(145deg,#ffffff,#eef2ff)] rounded-[36px] border border-indigo-100/70 shadow-sm space-y-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Desk Control</p>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Purchase availability</h3>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/80 p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current status</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
            {user?.isAvailable ? "Ready" : "Standby"}
          </p>
          <p className="mt-2 text-sm font-bold text-slate-500">
            Toggle this when the purchase desk is available for new assigned work.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleAvailability}
          disabled={savingAvailability}
          className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all disabled:opacity-60 ${
            user?.isAvailable ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {savingAvailability ? "Updating…" : user?.isAvailable ? "Set Standby" : "Set Ready"}
        </button>
      </div>
    </div>
  );
}

export default function PurchasePage() {
  const { user, setUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "dashboard";
  const [sessions, setSessions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [procurementStats, setProcurementStats] = useState(null);
  const [inventoryWebsites, setInventoryWebsites] = useState([]);
  const [selectedInventoryWebsiteId, setSelectedInventoryWebsiteId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState("");
  const [customerActivity, setCustomerActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer._id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const menuItems = [
    { label: "Dashboard", href: "/purchase" },
    { label: "Requests", href: "/purchase?tab=requests" },
    { label: "Procurement", href: "/purchase?tab=procurement" },
    {
      label: "Inventory",
      children: [
        { label: "Item Master", href: "/purchase?tab=inventory-master" },
        { label: "Category Master", href: "/purchase?tab=inventory-category" },
        { label: "Subcategory Master", href: "/purchase?tab=inventory-subcategory" },
        { label: "Brand Master", href: "/purchase?tab=inventory-brand" },
        { label: "Size Master", href: "/purchase?tab=inventory-size" },
        { label: "Color Master", href: "/purchase?tab=inventory-color" },
        { label: "Unit Master", href: "/purchase?tab=inventory-unit" },
        { label: "Supplier Master", href: "/purchase?tab=inventory-supplier" },
        { label: "Stock In", href: "/purchase?tab=inventory-stock-in" },
        { label: "Stock Out", href: "/purchase?tab=inventory-stock-out" },
        { label: "Adjustment", href: "/purchase?tab=inventory-adjustment" }
      ]
    },
    { label: "Customer Master", href: "/purchase?tab=inventory-customer" },
    { label: "Settings", href: "/purchase?tab=settings" }
  ];

  async function loadFinancialRecords(customerId) {
    if (!customerId) {
      setQuotes([]);
      setInvoices([]);
      return;
    }

    setFinancialLoading(true);
    try {
      const [quoteResult, invoiceResult] = await Promise.allSettled([
        api(`/api/crm/${customerId}/quotations`),
        api(`/api/crm/${customerId}/invoices`)
      ]);

      setQuotes(quoteResult.status === "fulfilled" && Array.isArray(quoteResult.value) ? quoteResult.value : []);
      setInvoices(invoiceResult.status === "fulfilled" && Array.isArray(invoiceResult.value) ? invoiceResult.value : []);
    } finally {
      setFinancialLoading(false);
    }
  }

  async function loadCustomerActivity(customerId) {
    if (!customerId) {
      setCustomerActivity([]);
      return;
    }

    setActivityLoading(true);
    try {
      const data = await api(`/api/crm/${customerId}/activity`);
      setCustomerActivity(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load purchase activity", error);
      setCustomerActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }

  async function loadWorkspace() {
    setLoading(true);
    try {
      const customerQuery =
        String(user?.role || "").trim().toLowerCase() === "purchase"
          ? "/api/crm?limit=100&pipelineStage=won"
          : "/api/crm?view=my_leads&limit=100";

      // purchase role has no access to chat/ticket routes — skip those calls
      const [sessionResult, ticketResult, customerResult, inventoryMetaResult, procurementResult] = await Promise.allSettled([
        Promise.resolve([]),
        Promise.resolve([]),
        api(customerQuery),
        api("/api/inventory/meta"),
        api("/api/procurement/stats")
      ]);

      setSessions(sessionResult.status === "fulfilled" && Array.isArray(sessionResult.value) ? sessionResult.value : []);
      setTickets(ticketResult.status === "fulfilled" && Array.isArray(ticketResult.value) ? ticketResult.value : []);
      const nextCustomers = customerResult.status === "fulfilled"
        ? (Array.isArray(customerResult.value) ? customerResult.value : customerResult.value?.customers || [])
        : [];
      setCustomers(nextCustomers);
      const nextInventoryWebsites = inventoryMetaResult.status === "fulfilled" && Array.isArray(inventoryMetaResult.value?.websites)
        ? inventoryMetaResult.value.websites
        : [];
      setInventoryWebsites(nextInventoryWebsites);
      
      if (procurementResult.status === "fulfilled") {
        setProcurementStats(procurementResult.value);
      }
      setSelectedInventoryWebsiteId((current) => {
        if (current && nextInventoryWebsites.some((website) => website._id === current)) {
          return current;
        }
        return nextInventoryWebsites[0]?._id || "";
      });
      setSelectedCustomerId((current) => {
        if (current && nextCustomers.some((customer) => customer._id === current)) {
          return current;
        }
        return nextCustomers[0]?._id || "";
      });
    } finally {
      setLoading(false);
    }
  }

  async function updatePurchaseWorkflow(customerId, status) {
    if (!customerId || !status || updatingWorkflowId) return;

    setUpdatingWorkflowId(customerId);
    try {
      const updated = await api(`/api/crm/${customerId}/purchase-workflow`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });

      setCustomers((current) => current.map((customer) => (
        customer._id === customerId ? { ...customer, ...updated } : customer
      )));
      await loadWorkspace();
      await loadCustomerActivity(customerId);
    } catch (error) {
      alert(`Failed to update workflow: ${error.message}`);
    } finally {
      setUpdatingWorkflowId("");
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  useEffect(() => {
    loadFinancialRecords(selectedCustomerId);
    loadCustomerActivity(selectedCustomerId);
  }, [selectedCustomerId]);

  let title = "Purchase Command";
  let subtitle = "Dedicated procurement dashboard and request control";
  let content = (
    <PurchaseOverview
      sessions={sessions}
      tickets={tickets}
      loading={loading}
      onRefresh={loadWorkspace}
      user={user}
      customers={customers}
      quotes={quotes}
      invoices={invoices}
      procurementStats={procurementStats}
    />
  );

  if (tab === "accounts") {
    title = "Purchase Accounts";
    subtitle = "Assigned customer accounts for quotations and invoicing";
    content = (
      <div className="space-y-6">
        <PurchaseCustomerPicker
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onSelect={setSelectedCustomerId}
          loading={loading}
          onRefresh={loadWorkspace}
          updatingWorkflowId={updatingWorkflowId}
          onAdvanceWorkflow={updatePurchaseWorkflow}
        />
        <PurchaseActivityPanel
          customer={selectedCustomer}
          activity={customerActivity}
          loading={activityLoading}
          onRefresh={() => loadCustomerActivity(selectedCustomerId)}
        />
      </div>
    );
  }

  if (tab === "requests") {
    title = "Purchase Requests";
    subtitle = "Assigned conversations and support records";
    content = (
      <PurchaseRequests
        sessions={sessions}
        tickets={tickets}
        customers={customers}
        page={page}
        setPage={setPage}
        loading={loading}
        onRefresh={loadWorkspace}
        workflowFilter={workflowFilter}
        setWorkflowFilter={setWorkflowFilter}
        updatingWorkflowId={updatingWorkflowId}
        onAdvanceWorkflow={updatePurchaseWorkflow}
        onSelectCustomer={(id) => {
          setSelectedCustomerId(id);
          setSearchParams({ tab: "accounts" });
        }}
      />
    );
  }

  if (tab === "procurement") {
    title = "Vendor Procurement";
    subtitle = "Draft purchase orders and track supplier shipments";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Procurement Scope"
        />
        {selectedInventoryWebsiteId ? (
          <PurchaseProcurementTab websiteId={selectedInventoryWebsiteId} />
        ) : (
          <div className="premium-card p-10 bg-white rounded-[36px] border-2 border-dashed border-slate-200 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Select a website scope above to manage POs</p>
          </div>
        )}
      </div>
    );
  }

  if (tab === "quotations") {
    title = "Purchase Quotations";
    subtitle = "Build, track, and review commercial proposals";
    content = selectedCustomer ? (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Selected Account</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedCustomer.name || selectedCustomer.companyName || "Unnamed account"}</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {selectedCustomer.websiteId?.websiteName || "Unassigned site"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadFinancialRecords(selectedCustomerId)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black"
          >
            <RefreshCw size={14} />
            Refresh Quotes
          </button>
        </div>

        <CRMQuotationTab customer={selectedCustomer} websiteId={selectedCustomer.websiteId?._id || selectedCustomer.websiteId} />
      </div>
    ) : (
      <PurchaseCustomerPicker
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onSelect={setSelectedCustomerId}
        loading={loading}
        onRefresh={loadWorkspace}
        updatingWorkflowId={updatingWorkflowId}
        onAdvanceWorkflow={updatePurchaseWorkflow}
      />
    );
  }

  if (tab === "invoices") {
    title = "Purchase Invoices";
    subtitle = "Ledger, payment status, and customer invoice access";
    content = selectedCustomer ? (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Selected Account</p>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedCustomer.name || selectedCustomer.companyName || "Unnamed account"}</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              {selectedCustomer.websiteId?.websiteName || "Unassigned site"}
            </p>
          </div>
        </div>

        <CRMInvoiceTab 
          customer={selectedCustomer} 
          websiteId={selectedCustomer.websiteId?._id || selectedCustomer.websiteId}
          initialInvoices={invoices}
          onRefreshRequested={() => loadFinancialRecords(selectedCustomerId)}
        />
      </div>
    ) : (
      <PurchaseCustomerPicker
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onSelect={setSelectedCustomerId}
        loading={loading}
        onRefresh={loadWorkspace}
        updatingWorkflowId={updatingWorkflowId}
        onAdvanceWorkflow={updatePurchaseWorkflow}
      />
    );
  }

  if (tab === "inventory" || tab === "inventory-master") {
    title = "Purchase Inventory";
    subtitle = "Purchase-controlled inventory records by website";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="master" />
      </div>
    );
  }

  if (tab === "inventory-category") {
    title = "Inventory Category Master";
    subtitle = "Manage item categories for structured inventory";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="inventory-category" />
      </div>
    );
  }

  if (tab === "inventory-subcategory") {
    title = "Inventory Subcategory Master";
    subtitle = "Manage item subcategories for granular organization";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="inventory-subcategory" />
      </div>
    );
  }

  if (tab === "inventory-size") {
    title = "Inventory Size Master";
    subtitle = "Manage item sizes for variant control";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="inventory-size" />
      </div>
    );
  }

  if (tab === "inventory-color") {
    title = "Inventory Color Master";
    subtitle = "Manage item colors for variant control";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="inventory-color" />
      </div>
    );
  }

  if (tab === "inventory-brand") {
    title = "Inventory Brand Master";
    subtitle = "Manage item brands for catalog structure";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="inventory-brand" />
      </div>
    );
  }

  if (tab === "inventory-unit") {
    title = "Inventory Unit Master";
    subtitle = "Manage item measurement units";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="inventory-unit" />
      </div>
    );
  }

  if (tab === "inventory-supplier") {
    title = "Inventory Supplier Master";
    subtitle = "Manage preferred item suppliers";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="inventory-supplier" />
      </div>
    );
  }

  if (tab === "inventory-customer") {
    title = "Customer Master Registry";
    subtitle = "Global management of purchase accounts and customer profiles";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Customer Scope"
        />
        <CustomerManager websiteId={selectedInventoryWebsiteId} />
      </div>
    );
  }

  if (tab === "inventory-stock-in") {
    title = "Purchase Stock In";
    subtitle = "Receive and add stock into inventory";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="in" />
      </div>
    );
  }

  if (tab === "inventory-stock-out") {
    title = "Purchase Stock Out";
    subtitle = "Issue and reduce stock from inventory";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="out" />
      </div>
    );
  }

  if (tab === "inventory-adjustment") {
    title = "Purchase Inventory Adjustment";
    subtitle = "Correct stock balances with manual adjustment";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="adjust" />
      </div>
    );
  }

  if (tab === "inventory-history") {
    title = "Purchase Inventory History";
    subtitle = "Track stock movements and audit trail";
    content = (
      <div className="space-y-6">
        <PurchaseWebsiteSelector
          websites={inventoryWebsites}
          websiteId={selectedInventoryWebsiteId}
          setWebsiteId={setSelectedInventoryWebsiteId}
          label="Inventory Scope"
        />
        <InventoryManager websiteId={selectedInventoryWebsiteId} activeTab="history" />
      </div>
    );
  }

  if (tab === "settings") {
    title = "Purchase Settings";
    subtitle = "Profile and desk availability controls";
    content = <PurchaseSettings user={user} setUser={setUser} />;
  }

  return (
    <Layout title={title} subtitle={subtitle} menuItems={menuItems}>
      {content}
    </Layout>
  );
}
