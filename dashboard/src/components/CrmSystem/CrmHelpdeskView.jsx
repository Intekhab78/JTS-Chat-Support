import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ShieldAlert,
  Award,
  Inbox,
  Plus,
  RefreshCw,
  FileText,
  Download,
  Printer,
  Search,
  X,
  Headphones,
  Edit3,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { api } from "../../api/client.js";
import { formatCurrency, getCurrencySymbol } from "../../utils/currencyFormatter.js";
import { useToast } from "../../context/ToastContext.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

const EMPTY_ASSET_FORM = {
  customerId: "",
  name: "",
  serialNumber: "",
  value: 0,
  durationMonths: 12
};

export default function CrmHelpdeskView({ websiteId }) {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [assets, setAssets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningSla, setRunningSla] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);

  const [ticketSearch, setTicketSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [assetForm, setAssetForm] = useState(EMPTY_ASSET_FORM);
  const [ticketPage, setTicketPage] = useState(1);
  const TICKETS_PER_PAGE = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = websiteId && websiteId !== "all" ? `?websiteId=${websiteId}` : "";
      const [ticketRes, feedbackRes, assetRes, customerRes] = await Promise.allSettled([
        api(`/api/tickets${qs}`),
        api(`/api/crm/feedback${qs}`),
        api(`/api/crm/assets${qs}`),
        api(`/api/crm/customers${qs}`)
      ]);

      setTickets(
        ticketRes.status === "fulfilled" && Array.isArray(ticketRes.value?.tickets)
          ? ticketRes.value.tickets
          : Array.isArray(ticketRes.value)
          ? ticketRes.value
          : []
      );
      setFeedback(
        feedbackRes.status === "fulfilled" && Array.isArray(feedbackRes.value)
          ? feedbackRes.value
          : []
      );
      setAssets(
        assetRes.status === "fulfilled" && Array.isArray(assetRes.value)
          ? assetRes.value
          : []
      );
      setCustomers(
        customerRes.status === "fulfilled" && Array.isArray(customerRes.value)
          ? customerRes.value
          : []
      );
    } catch (err) {
      toast.error(err.message || "Failed to load helpdesk data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const stats = useMemo(() => {
    const openCount = tickets.filter(
      (t) => !["closed", "resolved"].includes((t.status || "").toLowerCase())
    ).length;
    const escalatedCount = tickets.filter((t) => Number(t.escalationLevel || 0) > 0).length;
    const avgScore =
      feedback.length > 0
        ? (
            feedback.reduce((sum, f) => sum + Number(f.score || 0), 0) / feedback.length
          ).toFixed(1)
        : "—";
    const totalAssetValue = assets.reduce((sum, a) => sum + Number(a.value || 0), 0);
    return { openCount, escalatedCount, avgScore, totalAssetValue };
  }, [tickets, feedback, assets]);

  const filteredTickets = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    return tickets.filter((t) => {
      const st = (t.status || "open").toLowerCase();
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (!q) return true;
      return (
        (t.subject || "").toLowerCase().includes(q) ||
        (t.ticketId || "").toLowerCase().includes(q) ||
        (t.priority || "").toLowerCase().includes(q)
      );
    });
  }, [tickets, ticketSearch, statusFilter]);

  const totalTicketPages = Math.max(1, Math.ceil(filteredTickets.length / TICKETS_PER_PAGE));
  const paginatedTickets = useMemo(() => {
    const start = (ticketPage - 1) * TICKETS_PER_PAGE;
    return filteredTickets.slice(start, start + TICKETS_PER_PAGE);
  }, [filteredTickets, ticketPage]);

  useEffect(() => {
    setTicketPage(1);
  }, [ticketSearch, statusFilter, websiteId]);

  const handleEscalateSla = async () => {
    setRunningSla(true);
    try {
      const res = await api(`/api/crm/helpdesk/escalate-cron`, { method: "POST" });
      toast.success(res?.message || "SLA audit complete");
      fetchData();
    } catch (err) {
      toast.error(err.message || "SLA audit failed");
    } finally {
      setRunningSla(false);
    }
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    setSavingAsset(true);
    try {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + Number(assetForm.durationMonths || 12));

      if (editingAssetId) {
        await api(`/api/crm/assets/${editingAssetId}`, {
          method: "PUT",
          body: JSON.stringify({
            ...assetForm,
            ...(websiteId && websiteId !== "all" ? { websiteId } : {}),
            warrantyExpiry: expiry
          })
        });
        toast.success("Asset updated");
      } else {
        await api(`/api/crm/assets`, {
          method: "POST",
          body: JSON.stringify({
            ...assetForm,
            ...(websiteId && websiteId !== "all" ? { websiteId } : {}),
            warrantyExpiry: expiry
          })
        });
        toast.success("Asset registered");
      }
      setShowAssetForm(false);
      setEditingAssetId(null);
      setAssetForm(EMPTY_ASSET_FORM);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to save asset");
    } finally {
      setSavingAsset(false);
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm("Delete this customer asset?")) return;
    try {
      await api(`/api/crm/assets/${assetId}`, { method: "DELETE" });
      toast.success("Asset deleted");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete asset");
    }
  };

  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      toast.info("No tickets to export");
      return;
    }
    const data = filteredTickets.map((t) => ({
      "Ticket ID": t.ticketId || t._id,
      Subject: t.subject || "-",
      Priority: (t.priority || "Normal").toUpperCase(),
      "Escalation Level": t.escalationLevel || 0,
      Status: (t.status || "Open").toUpperCase(),
      "Created At": t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "-"
    }));
    exportToCSV(data, `Helpdesk_Tickets_${new Date().toISOString().slice(0, 10)}`);
    toast.success("Exported CSV");
  };

  const handleExportPDF = () => {
    if (filteredTickets.length === 0) {
      toast.info("No tickets to export");
      return;
    }
    const data = filteredTickets.map((t) => ({
      "Ticket ID": t.ticketId || t._id,
      Subject: t.subject || "-",
      Priority: (t.priority || "Normal").toUpperCase(),
      Status: (t.status || "Open").toUpperCase()
    }));
    exportToPDF(
      data,
      `Helpdesk_Tickets_${new Date().toISOString().slice(0, 10)}`,
      "HELPDESK TICKETS & SLA REPORT"
    );
  };

  return (
    <div className="space-y-3">
      {/* Compact Header & Actions */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Headphones size={14} />
          </div>
          <div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider leading-tight">
              Helpdesk & SLA Console
            </h3>
            <p className="text-[9.5px] font-semibold text-slate-400 leading-tight">
              Tickets, SLA escalations, CSAT feedback & customer assets
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={fetchData}
            title="Refresh"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowAssetForm(true)}
            className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-[9.5px] font-black uppercase text-slate-700 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Plus size={11} /> Register Asset
          </button>
          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase rounded-lg flex items-center gap-1 transition-colors"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase rounded-lg flex items-center gap-1 transition-colors"
          >
            <Printer size={11} /> PDF
          </button>
          <button
            onClick={handleEscalateSla}
            disabled={runningSla}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-[9.5px] font-black uppercase text-white rounded-lg flex items-center gap-1 transition-colors"
          >
            <RefreshCw size={11} className={runningSla ? "animate-spin" : ""} />
            {runningSla ? "Auditing..." : "Run SLA Audit"}
          </button>
        </div>
      </div>

      {/* Compact Real-Time KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm">
          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Open / Total Tickets</p>
          <p className="text-base font-black text-slate-900 mt-0.5">
            {stats.openCount} <span className="text-[10px] font-bold text-slate-400">/ {tickets.length}</span>
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm">
          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Escalated SLA</p>
          <p className={`text-base font-black mt-0.5 ${stats.escalatedCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {stats.escalatedCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm">
          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Avg CSAT Score</p>
          <p className="text-base font-black text-indigo-600 mt-0.5">
            {stats.avgScore}
            <span className="text-[9.5px] font-bold text-slate-400 ml-1">({feedback.length} surveys)</span>
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2.5 shadow-sm">
          <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Customer Assets</p>
          <p className="text-base font-black text-emerald-600 mt-0.5">
            {assets.length}
            <span className="text-[9.5px] font-bold text-slate-400 ml-1">(${stats.totalAssetValue.toLocaleString()})</span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          <div className="lg:col-span-2 h-48 bg-white border border-slate-100 rounded-2xl animate-pulse" />
          <div className="h-48 bg-white border border-slate-100 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          {/* Active SLA Tickets */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 border-slate-100">
              <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Inbox size={13} className="text-indigo-500" /> Active SLA Tickets ({filteredTickets.length})
              </h4>

              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2 py-1 text-[10px] font-semibold text-slate-700 w-36 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9.5px] font-bold text-slate-600 uppercase focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {filteredTickets.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-wider">
                  No tickets found.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
                {paginatedTickets.map((t) => {
                  const escLevel = Number(t.escalationLevel || 0);
                  const st = (t.status || "open").toLowerCase();
                  return (
                    <div
                      key={t._id}
                      className="px-3 py-2 border border-slate-100 rounded-xl flex justify-between items-center gap-2 hover:border-indigo-200 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="text-[11px] font-black text-slate-800 truncate">
                            {t.subject || "Untitled Ticket"}
                          </h5>
                          {t.ticketId && (
                            <span className="text-[9px] font-bold text-slate-400 shrink-0">
                              #{t.ticketId}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                          Priority: <span className="text-slate-600">{t.priority || "normal"}</span>
                          {escLevel > 0 && (
                            <span className="ml-1.5 text-rose-600 font-black">• SLA L{escLevel}</span>
                          )}
                          {t.createdAt && (
                            <span className="ml-1.5">• {new Date(t.createdAt).toLocaleDateString()}</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                            st === "open"
                              ? "bg-indigo-50 text-indigo-600"
                              : st === "resolved" || st === "closed"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {t.status || "open"}
                        </span>
                        <button
                          onClick={() =>
                            exportSingleRecordPDF(
                              `HELPDESK TICKET REPORT - ${t.ticketId || t._id}`,
                              {
                                "Ticket ID": t.ticketId || t._id,
                                Subject: t.subject || "-",
                                "Priority Level": (t.priority || "NORMAL").toUpperCase(),
                                "Escalation Level": escLevel,
                                "Current Status": (t.status || "OPEN").toUpperCase(),
                                "Created Date": t.createdAt
                                  ? new Date(t.createdAt).toLocaleDateString()
                                  : "-"
                              },
                              `Ticket_${t.ticketId || t._id}`
                            )
                          }
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Export Single Ticket PDF"
                        >
                          <Printer size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {totalTicketPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[9.5px] font-bold text-slate-400">
                  Page {ticketPage} of {totalTicketPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={ticketPage === 1}
                    onClick={() => setTicketPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    disabled={ticketPage === totalTicketPages}
                    onClick={() => setTicketPage((p) => Math.min(totalTicketPages, p + 1))}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: CSAT Feedback & Customer Assets */}
          <div className="space-y-2.5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm space-y-2">
              <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider border-b pb-2 border-slate-100 flex items-center gap-1.5">
                <Award size={13} className="text-indigo-500" /> CSAT & NPS Feedback ({feedback.length})
              </h4>
              {feedback.length === 0 ? (
                <p className="text-slate-400 font-bold text-[9.5px] uppercase tracking-wider text-center py-4">
                  No feedback surveys yet.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {feedback.slice(0, 6).map((f) => (
                    <div
                      key={f._id}
                      className="px-2.5 py-2 bg-slate-50/70 border border-slate-100 rounded-xl flex justify-between items-center gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-800 truncate">
                          {f.customerId?.name || "Customer"}
                        </p>
                        {f.comment && (
                          <p className="text-[9px] text-slate-500 italic truncate">"{f.comment}"</p>
                        )}
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9.5px] font-black shrink-0">
                        {f.score}/10
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm space-y-2">
              <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider border-b pb-2 border-slate-100 flex items-center gap-1.5">
                <FileText size={13} className="text-indigo-500" /> Customer Assets ({assets.length})
              </h4>
              {assets.length === 0 ? (
                <p className="text-slate-400 font-bold text-[9.5px] uppercase tracking-wider text-center py-4">
                  No assets registered.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {assets.map((a) => (
                    <div
                      key={a._id}
                      className="px-2.5 py-2 border border-slate-100 rounded-xl flex justify-between items-center gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-800 truncate">{a.name}</p>
                        <p className="text-[8.5px] font-bold text-slate-400 uppercase">
                          S/N: {a.serialNumber}
                          {a.warrantyExpiry && ` • Exp ${new Date(a.warrantyExpiry).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[9.5px] font-black text-indigo-600">
                          {formatCurrency(Number(a.value || 0))}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAssetId(a._id);
                            setAssetForm({
                              customerId: a.customerId?._id || a.customerId || "",
                              name: a.name || "",
                              serialNumber: a.serialNumber || "",
                              value: Number(a.value) || 0,
                              durationMonths: Number(a.durationMonths) || 12
                            });
                            setShowAssetForm(true);
                          }}
                          className="p-1 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600"
                          title="Edit Asset"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(a._id)}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                          title="Delete Asset"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Asset Form Modal */}
      {showAssetForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => { setShowAssetForm(false); setEditingAssetId(null); }}
          />
          <form
            onSubmit={handleCreateAsset}
            className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-3 border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {editingAssetId ? "Edit Customer Asset" : "Register Customer Asset"}
              </h3>
              <button
                type="button"
                onClick={() => { setShowAssetForm(false); setEditingAssetId(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Customer
              </label>
              {customers.length > 0 ? (
                <select
                  required
                  value={assetForm.customerId}
                  onChange={(e) => setAssetForm({ ...assetForm, customerId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name || c.email || c._id} {c.email ? `(${c.email})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  required
                  placeholder="Customer ID (ObjectId)"
                  value={assetForm.customerId}
                  onChange={(e) => setAssetForm({ ...assetForm, customerId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Asset Name
              </label>
              <input
                required
                placeholder="e.g. Dell PowerEdge Server"
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Serial Number
              </label>
              <input
                required
                placeholder="SN-000123"
                value={assetForm.serialNumber}
                onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Value ({getCurrencySymbol()})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={assetForm.value}
                  onChange={(e) => setAssetForm({ ...assetForm, value: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Warranty (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={assetForm.durationMonths}
                  onChange={(e) =>
                    setAssetForm({ ...assetForm, durationMonths: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowAssetForm(false); setEditingAssetId(null); }}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAsset}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-[10px] font-black uppercase"
              >
                {savingAsset ? "Saving..." : editingAssetId ? "Update Asset" : "Save Asset"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
