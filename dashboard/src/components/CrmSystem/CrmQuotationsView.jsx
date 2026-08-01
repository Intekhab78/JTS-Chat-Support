import React, { useState, useEffect, useMemo } from "react";
import { Plus, Check, X, FileText, ChevronRight, Eye, RefreshCw, Send, HelpCircle, Download, Search, Filter, DollarSign, CheckCircle2, PackageCheck } from "lucide-react";
import { api, API_BASE } from "../../api/client.js";

const getCurrencySymbol = (code) => {
  const symbols = {
    USD: "$",
    EUR: "€",
    INR: "Rs. ",
    AED: "AED ",
    GBP: "£",
  };
  return symbols[String(code || "INR").toUpperCase()] || `${code} `;
};

export default function CrmQuotationsView({ websiteId }) {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [comments, setComments] = useState("");

  // Pagination & Filters State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerId: "", quotationNumber: "", discountAmount: 0, shippingCharges: 0, itemsJson: "[]"
  });

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const qWebsite = (websiteId && websiteId !== "undefined" && websiteId !== "null") ? websiteId : "";
      const quotesRes = await api(`/api/crm/quotations?websiteId=${qWebsite}`);
      const list = Array.isArray(quotesRes) ? quotesRes : (quotesRes.quotations || quotesRes.data || []);
      setQuotations(list);
      // Auto-select first quotation
      if (list.length > 0) {
        setSelectedQuote(list[0]);
      } else {
        setSelectedQuote(null);
      }
    } catch (err) {
      console.error(err);
      setQuotations([]);
      setSelectedQuote(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchQuotations();
  }, [websiteId]);

  // KPI Analytics Metrics for Quotations
  const metrics = useMemo(() => {
    const totalCount = quotations.length;
    const totalPipelineValue = quotations.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
    const convertedCount = quotations.filter(q => q.status?.toLowerCase() === "converted").length;
    const approvedCount = quotations.filter(q => q.approvalStatus?.toLowerCase() === "approved").length;

    return { totalCount, totalPipelineValue, convertedCount, approvedCount };
  }, [quotations]);

  const handleApprove = async (id) => {
    try {
      await api(`/api/crm/quotations/approve/${id}`, {
        method: "POST",
        body: JSON.stringify({ comments })
      });
      setComments("");
      setSelectedQuote(null);
      fetchQuotations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await api(`/api/crm/quotations/deny/${id}`, {
        method: "POST",
        body: JSON.stringify({ comments })
      });
      setComments("");
      setSelectedQuote(null);
      fetchQuotations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    try {
      const parsedItems = JSON.parse(createForm.itemsJson || "[]");
      await api(`/api/crm/quotations`, {
        method: "POST",
        body: JSON.stringify({
          ...createForm,
          websiteId,
          items: parsedItems
        })
      });
      setShowCreateModal(false);
      setCreateForm({ customerId: "", quotationNumber: "", discountAmount: 0, shippingCharges: 0, itemsJson: "[]" });
      fetchQuotations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConvertToOrder = async (quoteId) => {
    try {
      await api(`/api/crm/salesorders/convert/${quoteId}`, { method: "POST" });
      alert("Converted to Sales Order successfully! Sales notified and inventory reserved.");
      fetchQuotations();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filtered & Paginated Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const clientName = q.customerId?.companyName || q.customerId?.name || q.customerName || q.clientName || "";
      const quoteNum = q.quotationId || q.quoteNumber || "";
      const matchesSearch = search.trim() === "" ||
        quoteNum.toLowerCase().includes(search.toLowerCase()) ||
        clientName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || q.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [quotations, search, statusFilter]);

  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage) || 1;

  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQuotations.slice(start, start + itemsPerPage);
  }, [filteredQuotations, currentPage, itemsPerPage]);

  // Always auto-select the first quotation when paginated list changes
  useEffect(() => {
    if (paginatedQuotations.length > 0) {
      const isSelectedInPage = selectedQuote && paginatedQuotations.some(q => q._id === selectedQuote._id);
      if (!isSelectedInPage) {
        setSelectedQuote(paginatedQuotations[0]);
      }
    } else {
      setSelectedQuote(null);
    }
  }, [paginatedQuotations]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Quotations & Revisions</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Manage customer quotations, version history, and approvals</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-100 transition-all"
        >
          <Plus size={14} /> Create Quotation
        </button>
      </div>

      {/* KPI Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Total Quotations</span>
            <span className="text-lg font-black text-slate-900">{metrics.totalCount} Quotes</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Total Quote Value</span>
            <span className="text-lg font-black text-emerald-700">${metrics.totalPipelineValue.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <PackageCheck size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Converted Orders</span>
            <span className="text-lg font-black text-blue-700">{metrics.convertedCount} Quotes</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Approved Quotes</span>
            <span className="text-lg font-black text-amber-700">{metrics.approvedCount} Quotes</span>
          </div>
        </div>
      </div>

      {/* Search and Status Filter Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-[28px] shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search quotations by ID or customer name…"
            className="w-full pl-4 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full sm:w-40 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="converted">Converted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 bg-slate-50 border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quotes list */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between space-y-4 min-h-[420px]">
            <div>
              <div className="flex justify-between items-center border-b pb-3 border-slate-100">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Registered Quotations ({filteredQuotations.length})
                </h4>
                <span className="text-[10px] font-bold text-slate-400">First quotation auto-selected</span>
              </div>

              {paginatedQuotations.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-12">No quotes registered.</p>
              ) : (
                <div className="space-y-3 mt-4">
                  {paginatedQuotations.map(q => {
                    const clientName = q.customerId?.companyName || q.customerId?.name || q.customerName || q.clientName || "General Client";
                    const appStatus = q.approvalStatus && q.approvalStatus.toLowerCase() !== "none" ? q.approvalStatus : null;
                    return (
                      <div
                        key={q._id}
                        onClick={() => setSelectedQuote(q)}
                        className={`p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-all ${selectedQuote?._id === q._id ? "border-indigo-500 bg-indigo-50/20 shadow-sm" : "border-slate-100 hover:bg-slate-50/50"}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-800">{q.quotationId || q.quoteNumber}</span>
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">V{q.version || 1}</span>
                            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">{clientName}</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Val: {getCurrencySymbol(q.currency)}{q.total ? q.total.toLocaleString() : 0} • Status: <span className="text-indigo-600 font-extrabold">{q.status}</span></p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {appStatus && (
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${appStatus === "approved" ? "bg-emerald-50 text-emerald-600" : appStatus === "rejected" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>{appStatus}</span>
                          )}
                          <ChevronRight size={16} className="text-slate-400 shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredQuotations.length > 0 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-slate-600 mt-auto">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredQuotations.length)} of {filteredQuotations.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[10px] font-black uppercase transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Details & Approval actions */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between min-h-[400px]">
            {selectedQuote ? (
              <div className="space-y-5">
                {/* Header info */}
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{selectedQuote.quotationId || selectedQuote.quoteNumber}</h4>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">V{selectedQuote.version || 1}</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Date created: {selectedQuote.createdAt ? new Date(selectedQuote.createdAt).toLocaleDateString() : "—"}</p>
                  {selectedQuote.invoiceNumber && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Invoice:</span>
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5 uppercase">
                        {selectedQuote.invoiceNumber}
                      </span>
                    </div>
                  )}
                </div>

                {/* Customer Details */}
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Client Profile</span>
                  <p className="text-xs font-black text-slate-900">{selectedQuote.customerId?.companyName || selectedQuote.customerId?.name || selectedQuote.customerName || selectedQuote.clientName || "General Client"}</p>
                  {selectedQuote.customerId?.email && <p className="text-[10px] font-medium text-slate-500">{selectedQuote.customerId.email}</p>}
                  {selectedQuote.customerId?.phone && <p className="text-[10px] font-medium text-slate-500">{selectedQuote.customerId.phone}</p>}
                  {selectedQuote.customerId?.trn && <p className="text-[10px] font-bold text-slate-600">TRN: {selectedQuote.customerId.trn}</p>}
                </div>

                {/* Itemized breakdown table */}
                {selectedQuote.items && selectedQuote.items.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Line Items ({selectedQuote.items.length})</span>
                    <div className="border border-slate-100 rounded-xl overflow-hidden text-[10px]">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100/70 text-slate-500 uppercase font-black">
                          <tr>
                            <th className="p-2">Item</th>
                            <th className="p-2 text-center">Qty</th>
                            <th className="p-2 text-right">Price</th>
                            <th className="p-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                          {selectedQuote.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="p-2 line-clamp-1">{item.description || item.name || `Item ${idx + 1}`}</td>
                              <td className="p-2 text-center">{item.quantity || 1}</td>
                              <td className="p-2 text-right">{getCurrencySymbol(selectedQuote.currency)}{item.price ? item.price.toLocaleString() : 0}</td>
                              <td className="p-2 text-right font-black text-slate-900">{getCurrencySymbol(selectedQuote.currency)}{item.total ? item.total.toLocaleString() : ((item.quantity || 1) * (item.price || 0)).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="space-y-2 text-xs font-bold text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex justify-between"><span>Subtotal:</span> <span>{getCurrencySymbol(selectedQuote.currency)}{selectedQuote.subtotal ? selectedQuote.subtotal.toLocaleString() : 0}</span></div>
                  {Boolean(selectedQuote.discountAmount) && <div className="flex justify-between"><span>Discount:</span> <span className="text-rose-500">-{getCurrencySymbol(selectedQuote.currency)}{selectedQuote.discountAmount.toLocaleString()}</span></div>}
                  {Boolean(selectedQuote.shippingCharges) && <div className="flex justify-between"><span>Shipping:</span> <span>+{getCurrencySymbol(selectedQuote.currency)}{selectedQuote.shippingCharges.toLocaleString()}</span></div>}
                  <div className="flex justify-between"><span>Tax:</span> <span>+{getCurrencySymbol(selectedQuote.currency)}{selectedQuote.tax ? selectedQuote.tax.toLocaleString() : 0}</span></div>
                  <div className="flex justify-between border-t pt-2 font-black text-slate-900 text-sm"><span>Grand Total:</span> <span className="text-indigo-600">{getCurrencySymbol(selectedQuote.currency)}{selectedQuote.total ? selectedQuote.total.toLocaleString() : 0}</span></div>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Download PDF */}
                  <button
                    onClick={async () => {
                      try {
                        const result = await api(`/api/crm/quotations/${selectedQuote._id}/pdf`, { method: "POST" });
                        const cleanUrl = `${API_BASE}${result.pdfUrl}`;
                        window.open(cleanUrl, "_blank");
                      } catch (err) {
                        alert(err.message || "Failed to generate PDF");
                      }
                    }}
                    className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Download size={12} /> Download PDF
                  </button>

                  {/* Convert to Sales Order */}
                  {selectedQuote.status !== "converted" && (
                    <button
                      onClick={() => handleConvertToOrder(selectedQuote._id)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm"
                    >
                      Convert to Sales Order
                    </button>
                  )}
                </div>

                {/* Manager/Director Approvals Segment */}
                {selectedQuote.status === "pending_approval" && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Approval Comments</span>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Add authorization remarks…"
                      className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold outline-none h-16 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleReject(selectedQuote._id)} className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-all"><X size={12} /> Reject</button>
                      <button onClick={() => handleApprove(selectedQuote._id)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-all"><Check size={12} /> Approve</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-10 space-y-2">
                <FileText size={32} className="text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-wider">Select a quote to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Quotation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <form onSubmit={handleCreateQuotation} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Create Quotation</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer ID (ObjectId)</label>
              <input required value={createForm.customerId} onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Quotation Number (Leave blank to generate new)</label>
              <input value={createForm.quotationNumber} onChange={(e) => setCreateForm({ ...createForm, quotationNumber: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Order Level Discount ($)</label>
                <input type="number" required value={createForm.discountAmount} onChange={(e) => setCreateForm({ ...createForm, discountAmount: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Shipping Charges ($)</label>
                <input type="number" required value={createForm.shippingCharges} onChange={(e) => setCreateForm({ ...createForm, shippingCharges: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Items JSON List</label>
              <textarea placeholder='[{"description":"Gaming Laptop","quantity":1,"price":1200,"taxRate":18}]' value={createForm.itemsJson} onChange={(e) => setCreateForm({ ...createForm, itemsJson: e.target.value })} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold h-24 outline-none resize-none font-mono" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Save Quotation</button>
          </form>
        </div>
      )}
    </div>
  );
}
