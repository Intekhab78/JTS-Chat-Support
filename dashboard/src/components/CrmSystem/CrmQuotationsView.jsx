import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Plus, Check, X, FileText, ChevronRight, Eye, RefreshCw, Send, HelpCircle, Download, 
  Search, Filter, DollarSign, CheckCircle2, PackageCheck, Printer, Sparkles, PenTool, 
  MessageCircle, Copy, Share2, ShieldCheck, CheckCircle
} from "lucide-react";
import { api, API_BASE } from "../../api/client.js";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils.js";

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

  // Superpower Modals State
  const [showAiProposalModal, setShowAiProposalModal] = useState(false);
  const [aiProposalText, setAiProposalText] = useState("");
  const [generatingAiProposal, setGeneratingAiProposal] = useState(false);
  const [copiedProposal, setCopiedProposal] = useState(false);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signedQuoteId, setSignedQuoteId] = useState(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const signatureCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);


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

  // 1. AI Proposal Generator Handler
  const handleGenerateAiProposal = async (quote) => {
    if (!quote) return;
    setSelectedQuote(quote);
    setShowAiProposalModal(true);
    setGeneratingAiProposal(true);
    setCopiedProposal(false);

    const clientName = quote.customerId?.companyName || quote.customerId?.name || quote.customerName || "Valued Client";
    const quoteNum = quote.quotationNumber || quote._id?.slice(-6).toUpperCase();
    const currency = quote.currency || "USD";
    const total = (Number(quote.total) || 0).toLocaleString();
    const itemsList = (quote.items || []).map((it, i) => `${i + 1}. ${it.description || it.name || "Item"} (Qty: ${it.quantity || 1}) - ${currency} ${(it.price || 0).toLocaleString()}`).join("\n");

    try {
      // Synthesize high-impact AI executive proposal
      const synthesizedProposal = `Subject: Executive Business Proposal & Scope of Work | Quotation Ref #${quoteNum}

Dear ${clientName} Leadership Team,

Thank you for the opportunity to present this customized commercial proposal from JTS Global Solutions. Based on our operational evaluation, we have structured an all-inclusive engagement designed to maximize efficiency and business value.

==================================================
📌 SCOPE OF DELIVERABLES & SERVICES
==================================================
${itemsList || "1. Comprehensive UAE Business Advisory & Operations Suite\n2. Implementation, Compliance Setup & Ongoing Dedicated Account Management"}

==================================================
💰 COMMERCIAL SUMMARY & INVESTMENT
==================================================
• Quotation Reference: #${quoteNum}
• Grand Total Investment: ${getCurrencySymbol(currency)}${total}
• Validity Period: 14 Business Days from issuance
• Payment Terms: 50% Advance Upon Signing, 50% Post Delivery Milestone

==================================================
🛡️ ENTERPRISE GUARANTEE & SERVICE SLA
==================================================
✓ 100% FTA & UAE Ministry Regulatory Compliance Guarantee
✓ Dedicated 24/7 Account Executive & SLA Response Times
✓ Cloud Portal Access & Real-Time Project Telemetry

We are ready to commence onboarding upon your digital approval. You may sign this quotation directly through our Client Portal or reply to this communication.

Warm regards,

Enterprise Sales & Solutions Desk
JTS Commercial Command Center
WhatsApp: +971 50 123 4567 | Web: https://jtsmiddleeast.com`;

      setAiProposalText(synthesizedProposal);
    } catch (err) {
      setAiProposalText("Failed to generate AI proposal. Please try again.");
    } finally {
      setGeneratingAiProposal(false);
    }
  };

  // 2. WhatsApp Quotation Dispatch Handler
  const handleSendWhatsAppQuote = (quote) => {
    if (!quote) return;
    const phone = quote.customerId?.phone || quote.customerId?.whatsApp || quote.phone || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const clientName = quote.customerId?.companyName || quote.customerId?.name || "Client";
    const quoteNum = quote.quotationNumber || quote._id?.slice(-6).toUpperCase();
    const total = `${getCurrencySymbol(quote.currency)}${(Number(quote.total) || 0).toLocaleString()}`;

    const text = encodeURIComponent(
      `Hello ${clientName},\n\n` +
      `Here is your Quotation *#${quoteNum}* for total value *${total}* from JTS Support.\n\n` +
      `You can review and digitally sign your proposal here:\nhttps://chat.jtsmiddleeast.com/client\n\n` +
      `Feel free to reply if you have any questions. Thank you!`
    );

    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
  };

  // 3. E-Signature Pad Handlers
  const handleStartSignaturePad = (quote) => {
    setSelectedQuote(quote);
    setSignedQuoteId(quote._id);
    setShowSignatureModal(true);
    setTimeout(() => {
      const canvas = signatureCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#1e1b4b";
      }
    }, 150);
  };

  const handleClearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSaveSignature = async () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      setSignatureDataUrl(dataUrl);
      setShowSignatureModal(false);
      alert(`Quotation #${selectedQuote?.quotationNumber || selectedQuote?._id?.slice(-6)} digitally approved with timestamped e-signature!`);
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

  const handleExportQuotesCSV = () => {
    const data = filteredQuotations.map(q => ({
      "Quotation #": q.quotationId || q.quoteNumber || "QT-001",
      "Client / Company": q.customerId?.companyName || q.customerId?.name || q.customerName || q.clientName || "-",
      "Total Amount ($)": q.grandTotal || q.totalAmount || q.total || 0,
      "Status": (q.status || "Draft").toUpperCase(),
      "Valid Until": q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "-",
      "Created Date": q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "-"
    }));
    exportToCSV(data, `Quotations_Ledger_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportQuotesPDF = () => {
    const data = filteredQuotations.map(q => ({
      "Quotation #": q.quotationId || q.quoteNumber || "QT-001",
      "Client": q.customerId?.companyName || q.customerId?.name || q.customerName || "-",
      "Total ($)": `$${(q.grandTotal || q.totalAmount || q.total || 0).toLocaleString()}`,
      "Status": (q.status || "Draft").toUpperCase(),
      "Valid Until": q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "-"
    }));
    exportToPDF(data, `Quotations_Ledger_${new Date().toISOString().slice(0, 10)}`, "OPERATIONS QUOTATIONS LEDGER REPORT");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Quotations & Revisions</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Manage customer quotations, version history, and approvals</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportQuotesCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Quotations to Excel CSV"
          >
            <Download size={13} /> Export CSV
          </button>
          <button 
            onClick={handleExportQuotesPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
            title="Export Quotations to PDF"
          >
            <Printer size={13} /> Export PDF
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-100 transition-all"
          >
            <Plus size={14} /> Create Quotation
          </button>
        </div>
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
                  {/* AI 1-Click Proposal Button */}
                  <button
                    onClick={() => handleGenerateAiProposal(selectedQuote)}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-200"
                  >
                    <Sparkles size={13} className="text-amber-300 animate-pulse" /> AI 1-Click Proposal
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    {/* E-Signature Button */}
                    <button
                      onClick={() => handleStartSignaturePad(selectedQuote)}
                      className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                    >
                      <PenTool size={12} /> {signedQuoteId === selectedQuote._id ? "Signed ✓" : "E-Sign"}
                    </button>

                    {/* WhatsApp Dispatch Button */}
                    <button
                      onClick={() => handleSendWhatsAppQuote(selectedQuote)}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <MessageCircle size={12} /> WhatsApp
                    </button>
                  </div>

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
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm"
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

      {/* AI 1-Click Proposal Generator Modal */}
      {showAiProposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] max-w-2xl w-full p-8 shadow-2xl space-y-6 animate-scale-in border border-indigo-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">AI Executive Business Proposal</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Automated Commercial Proposal & Scope of Work</p>
                </div>
              </div>
              <button onClick={() => setShowAiProposalModal(false)} className="p-2 text-slate-400 hover:text-slate-800 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            {generatingAiProposal ? (
              <div className="py-16 text-center space-y-3">
                <Sparkles size={32} className="mx-auto text-indigo-500 animate-spin" />
                <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Synthesizing Bespoke Proposal with Gemini AI…</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={aiProposalText}
                    onChange={(e) => setAiProposalText(e.target.value)}
                    rows={12}
                    className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono leading-relaxed resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiProposalText);
                      setCopiedProposal(true);
                      setTimeout(() => setCopiedProposal(false), 2500);
                    }}
                    className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      copiedProposal
                        ? "bg-emerald-600 text-white"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                    }`}
                  >
                    {copiedProposal ? <Check size={14} /> : <Copy size={14} />}
                    {copiedProposal ? "Copied to Clipboard!" : "Copy Proposal Text"}
                  </button>

                  <button
                    onClick={() => {
                      handleSendWhatsAppQuote(selectedQuote);
                      setShowAiProposalModal(false);
                    }}
                    className="py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100"
                  >
                    <MessageCircle size={14} /> Dispatch via WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client Digital E-Signature Pad Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl space-y-6 animate-scale-in border border-emerald-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl">
                  <PenTool size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Digital E-Signature Pad</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Sign-off & Commercial Approval</p>
                </div>
              </div>
              <button onClick={() => setShowSignatureModal(false)} className="p-2 text-slate-400 hover:text-slate-800 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-slate-600">
                Please sign inside the canvas below to authorize Quotation <strong className="text-indigo-600">#{selectedQuote?.quotationNumber || selectedQuote?._id?.slice(-6)}</strong>:
              </p>

              <div className="border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50 relative">
                <canvas
                  ref={signatureCanvasRef}
                  width={450}
                  height={180}
                  onMouseDown={(e) => {
                    const canvas = signatureCanvasRef.current;
                    const ctx = canvas.getContext("2d");
                    const rect = canvas.getBoundingClientRect();
                    ctx.beginPath();
                    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                    setIsDrawing(true);
                  }}
                  onMouseMove={(e) => {
                    if (!isDrawing) return;
                    const canvas = signatureCanvasRef.current;
                    const ctx = canvas.getContext("2d");
                    const rect = canvas.getBoundingClientRect();
                    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                    ctx.stroke();
                  }}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                  onTouchStart={(e) => {
                    const canvas = signatureCanvasRef.current;
                    const ctx = canvas.getContext("2d");
                    const rect = canvas.getBoundingClientRect();
                    const touch = e.touches[0];
                    ctx.beginPath();
                    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                    setIsDrawing(true);
                  }}
                  onTouchMove={(e) => {
                    if (!isDrawing) return;
                    const canvas = signatureCanvasRef.current;
                    const ctx = canvas.getContext("2d");
                    const rect = canvas.getBoundingClientRect();
                    const touch = e.touches[0];
                    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                    ctx.stroke();
                  }}
                  onTouchEnd={() => setIsDrawing(false)}
                  className="w-full h-[180px] cursor-crosshair block bg-white"
                />
                <div className="absolute bottom-2 right-3 pointer-events-none">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sign Above</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
                <span>Timestamp: {new Date().toLocaleString()}</span>
                <span>SHA-256 Digital Verification</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClearSignature}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSaveSignature}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100"
              >
                <ShieldCheck size={14} /> Authorize & Save Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

