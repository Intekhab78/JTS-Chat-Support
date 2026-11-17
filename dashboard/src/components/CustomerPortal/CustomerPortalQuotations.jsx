import React, { useState, useEffect } from "react";
import { api, apiUrl } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { FileText, Download, CheckCircle, XCircle, Eye, Printer, X, Clock, Wallet } from "lucide-react";
import { printPortalDocument, formatPortalMoney } from "./portalPrintUtils.js";

export default function CustomerPortalQuotations({ onStatusChange, currency = "USD", currencySettings = null, workspaceName = "Client Portal", customer = null }) {
  const formatMoney = (amount, curr) => formatPortalMoney(amount, curr || currency, currencySettings);
  const toast = useToast();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewQuote, setViewQuote] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchQuotations = async () => {
    try {
      const res = await api("/api/crm/customer-portal/quotations");
      setQuotes(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.error(err.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setViewQuote(null);
        setConfirmAction(null);
      }
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const handleDownloadPdf = async (quoteId) => {
    try {
      const result = await api(`/api/crm/customer-portal/quotations/${quoteId}/pdf`, { method: "POST" });
      if (!result?.pdfUrl) throw new Error("PDF URL unavailable");
      const cleanUrl = apiUrl(result.pdfUrl);
      const response = await fetch(cleanUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", result.pdfUrl.split("/").pop() || `quotation_${quoteId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error(err.message || "Failed to generate PDF");
    }
  };

  const handlePrintQuote = (q) => {
    if (!q) return;
    const qNum = q.quotationId || q.quoteNumber || q._id.slice(-6).toUpperCase();
    const opened = printPortalDocument({
      docType: "QUOTATION",
      docNumber: qNum,
      status: q.status || "SENT",
      workspaceName,
      issuedDate: q.createdAt,
      dueDate: q.validUntil || q.expiryDate,
      dueDateLabel: "Valid Until",
      customer: {
        name: customer?.name || "Customer",
        email: customer?.email || "",
        crn: customer?.crn || ""
      },
      items: q.items || [],
      subtotal: q.subtotal,
      discount: q.discountAmount || 0,
      tax: q.tax || 0,
      total: q.total || 0,
      notes: q.notes || "",
      formatMoney: (v) => formatMoney(v, q.currency || currency)
    });
    if (!opened) {
      toast.error("Please allow pop-ups to print this quotation");
    }
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    setProcessing(true);
    try {
      const { quoteId, action } = confirmAction;
      await api(`/api/crm/customer-portal/quotations/${quoteId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ action, reason: rejectReason })
      });
      toast.success(`Quotation ${action === "accept" ? "accepted" : "revision requested"} successfully.`);
      setConfirmAction(null);
      setRejectReason("");
      setViewQuote(null);
      await fetchQuotations();
      if (onStatusChange) onStatusChange();
    } catch (err) {
      toast.error(err.message || "Action failed");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-4 bg-white rounded-xl border border-slate-200/80 text-center text-xs text-slate-400">Loading quotations...</div>;
  }

  const pendingCount = quotes.filter((q) => q.status === "sent" || q.status === "negotiation").length;
  const acceptedCount = quotes.filter((q) => q.status === "accepted" || q.status === "converted").length;
  const totalValue = quotes.reduce((sum, q) => sum + Number(q.total || 0), 0);

  const statCards = [
    { label: "Total Quotes", value: quotes.length, icon: FileText, color: "text-indigo-600 bg-indigo-50" },
    { label: "Pending Review", value: pendingCount, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Accepted / Converted", value: acceptedCount, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
    { label: "Total Value", value: formatMoney(totalValue, currency), icon: Wallet, color: "text-slate-700 bg-slate-100" }
  ];

  return (
    <div className="space-y-3">
      {/* Mini Summary Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{card.label}</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5 truncate">{card.value}</p>
              </div>
              <div className={`p-2 rounded-xl shrink-0 ${card.color}`}>
                <Icon size={16} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">My Quotations</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Review itemized proposals, print statements, download PDFs, or approve agreements.</p>
        </div>

        {quotes.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">No quotations available yet.</div>
        ) : (
          <div className="space-y-2.5">
            {quotes.map((q) => {
              const isPending = q.status === "sent" || q.status === "negotiation";
              const expiry = q.validUntil || q.expiryDate;
              return (
                <div key={q._id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        Quote #{q.quotationId || q.quoteNumber || q._id.slice(-6).toUpperCase()}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Created: {new Date(q.createdAt).toLocaleDateString()} • Valid Until: {expiry ? new Date(expiry).toLocaleDateString() : "No expiry"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="text-right mr-1">
                      <p className="text-xs font-bold text-slate-900">{formatMoney(q.total, q.currency || currency)}</p>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        q.status === "accepted" || q.status === "converted" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        q.status === "rejected" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                        "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {q.status}
                      </span>
                    </div>

                    {isPending && (
                      <>
                        <button
                          onClick={() => setConfirmAction({ quoteId: q._id, action: "accept" })}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle size={12} /> Accept
                        </button>
                        <button
                          onClick={() => setConfirmAction({ quoteId: q._id, action: "reject" })}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <XCircle size={12} /> Revision
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setViewQuote(q)}
                      className="p-1.5 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-lg transition-colors"
                      title="View Quotation Details"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handlePrintQuote(q)}
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors"
                      title="Print Quotation"
                    >
                      <Printer size={14} />
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(q._id)}
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Quotation Modal */}
      {viewQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onClick={() => setViewQuote(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Quote #{viewQuote.quotationId || viewQuote.quoteNumber || viewQuote._id.slice(-6).toUpperCase()}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {viewQuote.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {workspaceName} • Created {new Date(viewQuote.createdAt).toLocaleDateString()} • Valid Until{" "}
                  {viewQuote.validUntil || viewQuote.expiryDate ? new Date(viewQuote.validUntil || viewQuote.expiryDate).toLocaleDateString() : "No expiry"}
                </p>
              </div>
              <button onClick={() => setViewQuote(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prepared For</span>
                  <p className="font-bold text-slate-900">{customer?.name || "Customer"}</p>
                  {customer?.email && <p className="text-[11px] text-slate-600">{customer.email}</p>}
                  {customer?.crn && <p className="text-[11px] text-slate-500">CRN: {customer.crn}</p>}
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quote Summary</span>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Currency</span>
                    <span className="font-semibold text-slate-800">{viewQuote.currency || currency}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Line Items</span>
                    <span className="font-semibold text-slate-800">{(viewQuote.items || []).length}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewQuote.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800">{it.description || it.name || "Item"}</div>
                          {it.sku && <div className="text-[10px] text-slate-400">SKU: {it.sku}</div>}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">{it.quantity || 1}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatMoney(it.price, viewQuote.currency || currency)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatMoney(it.total ?? (it.quantity || 1) * (it.price || 0), viewQuote.currency || currency)}</td>
                      </tr>
                    ))}
                    {(!viewQuote.items || viewQuote.items.length === 0) && (
                      <tr><td colSpan="4" className="px-3 py-4 text-center text-slate-400">No itemized breakdown attached.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3">
                {viewQuote.notes ? (
                  <div className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 whitespace-pre-line">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Notes</span>
                    {viewQuote.notes}
                  </div>
                ) : <div className="flex-1" />}

                <div className="sm:w-60 bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-semibold text-slate-800">{formatMoney(viewQuote.subtotal ?? viewQuote.total, viewQuote.currency || currency)}</span></div>
                  {Number(viewQuote.tax || 0) > 0 && <div className="flex justify-between text-slate-600"><span>Tax</span><span className="font-semibold text-slate-800">{formatMoney(viewQuote.tax, viewQuote.currency || currency)}</span></div>}
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1"><span>Grand Total</span><span>{formatMoney(viewQuote.total, viewQuote.currency || currency)}</span></div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-end gap-2">
              <button onClick={() => handlePrintQuote(viewQuote)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Printer size={13} /> Print Statement
              </button>
              <button onClick={() => handleDownloadPdf(viewQuote._id)} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5">
                <Download size={13} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">
                {confirmAction.action === "accept" ? "Accept Quotation" : "Request Revision / Reject"}
              </h4>
              <button onClick={() => setConfirmAction(null)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmAction.action === "accept"
                ? "Accepting this quotation confirms the agreement and automatically generates your invoice."
                : "Let our sales team know what changes you need on this quotation."}
            </p>
            {confirmAction.action === "reject" && (
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Optional: describe requested changes..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-indigo-500"
              />
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setConfirmAction(null)} className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold text-white ${
                  confirmAction.action === "accept" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {processing ? "Processing..." : confirmAction.action === "accept" ? "Confirm Accept" : "Submit Revision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
