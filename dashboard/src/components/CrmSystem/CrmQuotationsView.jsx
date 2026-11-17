import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Check,
  X,
  FileText,
  ChevronRight,
  RefreshCw,
  Download,
  Search,
  DollarSign,
  CheckCircle2,
  PackageCheck,
  Printer,
  Sparkles,
  PenTool,
  MessageCircle,
  Copy,
  ShieldCheck,
  Trash2,
  Edit3
} from "lucide-react";
import { api, apiUrl } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { exportToCSV, exportToPDF } from "../../utils/exportUtils.js";
import WhatsAppShareModal from "./WhatsAppShareModal.jsx";

const getCurrencySymbol = (code) => {
  const symbols = {
    USD: "$",
    EUR: "€",
    INR: "Rs. ",
    AED: "AED ",
    GBP: "£"
  };
  return symbols[String(code || "INR").toUpperCase()] || `${code} `;
};

const getQuoteRef = (q) =>
  q?.quotationId || q?.quotationNumber || q?.quoteNumber || q?._id?.slice(-6).toUpperCase() || "";

const EMPTY_ITEM = { description: "", quantity: 1, price: 0, taxRate: 0 };

export default function CrmQuotationsView({ websiteId }) {
  const toast = useToast();
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [comments, setComments] = useState("");

  // Superpower Modals State
  const [showAiProposalModal, setShowAiProposalModal] = useState(false);
  const [aiProposalText, setAiProposalText] = useState("");
  const [copiedProposal, setCopiedProposal] = useState(false);

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signedQuoteId, setSignedQuoteId] = useState(null);
  const signatureCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Pagination & Filters State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerId: "",
    quotationNumber: "",
    discountAmount: 0,
    shippingCharges: 0,
    items: [{ ...EMPTY_ITEM }]
  });
  const [editingQuoteId, setEditingQuoteId] = useState(null);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const hasValidWebsite =
        websiteId &&
        websiteId !== "all" &&
        websiteId !== "undefined" &&
        websiteId !== "null";
      const qs = hasValidWebsite ? `?websiteId=${websiteId}` : "";

      const [quotesRes, custRes] = await Promise.allSettled([
        api(`/api/crm/quotations${qs}`),
        api(`/api/crm/customers${qs}`)
      ]);

      const rawQuotes = quotesRes.status === "fulfilled" ? quotesRes.value : [];
      const list = Array.isArray(rawQuotes)
        ? rawQuotes
        : rawQuotes?.quotations || rawQuotes?.data || [];
      setQuotations(list);
      setSelectedQuote(list.length > 0 ? list[0] : null);

      const rawCust = custRes.status === "fulfilled" ? custRes.value : [];
      setCustomers(Array.isArray(rawCust) ? rawCust : rawCust?.customers || []);
    } catch (err) {
      toast.error(err.message || "Failed to load quotations");
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

  const metrics = useMemo(() => {
    const totalCount = quotations.length;
    const totalPipelineValue = quotations.reduce((sum, q) => sum + (Number(q.total) || 0), 0);
    const convertedCount = quotations.filter(
      (q) => q.status?.toLowerCase() === "converted"
    ).length;
    const approvedCount = quotations.filter(
      (q) => q.approvalStatus?.toLowerCase() === "approved"
    ).length;
    return { totalCount, totalPipelineValue, convertedCount, approvedCount };
  }, [quotations]);

  const handleApprove = async (id) => {
    try {
      await api(`/api/crm/quotations/approve/${id}`, {
        method: "POST",
        body: JSON.stringify({ comments })
      });
      toast.success("Quotation approved");
      setComments("");
      setSelectedQuote(null);
      fetchQuotations();
    } catch (err) {
      toast.error(err.message || "Approval failed");
    }
  };

  const handleReject = async (id) => {
    try {
      await api(`/api/crm/quotations/deny/${id}`, {
        method: "POST",
        body: JSON.stringify({ comments })
      });
      toast.success("Quotation rejected");
      setComments("");
      setSelectedQuote(null);
      fetchQuotations();
    } catch (err) {
      toast.error(err.message || "Rejection failed");
    }
  };

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    const validItems = createForm.items.filter((it) => it.description.trim());
    if (!createForm.customerId || validItems.length === 0) {
      toast.error("Select a customer and add at least one item");
      return;
    }

    setCreating(true);
    try {
      const cust = customers.find((c) => c._id === createForm.customerId);
      const resolvedWebsiteId =
        cust?.websiteId || (websiteId && websiteId !== "all" ? websiteId : undefined);
      const payload = {
        customerId: createForm.customerId,
        quotationNumber: createForm.quotationNumber.trim() || undefined,
        discountAmount: Number(createForm.discountAmount) || 0,
        shippingCharges: Number(createForm.shippingCharges) || 0,
        ...(resolvedWebsiteId ? { websiteId: resolvedWebsiteId } : {}),
        items: validItems.map((it) => ({
          description: it.description.trim(),
          quantity: Math.max(1, Number(it.quantity) || 1),
          price: Number(it.price) || 0,
          taxRate: Number(it.taxRate) || 0
        }))
      };

      if (editingQuoteId) {
        await api(`/api/crm/quotations/${editingQuoteId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Quotation updated");
      } else {
        await api(`/api/crm/quotations`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("Quotation created");
      }
      setShowCreateModal(false);
      setEditingQuoteId(null);
      setCreateForm({
        customerId: "",
        quotationNumber: "",
        discountAmount: 0,
        shippingCharges: 0,
        items: [{ ...EMPTY_ITEM }]
      });
      fetchQuotations();
    } catch (err) {
      toast.error(err.message || (editingQuoteId ? "Failed to update quotation" : "Failed to create quotation"));
    } finally {
      setCreating(false);
    }
  };

  const openEditQuotation = (quote) => {
    if (!quote) return;
    setEditingQuoteId(quote._id);
    setCreateForm({
      customerId: quote.customerId?._id || quote.customerId || "",
      quotationNumber: quote.quotationNumber || "",
      discountAmount: Number(quote.discountAmount) || 0,
      shippingCharges: Number(quote.shippingCharges) || 0,
      items:
        Array.isArray(quote.items) && quote.items.length > 0
          ? quote.items.map((it) => ({
              description: it.description || it.name || "",
              quantity: Number(it.quantity) || 1,
              price: Number(it.price) || 0,
              taxRate: Number(it.taxRate) || 0
            }))
          : [{ ...EMPTY_ITEM }]
    });
    setShowCreateModal(true);
  };

  const handleDeleteQuotation = async (quoteId) => {
    if (!quoteId) return;
    if (!window.confirm("Are you sure you want to delete this quotation?")) return;
    try {
      await api(`/api/crm/quotations/${quoteId}`, { method: "DELETE" });
      toast.success("Quotation deleted");
      if (selectedQuote?._id === quoteId) setSelectedQuote(null);
      fetchQuotations();
    } catch (err) {
      toast.error(err.message || "Failed to delete quotation");
    }
  };

  const handleConvertToOrder = async (quoteId) => {
    try {
      await api(`/api/crm/salesorders/convert/${quoteId}`, { method: "POST" });
      toast.success("Converted to Sales Order");
      fetchQuotations();
    } catch (err) {
      toast.error(err.message || "Conversion failed");
    }
  };

  const handleGenerateAiProposal = (quote) => {
    if (!quote) return;
    setSelectedQuote(quote);
    setShowAiProposalModal(true);
    setCopiedProposal(false);

    const clientName =
      quote.customerId?.companyName ||
      quote.customerId?.name ||
      quote.customerName ||
      "Valued Client";
    const quoteNum = getQuoteRef(quote);
    const sym = getCurrencySymbol(quote.currency);
    const total = (Number(quote.total) || 0).toLocaleString();
    const senderName = quote.websiteId?.name || "Sales & Solutions Team";
    const validUntilText = quote.validUntil
      ? new Date(quote.validUntil).toLocaleDateString()
      : "14 days from issuance";

    const itemsList =
      (quote.items || []).length > 0
        ? quote.items
            .map(
              (it, i) =>
                `${i + 1}. ${it.description || it.name || `Item ${i + 1}`} (Qty: ${
                  it.quantity || 1
                }) — ${sym}${Number(
                  it.total ?? (it.quantity || 1) * (it.price || 0)
                ).toLocaleString()}`
            )
            .join("\n")
        : "No line items attached.";

    const synthesizedProposal = `Subject: Commercial Proposal | Quotation #${quoteNum}

Dear ${clientName},

Please find below the commercial summary for Quotation #${quoteNum} from ${senderName}.

SCOPE & LINE ITEMS
----------------------------------------
${itemsList}

FINANCIAL SUMMARY
----------------------------------------
• Subtotal: ${sym}${Number(quote.subtotal || quote.total || 0).toLocaleString()}${
      quote.discountAmount ? `\n• Discount: -${sym}${Number(quote.discountAmount).toLocaleString()}` : ""
    }${quote.tax ? `\n• Tax: +${sym}${Number(quote.tax).toLocaleString()}` : ""}${
      quote.shippingCharges
        ? `\n• Shipping: +${sym}${Number(quote.shippingCharges).toLocaleString()}`
        : ""
    }
• Grand Total: ${sym}${total}
• Valid Until: ${validUntilText}

You can review and approve this quotation via the client portal:
${window.location.origin}/client

Warm regards,
${senderName}`;

    setAiProposalText(synthesizedProposal);
  };

  const [waModal, setWaModal] = useState({
    open: false,
    title: "",
    subtitle: "",
    phone: "",
    message: "",
    customerId: null,
    websiteId: null,
  });

  const handleSendWhatsAppQuote = async (quote) => {
    if (!quote) return;
    const phone =
      quote.customerId?.phones?.[0]?.phone ||
      quote.customerId?.whatsApp ||
      quote.customerId?.phone ||
      quote.phone ||
      "";
    const clientName = quote.customerId?.companyName || quote.customerId?.name || "Client";
    const quoteNum = getQuoteRef(quote);
    const total = `${getCurrencySymbol(quote.currency)}${(Number(quote.total) || 0).toLocaleString()}`;
    const senderName = quote.websiteId?.name || "Support";
    const resolvedPdfUrl = quote.pdfUrl ? await apiUrl(quote.pdfUrl) : "";
    const pdfLine = resolvedPdfUrl ? `\n• Quotation PDF: ${resolvedPdfUrl}` : "";

    const msg =
      `Hello ${clientName},\n\n` +
      `Here is your Quotation *#${quoteNum}* for total value *${total}* from ${senderName}.${pdfLine}\n\n` +
      `Review and sign your proposal here:\n${window.location.origin}/client\n\n` +
      `Thank you!`;

    setWaModal({
      open: true,
      title: "Share Quotation via WhatsApp",
      subtitle: `${quoteNum} · ${clientName}`,
      phone,
      message: msg,
      customerId: quote.customerId?._id || quote.customerId || null,
      websiteId: quote.websiteId?._id || quote.websiteId || websiteId || null,
    });
  };

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
    if (!canvas) return;
    if (selectedQuote?._id) {
      await api(`/api/crm/quotations/${selectedQuote._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" })
      }).catch(() => {});
      fetchQuotations();
    }
    setShowSignatureModal(false);
    toast.success(`Quotation #${getQuoteRef(selectedQuote)} digitally approved`);
  };

  const filteredQuotations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return quotations.filter((q) => {
      const clientName =
        q.customerId?.companyName || q.customerId?.name || q.customerName || q.clientName || "";
      const quoteNum = getQuoteRef(q);
      const matchesSearch =
        !term || quoteNum.toLowerCase().includes(term) || clientName.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "all" || q.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [quotations, search, statusFilter]);

  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage) || 1;
  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQuotations.slice(start, start + itemsPerPage);
  }, [filteredQuotations, currentPage, itemsPerPage]);

  useEffect(() => {
    if (paginatedQuotations.length > 0) {
      const isSelectedInPage =
        selectedQuote && paginatedQuotations.some((q) => q._id === selectedQuote._id);
      if (!isSelectedInPage) {
        setSelectedQuote(paginatedQuotations[0]);
      }
    } else {
      setSelectedQuote(null);
    }
  }, [paginatedQuotations]);

  const handleExportQuotesCSV = () => {
    if (filteredQuotations.length === 0) {
      toast.info("No quotations to export");
      return;
    }
    const data = filteredQuotations.map((q) => ({
      "Quotation #": getQuoteRef(q),
      "Client / Company":
        q.customerId?.companyName || q.customerId?.name || q.customerName || q.clientName || "-",
      "Total Amount": q.grandTotal || q.totalAmount || q.total || 0,
      Status: (q.status || "Draft").toUpperCase(),
      "Valid Until": q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "-",
      "Created Date": q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "-"
    }));
    exportToCSV(data, `Quotations_Ledger_${new Date().toISOString().slice(0, 10)}`);
    toast.success("Exported CSV");
  };

  const handleExportQuotesPDF = () => {
    if (filteredQuotations.length === 0) {
      toast.info("No quotations to export");
      return;
    }
    const data = filteredQuotations.map((q) => ({
      "Quotation #": getQuoteRef(q),
      Client: q.customerId?.companyName || q.customerId?.name || q.customerName || "-",
      Total: `${getCurrencySymbol(q.currency)}${(
        q.grandTotal ||
        q.totalAmount ||
        q.total ||
        0
      ).toLocaleString()}`,
      Status: (q.status || "Draft").toUpperCase(),
      "Valid Until": q.validUntil ? new Date(q.validUntil).toLocaleDateString() : "-"
    }));
    exportToPDF(
      data,
      `Quotations_Ledger_${new Date().toISOString().slice(0, 10)}`,
      "OPERATIONS QUOTATIONS LEDGER REPORT"
    );
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 flex flex-wrap justify-between items-center gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText size={14} />
          </div>
          <div>
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider leading-tight">
              Quotations & Revisions
            </h3>
            <p className="text-[9.5px] font-semibold text-slate-400 leading-tight">
              Customer quotes, version history, e-signatures & approvals
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={fetchQuotations}
            title="Refresh"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleExportQuotesCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={handleExportQuotesPDF}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase rounded-lg transition-colors"
          >
            <Printer size={11} /> PDF
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-[9.5px] font-black uppercase text-white rounded-lg flex items-center gap-1 shadow-sm transition-colors"
          >
            <Plus size={11} /> Create Quote
          </button>
        </div>
      </div>

      {/* Compact KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Total Quotations
            </span>
            <span className="text-sm font-black text-slate-900">{metrics.totalCount} Quotes</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Total Quote Value
            </span>
            <span className="text-sm font-black text-emerald-700">
              ${metrics.totalPipelineValue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <PackageCheck size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Converted Orders
            </span>
            <span className="text-sm font-black text-blue-700">
              {metrics.convertedCount} Quotes
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={15} />
          </div>
          <div>
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block">
              Approved Quotes
            </span>
            <span className="text-sm font-black text-amber-700">
              {metrics.approvedCount} Quotes
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white border border-slate-200/80 px-3 py-2 rounded-xl shadow-sm flex flex-wrap gap-2 items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search quotations by ID or customer name..."
            className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10.5px] font-semibold text-slate-700 outline-none focus:border-indigo-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[9.5px] font-bold text-slate-700 uppercase outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="converted">Converted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          <div className="lg:col-span-2 h-52 bg-white border border-slate-100 rounded-2xl animate-pulse" />
          <div className="h-52 bg-white border border-slate-100 rounded-2xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          {/* Quotes list */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between space-y-2.5 min-h-[300px]">
            <div>
              <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider">
                  Registered Quotations ({filteredQuotations.length})
                </h4>
                <span className="text-[9px] font-bold text-slate-400">
                  Click row to inspect
                </span>
              </div>

              {paginatedQuotations.length === 0 ? (
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider text-center py-8">
                  No quotations found.
                </p>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {paginatedQuotations.map((q) => {
                    const clientName =
                      q.customerId?.companyName ||
                      q.customerId?.name ||
                      q.customerName ||
                      q.clientName ||
                      "Client";
                    const appStatus =
                      q.approvalStatus && q.approvalStatus.toLowerCase() !== "none"
                        ? q.approvalStatus
                        : null;
                    return (
                      <div
                        key={q._id}
                        onClick={() => setSelectedQuote(q)}
                        className={`px-3 py-2 border rounded-xl flex justify-between items-center cursor-pointer transition-colors ${
                          selectedQuote?._id === q._id
                            ? "border-indigo-500 bg-indigo-50/25"
                            : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-black text-slate-800">
                              {getQuoteRef(q)}
                            </span>
                            <span className="text-[8px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              V{q.version || 1}
                            </span>
                            <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {clientName}
                            </span>
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                            Val:{" "}
                            <span className="text-slate-800 font-black">
                              {getCurrencySymbol(q.currency)}
                              {q.total ? q.total.toLocaleString() : 0}
                            </span>{" "}
                            • Status:{" "}
                            <span className="text-indigo-600 font-black">{q.status}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {appStatus && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                appStatus === "approved"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : appStatus === "rejected"
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-amber-50 text-amber-600"
                              }`}
                            >
                              {appStatus}
                            </span>
                          )}
                          <ChevronRight size={14} className="text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {filteredQuotations.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[9.5px] font-bold text-slate-500 mt-auto">
                <span>
                  {(currentPage - 1) * itemsPerPage + 1}–
                  {Math.min(currentPage * itemsPerPage, filteredQuotations.length)} of{" "}
                  {filteredQuotations.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9px] font-black uppercase"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-black">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[9px] font-black uppercase"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quote Detail Panel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between min-h-[300px]">
            {selectedQuote ? (
              <div className="space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                      {getQuoteRef(selectedQuote)}
                    </h4>
                    <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      V{selectedQuote.version || 1}
                    </span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                    Created:{" "}
                    {selectedQuote.createdAt
                      ? new Date(selectedQuote.createdAt).toLocaleDateString()
                      : "—"}
                  </p>
                  {selectedQuote.invoiceNumber && (
                    <span className="inline-block mt-1 text-[8.5px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 uppercase">
                      Invoice: {selectedQuote.invoiceNumber}
                    </span>
                  )}
                </div>

                {/* Client Profile */}
                <div className="bg-slate-50/70 border border-slate-100 p-2.5 rounded-xl space-y-0.5 text-[9.5px]">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
                    Client Profile
                  </span>
                  <p className="text-[10.5px] font-black text-slate-900 truncate">
                    {selectedQuote.customerId?.companyName ||
                      selectedQuote.customerId?.name ||
                      selectedQuote.customerName ||
                      selectedQuote.clientName ||
                      "Client"}
                  </p>
                  {selectedQuote.customerId?.email && (
                    <p className="text-slate-500 font-medium truncate">
                      {selectedQuote.customerId.email}
                    </p>
                  )}
                  {selectedQuote.customerId?.phone && (
                    <p className="text-slate-500 font-medium">{selectedQuote.customerId.phone}</p>
                  )}
                  {selectedQuote.customerId?.trn && (
                    <p className="font-bold text-slate-600">TRN: {selectedQuote.customerId.trn}</p>
                  )}
                </div>

                {/* Line Items */}
                {selectedQuote.items && selectedQuote.items.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
                      Line Items ({selectedQuote.items.length})
                    </span>
                    <div className="border border-slate-100 rounded-xl overflow-hidden text-[9.5px] max-h-32 overflow-y-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[8px]">
                          <tr>
                            <th className="px-2 py-1.5">Item</th>
                            <th className="px-2 py-1.5 text-center">Qty</th>
                            <th className="px-2 py-1.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                          {selectedQuote.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-2 py-1.5 truncate max-w-[140px]">
                                {item.description || item.name || `Item ${idx + 1}`}
                              </td>
                              <td className="px-2 py-1.5 text-center">{item.quantity || 1}</td>
                              <td className="px-2 py-1.5 text-right font-black text-slate-900">
                                {getCurrencySymbol(selectedQuote.currency)}
                                {(item.total ?? (item.quantity || 1) * (item.price || 0)).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Financial Summary */}
                <div className="space-y-1 text-[9.5px] font-bold text-slate-600 border-t border-slate-100 pt-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>
                      {getCurrencySymbol(selectedQuote.currency)}
                      {selectedQuote.subtotal ? selectedQuote.subtotal.toLocaleString() : 0}
                    </span>
                  </div>
                  {Boolean(selectedQuote.discountAmount) && (
                    <div className="flex justify-between text-rose-500">
                      <span>Discount:</span>
                      <span>
                        -{getCurrencySymbol(selectedQuote.currency)}
                        {selectedQuote.discountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {Boolean(selectedQuote.shippingCharges) && (
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span>
                        +{getCurrencySymbol(selectedQuote.currency)}
                        {selectedQuote.shippingCharges.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>
                      +{getCurrencySymbol(selectedQuote.currency)}
                      {selectedQuote.tax ? selectedQuote.tax.toLocaleString() : 0}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 font-black text-slate-900 text-[11px]">
                    <span>Grand Total:</span>
                    <span className="text-indigo-600">
                      {getCurrencySymbol(selectedQuote.currency)}
                      {selectedQuote.total ? selectedQuote.total.toLocaleString() : 0}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={() => handleGenerateAiProposal(selectedQuote)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles size={12} /> Proposal Summary
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleStartSignaturePad(selectedQuote)}
                      className="py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                    >
                      <PenTool size={11} /> {signedQuoteId === selectedQuote._id ? "Signed ✓" : "E-Sign"}
                    </button>
                    <button
                      onClick={() => handleSendWhatsAppQuote(selectedQuote)}
                      className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                    >
                      <MessageCircle size={11} /> WhatsApp
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={async () => {
                        try {
                          const result = await api(
                            `/api/crm/quotations/${selectedQuote._id}/pdf`,
                            { method: "POST" }
                          );
                          window.open(apiUrl(result.pdfUrl), "_blank");
                        } catch (err) {
                          toast.error(err.message || "Failed to generate PDF");
                        }
                      }}
                      className="py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                    >
                      <Download size={11} /> PDF
                    </button>

                    {selectedQuote.status !== "converted" && (
                      <button
                        onClick={() => handleConvertToOrder(selectedQuote._id)}
                        className="py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase transition-colors"
                      >
                        Convert Order
                      </button>
                    )}

                    {selectedQuote.status !== "converted" && (
                      <button
                        onClick={() => openEditQuotation(selectedQuote)}
                        className="py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteQuotation(selectedQuote._id)}
                      className="py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>

                {selectedQuote.status === "pending_approval" && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Approval remarks..."
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-[10.5px] font-semibold outline-none h-14 resize-none"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleReject(selectedQuote._id)}
                        className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1"
                      >
                        <X size={11} /> Reject
                      </button>
                      <button
                        onClick={() => handleApprove(selectedQuote._id)}
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-1"
                      >
                        <Check size={11} /> Approve
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-8 space-y-1.5">
                <FileText size={24} className="text-slate-200" />
                <p className="text-[9.5px] font-black uppercase tracking-wider">
                  Select a quote to view details
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Quotation Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => { setShowCreateModal(false); setEditingQuoteId(null); }}
          />
          <form
            onSubmit={handleCreateQuotation}
            className="relative w-full max-w-lg bg-white rounded-2xl p-5 shadow-2xl space-y-3 border border-slate-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {editingQuoteId ? "Edit Quotation" : "Create Quotation"}
              </h3>
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setEditingQuoteId(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Customer
                </label>
                {customers.length > 0 ? (
                  <select
                    required
                    value={createForm.customerId}
                    onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800"
                  >
                    <option value="">Select Customer...</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.companyName || c.name || c.email}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    placeholder="Customer ID (ObjectId)"
                    value={createForm.customerId}
                    onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Quote # (Optional)
                </label>
                <input
                  placeholder="Auto-generated if blank"
                  value={createForm.quotationNumber}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, quotationNumber: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Discount ({getCurrencySymbol(createForm.currency).trim()})
                </label>
                <input
                  type="number"
                  min={0}
                  value={createForm.discountAmount}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, discountAmount: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Shipping ({getCurrencySymbol(createForm.currency).trim()})
                </label>
                <input
                  type="number"
                  min={0}
                  value={createForm.shippingCharges}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, shippingCharges: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Line Items
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCreateForm({
                      ...createForm,
                      items: [...createForm.items, { ...EMPTY_ITEM }]
                    })
                  }
                  className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-0.5 hover:underline"
                >
                  <Plus size={10} /> Add Item
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {createForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                    <input
                      required
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const next = [...createForm.items];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setCreateForm({ ...createForm, items: next });
                      }}
                      className="col-span-6 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10.5px] font-semibold"
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...createForm.items];
                        next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                        setCreateForm({ ...createForm, items: next });
                      }}
                      className="col-span-2 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-[10.5px] font-semibold"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => {
                        const next = [...createForm.items];
                        next[idx] = { ...next[idx], price: Number(e.target.value) };
                        setCreateForm({ ...createForm, items: next });
                      }}
                      className="col-span-3 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-[10.5px] font-semibold"
                    />
                    <button
                      type="button"
                      disabled={createForm.items.length === 1}
                      onClick={() =>
                        setCreateForm({
                          ...createForm,
                          items: createForm.items.filter((_, i) => i !== idx)
                        })
                      }
                      className="col-span-1 p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowCreateModal(false); setEditingQuoteId(null); }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-[10px] font-black uppercase"
              >
                {creating ? "Saving..." : editingQuoteId ? "Update Quotation" : "Save Quotation"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Proposal Summary Modal */}
      {showAiProposalModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-3 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Commercial Proposal Summary
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400">
                    Generated from Quotation #{getQuoteRef(selectedQuote)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiProposalModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <textarea
              value={aiProposalText}
              onChange={(e) => setAiProposalText(e.target.value)}
              rows={11}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-[10.5px] font-medium text-slate-800 outline-none font-mono leading-relaxed resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(aiProposalText);
                  setCopiedProposal(true);
                  toast.success("Copied proposal");
                  setTimeout(() => setCopiedProposal(false), 2000);
                }}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1.5 ${
                  copiedProposal
                    ? "bg-emerald-600 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {copiedProposal ? <Check size={12} /> : <Copy size={12} />}
                {copiedProposal ? "Copied" : "Copy Proposal"}
              </button>

              <button
                onClick={() => {
                  handleSendWhatsAppQuote(selectedQuote);
                  setShowAiProposalModal(false);
                }}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1.5"
              >
                <MessageCircle size={12} /> WhatsApp
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Client Digital E-Signature Pad Modal */}
      {showSignatureModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <PenTool size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Digital E-Signature
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400">
                    Authorize #{getQuoteRef(selectedQuote)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative">
              <canvas
                ref={signatureCanvasRef}
                width={420}
                height={150}
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
                className="w-full h-[150px] cursor-crosshair block bg-white"
              />
              <span className="absolute bottom-1.5 right-2.5 text-[8.5px] font-black text-slate-300 uppercase pointer-events-none">
                Sign Above
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClearSignature}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSaveSignature}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={12} /> Authorize & Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <WhatsAppShareModal
        isOpen={waModal.open}
        onClose={() => setWaModal((prev) => ({ ...prev, open: false }))}
        title={waModal.title}
        subtitle={waModal.subtitle}
        initialPhone={waModal.phone}
        initialMessage={waModal.message}
        customerId={waModal.customerId}
        websiteId={waModal.websiteId}
      />
    </div>
  );
}
