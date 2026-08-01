import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, User, Mail, Phone, Calendar, DollarSign, Clock, FileText, CheckCircle2,
  Trash2, Plus, Edit3, Eye, ArrowLeft, Paperclip, MessageSquare, AlertCircle, BookOpen, Search, Filter, Download, Send, Globe, Building2, ShieldCheck, Tag, Layers, Check, CheckCircle, ChevronRight, ChevronLeft, Upload, File, Share2, MoreVertical, AlertTriangle, Star, Save, RefreshCw, Printer
} from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCurrency } from "../../context/CurrencyContext.jsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PROFILE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "services", label: "Services" },
  { id: "corporate_tax", label: "Corporate Tax" },
  { id: "vat_compliance", label: "VAT Compliance" },
  { id: "trade_license", label: "Trade License" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "timeline", label: "Timeline" },
  { id: "deals", label: "Deals" },
  { id: "tasks", label: "Tasks" },
  { id: "meetings", label: "Meetings" },
  { id: "calls", label: "Calls" },
  { id: "emails", label: "Emails" },
  { id: "documents", label: "Documents" },
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "notes", label: "Notes" }
];

export default function Customer360View({ customerId, websiteId, onClose }) {
  const containerRef = useRef(null);
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const isReadOnly = user?.role === "management";
  const [customer, setCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Tab Data States
  const [timeline, setTimeline] = useState([]);
  const [timelineSearch, setTimelineSearch] = useState("");
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [deals, setDeals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [calls, setCalls] = useState([]);
  const [emails, setEmails] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  // Form states for modals/actions
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", dueAt: "", notes: "", priority: "medium" });

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ title: "", startAt: "", endAt: "", agenda: "", location: "" });

  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({ name: "", category: "Trade License", fileUrl: "" });

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    serviceName: "Corporate Tax Registration",
    serviceCategory: "Compliance",
    workStatus: "Pending",
    priority: "Medium",
    dueDate: "",
    paymentStatus: "Pending",
    remarks: ""
  });

  const handleOpenServiceModal = () => {
    setShowServiceModal(true);
  };

  const handleAddServiceSubmit = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/${customerId}/services`, {
        method: "POST",
        body: JSON.stringify(serviceForm)
      });
      setShowServiceModal(false);
      fetchProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const [portalAccess, setPortalAccess] = useState({ active: false, email: "" });
  const [portalLoading, setPortalLoading] = useState(true);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/${customerId}`);
      setCustomer(res.customer || res);
      if (res.tasks) setTasks(res.tasks);
      if (res.activity) setTimeline(res.activity);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPortalAccessStatus = async () => {
    setPortalLoading(true);
    try {
      const res = await api(`/api/crm/${customerId}/portal-access`);
      setPortalAccess(res || { active: false, email: "" });
    } catch (err) {
      console.error(err);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleGrantPortalAccess = async () => {
    if (!window.confirm("Are you sure you want to grant Client Portal access for this customer?")) return;
    try {
      const res = await api(`/api/crm/${customerId}/portal-access`, { method: "POST" });
      alert(res.message || "Portal access granted.");
      fetchPortalAccessStatus();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRevokePortalAccess = async () => {
    if (!window.confirm("Are you sure you want to revoke Client Portal access? This will delete their login credentials.")) return;
    try {
      const res = await api(`/api/crm/${customerId}/portal-access`, { method: "DELETE" });
      alert(res.message || "Portal access revoked.");
      fetchPortalAccessStatus();
    } catch (err) {
      alert(err.message);
    }
  };

  const [teamMembers, setTeamMembers] = useState([]);
  const [quickNoteText, setQuickNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await api(`/api/users?role=all`);
        setTeamMembers(Array.isArray(res) ? res : (res.users || []));
      } catch { /* silent */ }
    };
    fetchAgents();
  }, []);

  const handleUpdateCustomerFields = async (fields) => {
    try {
      const updated = await api(`/api/crm/${customerId}`, {
        method: "PATCH",
        body: JSON.stringify(fields)
      });
      setCustomer(prev => ({ ...prev, ...fields, ...(updated.customer || updated) }));
    } catch (err) {
      alert(err.message || "Failed to update record");
    }
  };

  const handleAddQuickNote = async (e) => {
    if (e) e.preventDefault();
    if (!quickNoteText.trim()) return;
    setSavingNote(true);
    try {
      await api(`/api/crm/${customerId}/notes`, {
        method: "POST",
        body: JSON.stringify({ text: quickNoteText.trim() })
      });
      setQuickNoteText("");
      fetchProfile();
    } catch (err) {
      alert(err.message || "Failed to save note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleUpdateWorkStatus = async (newStatus) => {
    handleUpdateCustomerFields({ workStatus: newStatus });
  };

  const handleUpdatePaymentStatus = async (newStatus) => {
    handleUpdateCustomerFields({ paymentStatus: newStatus });
  };

  const fetchTabData = async () => {
    try {
      if (activeTab === "timeline") {
        const res = await api(`/api/crm/${customerId}/activity`);
        setTimeline(res || []);
      } else if (activeTab === "deals") {
        const res = await api(`/api/crm/deals?customerId=${customerId}&websiteId=${websiteId}`);
        setDeals(res.deals || res);
      } else if (activeTab === "tasks") {
        const res = await api(`/api/crm/tasks/my?customerId=${customerId}`); // standard fallback
        setTasks(Array.isArray(res) ? res : (res.tasks || []));
      } else if (activeTab === "meetings") {
        const res = await api(`/api/crm/meetings?customerId=${customerId}&websiteId=${websiteId}`);
        setMeetings(res.meetings || []);
      } else if (activeTab === "calls") {
        const res = await api(`/api/crm/calls?customerId=${customerId}&websiteId=${websiteId}`);
        setCalls(res.calls || []);
      } else if (activeTab === "emails") {
        const res = await api(`/api/crm/emails?customerId=${customerId}&websiteId=${websiteId}`);
        setEmails(res.emails || []);
      } else if (activeTab === "documents") {
        const res = await api(`/api/crm/documents?customerId=${customerId}&websiteId=${websiteId}`);
        setDocuments(res.documents || []);
      } else if (activeTab === "invoices") {
        const res = await api(`/api/crm/${customerId}/invoices`);
        setInvoices(Array.isArray(res) ? res : (res.invoices || []));
      } else if (activeTab === "payments") {
        const res = await api(`/api/crm/payments?customerId=${customerId}&websiteId=${websiteId}`);
        setPayments(res || []);
      } else if (activeTab === "subscriptions") {
        const res = await api(`/api/crm/subscriptions?customerId=${customerId}&websiteId=${websiteId}`);
        setSubscriptions(res || []);
      } else if (activeTab === "notes") {
        // Fallback to internal notes on Customer
        setNotes(customer?.internalNotes || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllDataFor360 = async () => {
    if (!customerId) return;
    try {
      const qWebsite = (websiteId && websiteId !== "undefined" && websiteId !== "null") ? websiteId : "";
      
      const [dealsRes, invRes, tasksRes] = await Promise.allSettled([
        api(`/api/crm/deals?customerId=${customerId}&websiteId=${qWebsite}`),
        api(`/api/crm/${customerId}/invoices`),
        api(`/api/crm/tasks/my?customerId=${customerId}`)
      ]);

      if (dealsRes.status === "fulfilled" && dealsRes.value) {
        const res = dealsRes.value;
        setDeals(Array.isArray(res) ? res : (res.deals || res.data || []));
      }
      if (invRes.status === "fulfilled" && invRes.value) {
        const res = invRes.value;
        setInvoices(Array.isArray(res) ? res : (res.invoices || res.data || []));
      }
      if (tasksRes.status === "fulfilled" && tasksRes.value) {
        const res = tasksRes.value;
        setTasks(Array.isArray(res) ? res : (res.tasks || res.data || []));
      }
    } catch (err) {
      console.error("Error prefetching 360 data:", err);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchProfile();
      fetchPortalAccessStatus();
      fetchAllDataFor360();
    }
  }, [customerId]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    return () => {
      document.body.style.overflow = "";
    };
  }, [customerId, loading]);

  useEffect(() => {
    if (customerId && customer) fetchTabData();
  }, [activeTab, customer]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/${customerId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ ...taskForm, websiteId })
      });
      setShowTaskForm(false);
      fetchTabData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/meetings`, {
        method: "POST",
        body: JSON.stringify({ ...meetingForm, customerId, websiteId })
      });
      setShowMeetingForm(false);
      fetchTabData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/documents`, {
        method: "POST",
        body: JSON.stringify({ ...docForm, customerId, websiteId })
      });
      setShowDocForm(false);
      fetchTabData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      </div>,
      document.body
    );
  }

  const setupScore = [
    Boolean(customer?.email),
    Boolean(customer?.phone),
    Boolean(customer?.companyName),
    Boolean(customer?.trn),
    Boolean(customer?.tradeLicenseNumber),
    Boolean(customer?.tradeLicenseExpiryDate),
    Boolean(customer?.vatFilingDueDate || customer?.corporateTaxDueDate)
  ].filter(Boolean).length;
  const setupPercentage = Math.round((setupScore / 7) * 100);

  const handleGenerateProfessionalPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const clientName = customer?.name || "Client";
      const companyName = customer?.companyName || "N/A";
      const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

      const formatDate = (d) => {
        if (!d || d === "-") return "-";
        try {
          const dateObj = new Date(d);
          return isNaN(dateObj.getTime()) ? d : dateObj.toISOString().slice(0, 10);
        } catch {
          return String(d).split("T")[0];
        }
      };

      // Header Dark Bar
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 32, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("JTS SUPPORT", 14, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(199, 210, 254);
      doc.text("ENTERPRISE CUSTOMER 360° EXECUTIVE DOSSIER", 14, 21);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`DATE: ${reportDate}`, 196, 14, { align: "right" });
      doc.text("CONFIDENTIAL", 196, 21, { align: "right" });

      // Client Overview Card
      let currentY = 38;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, currentY, 182, 34, 3, 3, "FD");

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(companyName, 20, currentY + 10);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Contact: ${clientName}  |  Email: ${customer?.email || "-"}  |  Phone: ${customer?.phone || "-"}`, 20, currentY + 17);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(`STAGE: ${(customer?.pipelineStage || "NEW").toUpperCase()}`, 20, currentY + 26);
      doc.setTextColor(16, 185, 129);
      doc.text(`STATUS: ${(customer?.status || "LEAD").toUpperCase()}`, 70, currentY + 26);
      doc.setTextColor(71, 85, 105);
      doc.text(`LEAD VALUE: $${(customer?.leadValue || 0).toLocaleString()}`, 130, currentY + 26);

      currentY += 40;

      // Synthesize fallback data if backend arrays are unpopulated
      const activeServices = (customer?.services && customer.services.length > 0)
        ? customer.services
        : (customer?.serviceType ? [{
            serviceName: customer.serviceType,
            serviceCategory: customer.serviceCategory || "Compliance & Operations",
            workStatus: customer.workStatus || "Pending",
            paymentStatus: customer.paymentStatus || "Pending"
          }] : [{
            serviceName: "UAE Business Compliance & Advisory",
            serviceCategory: "Corporate Suite",
            workStatus: customer?.workStatus || "In Progress",
            paymentStatus: customer?.paymentStatus || "Pending"
          }]);

      const activeDeals = deals.length > 0
        ? deals
        : [{
            title: `${companyName !== "N/A" ? companyName : clientName} Enterprise Opportunity`,
            stage: customer?.pipelineStage || "NEW",
            value: customer?.leadValue || customer?.budget || 0,
            expectedCloseDate: customer?.expectedCloseDate || customer?.vatFilingDueDate || "-"
          }];

      const activeInvoices = invoices.length > 0
        ? invoices
        : [{
            invoiceNumber: `INV-${(customer?._id || "001").slice(-6).toUpperCase()}`,
            status: customer?.paymentStatus || "Pending",
            total: customer?.leadValue || customer?.budget || 0,
            dueDate: customer?.vatFilingDueDate || "-"
          }];

      // Section 1: Compliance & Licensing
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 27, 75);
      doc.text("1. COMPLIANCE & TAX STATUS", 14, currentY);

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        head: [["PROPERTY / ITEM", "STATUS / REGISTRATION NO", "DUE DATE / EXPIRY"]],
        body: [
          ["VAT Filing Status", customer?.workStatus || "Pending", `${customer?.vatFilingPeriod || "Q4 2026"} (Due: ${formatDate(customer?.vatFilingDueDate)})`],
          ["Corporate Tax Registration", customer?.corporateTaxStatus || "Registered", `Due: ${formatDate(customer?.corporateTaxDueDate)}`],
          ["TRN / Tax Registration No", customer?.trn || "Not Registered", "-"],
          ["Trade License", customer?.tradeLicenseNumber || "N/A", `Expiry: ${formatDate(customer?.tradeLicenseExpiryDate)}`]
        ],
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Section 2: Purchased Services
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 27, 75);
      doc.text("2. PURCHASED SERVICES & OPERATIONS", 14, currentY);

      const servicesRows = activeServices.map(s => [
        s.serviceName || "Service",
        s.serviceCategory || "General",
        s.workStatus || "Pending",
        s.paymentStatus || "Pending"
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        head: [["SERVICE NAME", "CATEGORY", "WORK STATUS", "PAYMENT STATUS"]],
        body: servicesRows,
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Section 3: Deals
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 27, 75);
      doc.text("3. ASSOCIATED DEALS & PIPELINE", 14, currentY);

      const dealsRows = activeDeals.map(d => [
        d.title || d.name || "Deal",
        (d.stage || d.pipelineStage || "New").toUpperCase(),
        `$${(d.value || d.amount || 0).toLocaleString()}`,
        formatDate(d.expectedCloseDate)
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        head: [["DEAL TITLE", "PIPELINE STAGE", "VALUE ($)", "EXPECTED CLOSE"]],
        body: dealsRows,
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Section 4: Invoices
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 27, 75);
      doc.text("4. INVOICES & FINANCIAL LEDGER", 14, currentY);

      const invoicesRows = activeInvoices.map(inv => [
        inv.invoiceNumber || inv.number || "INV-001",
        (inv.status || "Draft").toUpperCase(),
        `$${(inv.total || inv.amount || 0).toLocaleString()}`,
        formatDate(inv.dueDate)
      ]);

      autoTable(doc, {
        startY: currentY + 3,
        margin: { left: 14, right: 14 },
        head: [["INVOICE #", "STATUS", "TOTAL AMOUNT ($)", "DUE DATE"]],
        body: invoicesRows,
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "bold");
        doc.text("CONFIDENTIAL - JTS ENTERPRISE CRM SYSTEM", 14, 285);
        doc.text(`Page ${i} of ${totalPages}`, 196, 285, { align: "right" });
      }

      const fileName = `Customer_360_Report_${(customer?.name || "Client").replace(/\s+/g, "_")}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF file: " + err.message);
    }
  };

  return createPortal(
    <div ref={containerRef} className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-y-auto">
      {/* Upper Navigation Header */}
      <header className="sticky top-0 bg-white border-b border-slate-200/80 px-8 py-5 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} aria-label="Go back to customer list" className="p-3.5 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors"><ArrowLeft size={16} /></button>
          <div>
            <h2 className="text-base font-black text-slate-900">{customer?.name}</h2>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{customer?.companyName || "Lead Profile"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const formatDate = (d) => {
                if (!d || d === "-") return "-";
                try {
                  const dateObj = new Date(d);
                  return isNaN(dateObj.getTime()) ? d : dateObj.toISOString().slice(0, 10);
                } catch {
                  return String(d).split("T")[0];
                }
              };

              const rows = [
                ["CUSTOMER 360 PROFILE REPORT", customer?.name || ""],
                ["Company Name", customer?.companyName || "-"],
                ["Email", customer?.email || "-"],
                ["Phone", customer?.phone || "-"],
                ["Lead Value ($)", customer?.leadValue || 0],
                ["Pipeline Stage", (customer?.pipelineStage || "-").toUpperCase()],
                ["CRM Status", (customer?.status || "-").toUpperCase()],
                ["TRN / Tax ID", customer?.trn || "Not Registered"],
                ["VAT Filing Period", customer?.vatFilingPeriod || "-"],
                ["VAT Filing Due Date", formatDate(customer?.vatFilingDueDate)],
                ["Corporate Tax Status", customer?.corporateTaxStatus || "-"],
                ["Trade License Expiry", formatDate(customer?.tradeLicenseExpiryDate)],
                [],
                ["ACTIVE SERVICES & WORK STATUS"],
                ["Service Name", "Category", "Work Status", "Payment Status"],
                ...(activeServices.map(s => [s.serviceName, s.serviceCategory, s.workStatus, s.paymentStatus])),
                [],
                ["ASSOCIATED DEALS"],
                ["Deal Title", "Stage", "Value ($)", "Close Date"],
                ...(activeDeals.map(d => [d.title || d.name, d.stage || d.pipelineStage, d.value || d.amount || 0, formatDate(d.expectedCloseDate)])),
                [],
                ["INVOICES & FINANCIALS"],
                ["Invoice #", "Status", "Amount ($)", "Due Date"],
                ...(activeInvoices.map(inv => [inv.invoiceNumber || inv.number, inv.status, inv.total || inv.amount || 0, formatDate(inv.dueDate)]))
              ];

              const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `Customer_360_Report_${(customer?.name || "Client").replace(/\s+/g, "_")}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-2xl shadow-sm transition-all"
            title="Download complete 360 degree CSV / Excel sheet"
          >
            <Download size={13} />
            Export CSV
          </button>

          <button
            onClick={handleGenerateProfessionalPDF}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase rounded-2xl shadow-sm transition-all"
            title="Print or Save Executive PDF Report"
          >
            <Printer size={13} />
            Export PDF / Print
          </button>

          <button onClick={onClose} aria-label="Close modal" className="p-3 text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
        </div>
      </header>



      {/* Profile Summary Widget Strip */}
      <section className="bg-white border-b border-slate-200/50 px-8 py-6 grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="flex items-center gap-3">
          <Mail size={16} className="text-indigo-500" />
          <div>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Email Address</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{customer?.email || "-"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Phone size={16} className="text-sky-500" />
          <div>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Phone</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{customer?.phone || "-"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DollarSign size={16} className="text-emerald-500" />
          <div>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Lead Value</p>
            <p className="text-xs font-extrabold text-indigo-600 mt-0.5">{formatCurrency(customer?.leadValue)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-amber-500" />
          <div>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Pipeline Stage</p>
            <p className="text-xs font-black text-slate-700 mt-0.5 uppercase tracking-wide">{customer?.pipelineStage || "-"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck size={16} className="text-emerald-500" />
          <div className="flex-1 min-w-[120px]">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Tax Setup</p>
              <span className="text-[9px] font-black text-emerald-600">{setupPercentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" style={{ width: `${setupPercentage}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* Tabs list - sticky & prominent */}
      <div className="sticky top-[73px] z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex px-8 overflow-x-auto scrollbar-none gap-1">
          {PROFILE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3.5 text-[9px] font-black uppercase tracking-wider border-b-2 transition-all shrink-0 whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Quick Action & Contact Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-[28px] text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border border-indigo-900/50">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-lg border border-white/20 shrink-0">
                  {(customer?.companyName || customer?.name || "C").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black tracking-tight">{customer?.companyName || customer?.name}</h3>
                    
                    {/* Live Record Type Toggle */}
                    <select
                      value={customer?.recordType || "lead"}
                      onChange={(e) => handleUpdateCustomerFields({ recordType: e.target.value })}
                      className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full px-3 py-0.5 text-[9px] font-black uppercase outline-none cursor-pointer"
                    >
                      <option value="lead" className="bg-slate-900 text-white">LEAD</option>
                      <option value="customer" className="bg-slate-900 text-white">CUSTOMER</option>
                      <option value="deal" className="bg-slate-900 text-white">DEAL</option>
                    </select>

                    {/* Live Pipeline Stage Dropdown */}
                    <select
                      value={customer?.pipelineStage || "new"}
                      onChange={(e) => handleUpdateCustomerFields({ pipelineStage: e.target.value })}
                      className="bg-slate-800/80 text-white border border-slate-700 rounded-full px-3 py-0.5 text-[9px] font-black uppercase outline-none cursor-pointer hover:bg-slate-800"
                    >
                      <option value="new" className="bg-slate-900 text-white">STAGE: NEW</option>
                      <option value="contacted" className="bg-slate-900 text-white">STAGE: CONTACTED</option>
                      <option value="proposal_sent" className="bg-slate-900 text-white">STAGE: PROPOSAL SENT</option>
                      <option value="under_review" className="bg-slate-900 text-white">STAGE: UNDER REVIEW</option>
                      <option value="won" className="bg-slate-900 text-emerald-400 font-bold">STAGE: WON / CLOSED</option>
                      <option value="lost" className="bg-slate-900 text-rose-400 font-bold">STAGE: LOST</option>
                    </select>
                  </div>
                  <p className="text-xs text-slate-300 font-semibold mt-1 flex items-center gap-3">
                    {customer?.name && <span>Contact: <strong>{customer.name}</strong></span>}
                    {customer?.crn && <span className="font-mono text-indigo-300 font-bold">• CRN: {customer.crn}</span>}
                  </p>
                </div>
              </div>

              {/* Quick Communication Actions */}
              <div className="flex items-center gap-2.5 relative z-10 flex-wrap justify-end">
                {customer?.phone && (
                  <a
                    href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all hover:scale-105"
                  >
                    <MessageSquare size={14} /> WhatsApp
                  </a>
                )}
                {customer?.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-indigo-900/30 transition-all hover:scale-105"
                  >
                    <Mail size={14} /> Email Client
                  </a>
                )}
                <button
                  onClick={() => setActiveTab("tasks")}
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 size={14} /> Add Task
                </button>
                <button
                  onClick={() => setActiveTab("meetings")}
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                >
                  <Calendar size={14} /> Schedule Meeting
                </button>
              </div>
            </div>

            {/* 4 Key Executive KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Financial Health */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Pipeline & Deal Value</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={16} /></div>
                </div>
                <div className="text-xl font-black text-slate-900">{formatCurrency(customer?.leadValue || customer?.expectedRevenue || 0)}</div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>Win Probability: <strong className="text-emerald-600">{customer?.probability || 10}%</strong></span>
                  <span className="uppercase text-slate-400">{customer?.pipelineStage || "New"}</span>
                </div>
              </div>

              {/* UAE Compliance Health */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Compliance Readiness</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><ShieldCheck size={16} /></div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-slate-900">{setupPercentage}%</span>
                  <span className="text-[10px] font-bold text-emerald-600">Setup Score</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full transition-all duration-500" style={{ width: `${setupPercentage}%` }} />
                </div>
              </div>

              {/* Lead Health & Temperature Interactive Selector */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">AI Lead Temperature</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Star size={16} /></div>
                </div>
                
                {/* Temperature Interactive Pill Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {["hot", "warm", "cold"].map((temp) => (
                    <button
                      key={temp}
                      onClick={() => handleUpdateCustomerFields({ leadTemperature: temp })}
                      className={`flex-1 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                        (customer?.leadTemperature || "warm") === temp
                          ? temp === "hot" ? "bg-rose-600 text-white shadow-sm" : temp === "warm" ? "bg-amber-500 text-white shadow-sm" : "bg-slate-700 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {temp}
                    </button>
                  ))}
                </div>

                <div className="text-[10px] font-bold text-slate-500 flex justify-between">
                  <span>Score: <strong className="text-slate-800">{customer?.leadScore || 0} pts</strong></span>
                  <span>Churn Risk: <strong className="text-slate-700">{customer?.churnRisk || 0}%</strong></span>
                </div>
              </div>

              {/* Trade License Status */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Trade License</span>
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-xl"><Building2 size={16} /></div>
                </div>
                <div className="font-mono text-xs font-black text-slate-900 truncate">
                  {customer?.tradeLicenseNumber || "N/A"}
                </div>
                <div className="text-[10px] font-bold flex items-center justify-between">
                  <span className="text-slate-400">Expiry:</span>
                  <span className={customer?.tradeLicenseExpiryDate && new Date(customer.tradeLicenseExpiryDate) < new Date() ? "text-rose-600 font-black" : "text-slate-700 font-bold"}>
                    {customer?.tradeLicenseExpiryDate ? new Date(customer.tradeLicenseExpiryDate).toLocaleDateString() : "Not Registered"}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Column (2 Cols wide) */}
              <div className="md:col-span-2 space-y-8">
                {/* UAE Tax & Compliance Master Properties */}
                <div className="bg-white p-8 border border-slate-200/80 rounded-[30px] shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b pb-4 border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">UAE Tax & Compliance Properties</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time status of FTA filings & licensing</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase text-slate-400">Work Status:</span>
                      <select
                        value={customer?.workStatus || "Pending"}
                        onChange={(e) => handleUpdateWorkStatus(e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border transition-all shadow-sm ${
                          customer?.workStatus === "Completed" || customer?.workStatus === "Approved" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          customer?.workStatus === "In Progress" ? "bg-sky-50 text-sky-600 border-sky-200" :
                          customer?.workStatus === "Under Review" ? "bg-purple-50 text-purple-600 border-purple-200" :
                          "bg-amber-50 text-amber-600 border-amber-200"
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Submitted">Submitted / Filed</option>
                        <option value="Completed">Completed / Approved</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">TRN (Tax Reg No)</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black text-slate-900">{customer?.trn || "Not Registered"}</span>
                        {customer?.trn && (
                          <button
                            onClick={() => { navigator.clipboard.writeText(customer.trn); alert("TRN copied to clipboard!"); }}
                            className="text-[9px] text-indigo-600 font-bold hover:underline"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Service Scope</span>
                      <span className="text-xs font-black text-indigo-600 block truncate">{customer?.serviceType || "Corporate Tax Registration"}</span>
                    </div>

                    <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Payment Status</span>
                      <select
                        value={customer?.paymentStatus || "Pending"}
                        onChange={(e) => handleUpdatePaymentStatus(e.target.value)}
                        className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase outline-none cursor-pointer border transition-all ${
                          customer?.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          customer?.paymentStatus === "Partial" ? "bg-sky-50 text-sky-600 border-sky-200" :
                          customer?.paymentStatus === "Overdue" ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>

                    <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">VAT Filing Period</span>
                      <span className="text-xs font-bold text-slate-800">{customer?.vatFilingPeriod || "Q1 2026"}</span>
                    </div>

                    <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">VAT Filing Due</span>
                      <span className="text-xs font-bold text-slate-800">{customer?.vatFilingDueDate ? new Date(customer.vatFilingDueDate).toLocaleDateString() : "TBA"}</span>
                    </div>

                    <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Corporate Tax Due</span>
                      <span className="text-xs font-bold text-slate-800">{customer?.corporateTaxDueDate ? new Date(customer.corporateTaxDueDate).toLocaleDateString() : "TBA"}</span>
                    </div>
                  </div>
                </div>

                {/* Inline Quick Follow-up Note Logger */}
                <div className="bg-white p-8 border border-slate-200/80 rounded-[30px] shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <Edit3 size={16} className="text-indigo-600" />
                      Quick Activity Follow-up Note
                    </h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Saves to timeline</span>
                  </div>

                  <form onSubmit={handleAddQuickNote} className="space-y-3">
                    <textarea
                      rows={2}
                      value={quickNoteText}
                      onChange={(e) => setQuickNoteText(e.target.value)}
                      placeholder="Type a quick client interaction note or update..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingNote || !quickNoteText.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {savingNote ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                        Save Note to Profile
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column (1 Col wide) */}
              <div className="space-y-6">
                {/* Account Owner & Live Consultant Assignment Dropdown */}
                <div className="bg-white p-6 border border-slate-200/80 rounded-[28px] shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-3 border-slate-100 flex items-center justify-between">
                    <span>Account Ownership</span>
                    <User size={14} className="text-indigo-600" />
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 font-black flex items-center justify-center text-sm shrink-0">
                        {(customer?.ownerId?.name || "U").charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 truncate">{customer?.ownerId?.name || "Unassigned Consultant"}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{customer?.ownerId?.role || "Assigned Account Owner"}</p>
                      </div>
                    </div>

                    {/* Live Reassign Dropdown */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Reassign Owner</label>
                      <select
                        value={customer?.ownerId?._id || customer?.ownerId || ""}
                        onChange={(e) => handleUpdateCustomerFields({ ownerId: e.target.value || null })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map(m => (
                          <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Client Portal & Security Desk */}
                <div className="bg-white p-6 border border-slate-200/80 rounded-[28px] shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Client Portal Access</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase ${portalAccess.active ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"}`}>
                      {portalAccess.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {portalLoading ? (
                    <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-2 animate-pulse">Checking credentials...</p>
                  ) : (
                    <div className="space-y-3">
                      {portalAccess.active ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                            <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Linked Login Email</span>
                            <span className="font-bold text-slate-800 block truncate">{portalAccess.email}</span>
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={handleRevokePortalAccess}
                              className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border border-rose-200/60"
                            >
                              Revoke Portal Access
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 mb-3 leading-relaxed">
                            Granting access generates customer login credentials for the client portal.
                          </p>
                          {!isReadOnly && (
                            <button
                              onClick={handleGrantPortalAccess}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20"
                            >
                              Grant Portal Access
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-4 border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Service Management</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Independent compliance & licensing services provisioned for this customer</p>
              </div>
              <button
                onClick={() => handleOpenServiceModal()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-md"
              >
                <Plus size={14} /> Provision Service
              </button>
            </div>

            {(() => {
              const explicitServices = customer?.services || [];
              const derivedServices = [];

              if (customer?.serviceType) {
                const isVat = customer.serviceType.includes("VAT");
                const isCt = customer.serviceType.includes("Corporate");
                const isTl = customer.serviceType.includes("Trade");
                const dueDate = customer.corporateTaxDueDate || customer.vatFilingDueDate || customer.tradeLicenseExpiryDate;

                derivedServices.push({
                  _id: `derived-primary-${customer._id}`,
                  serviceName: customer.serviceType,
                  serviceCategory: isVat ? "VAT Compliance" : isCt ? "Corporate Tax" : isTl ? "Trade License" : "Compliance",
                  workStatus: customer.workStatus || "Pending",
                  paymentStatus: customer.paymentStatus || "Pending",
                  priority: "High",
                  dueDate: dueDate,
                  remarks: customer.vatFilingPeriod ? `Filing Period: ${customer.vatFilingPeriod}${customer.trn ? ` | TRN: ${customer.trn}` : ""}` : (customer.trn ? `TRN: ${customer.trn}` : "Primary Registered Service")
                });
              }

              const displayServices = explicitServices.length > 0 ? explicitServices : derivedServices;

              if (displayServices.length === 0) {
                return (
                  <div className="text-center py-12 space-y-3">
                    <FileText size={32} className="mx-auto text-slate-300" />
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No active services provisioned for this client.</p>
                    <button
                      onClick={() => handleOpenServiceModal()}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5"
                    >
                      <Plus size={12} /> Add First Service
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {displayServices.map((srv) => {
                    const dueDate = srv.dueDate ? new Date(srv.dueDate) : null;
                    const now = new Date();
                    const diffDays = dueDate ? Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : null;

                    return (
                      <div key={srv._id} className="p-6 border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-white transition-all space-y-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{srv.serviceCategory || "Compliance"}</span>
                            <h5 className="text-sm font-black text-slate-900 mt-1">{srv.serviceName}</h5>
                          </div>
                          <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${
                            srv.workStatus === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                            srv.workStatus === "In Progress" ? "bg-sky-50 text-sky-600 border-sky-200" :
                            srv.workStatus === "Under Review" ? "bg-purple-50 text-purple-600 border-purple-200" :
                            "bg-amber-50 text-amber-600 border-amber-200"
                          }`}>
                            {srv.workStatus || "Pending"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs font-bold pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Priority</span>
                            <span className={`text-[10px] uppercase font-black ${
                              srv.priority === "Critical" ? "text-rose-600" :
                              srv.priority === "High" ? "text-amber-600" : "text-slate-700"
                            }`}>{srv.priority || "Medium"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Payment Status</span>
                            <span className={`text-[10px] uppercase font-black ${
                              srv.paymentStatus === "Paid" ? "text-emerald-600" :
                              srv.paymentStatus === "Overdue" ? "text-rose-600" : "text-amber-600"
                            }`}>{srv.paymentStatus || "Pending"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Due Date</span>
                            <span className="text-[10px] text-slate-700">{dueDate ? dueDate.toLocaleDateString() : "No Due Date"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Days Remaining</span>
                            <span className={`text-[10px] font-black ${
                              diffDays !== null && diffDays < 0 ? "text-rose-600" :
                              diffDays !== null && diffDays <= 30 ? "text-amber-600" : "text-emerald-600"
                            }`}>
                              {diffDays !== null ? (diffDays < 0 ? `${Math.abs(diffDays)}d Overdue` : `${diffDays} days left`) : "N/A"}
                            </span>
                          </div>
                        </div>

                        {srv.remarks && (
                          <p className="text-[10px] text-slate-500 font-bold bg-white p-2.5 rounded-xl border border-slate-100">{srv.remarks}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === "corporate_tax" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-4 border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Corporate Tax Compliance</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Annual corporate tax return schedules & live countdown</p>
              </div>
              <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase ${
                customer?.workStatus === "Completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
              }`}>
                {customer?.workStatus || "Pending"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-bold">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400">TRN (Tax Reg No)</span>
                <p className="text-slate-900 font-mono font-bold text-sm">{customer?.trn || "Not Registered"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400">Corporate Tax Filing Due</span>
                <p className="text-slate-900 font-bold text-sm">{customer?.corporateTaxDueDate ? new Date(customer.corporateTaxDueDate).toLocaleDateString() : "No Due Date Set"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400">Days Remaining</span>
                {(() => {
                  const d = customer?.corporateTaxDueDate ? new Date(customer.corporateTaxDueDate) : null;
                  const diff = d ? Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24)) : null;
                  return (
                    <p className={`font-black text-sm ${diff !== null && diff < 0 ? "text-rose-600" : diff !== null && diff <= 30 ? "text-amber-600" : "text-emerald-600"}`}>
                      {diff !== null ? (diff < 0 ? `${Math.abs(diff)} Days Overdue` : `${diff} Days Left`) : "N/A"}
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === "vat_compliance" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-4 border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">VAT Compliance & Filing</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Value Added Tax return schedules & filing status</p>
              </div>
              <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase ${
                customer?.workStatus === "Completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
              }`}>
                {customer?.workStatus || "Pending"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-bold">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400">VAT Registration No (TRN)</span>
                <p className="text-slate-900 font-mono font-bold text-sm">{customer?.trn || "Not Registered"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400">VAT Filing Due Date</span>
                <p className="text-slate-900 font-bold text-sm">{customer?.vatFilingDueDate ? new Date(customer.vatFilingDueDate).toLocaleDateString() : "No Due Date Set"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400">VAT Filing Period</span>
                <p className="text-indigo-600 font-black text-sm">{customer?.vatFilingPeriod || "Quarterly"}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "trade_license" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-4 border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Trade License Management & Renewal</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Commercial trade license details, authority & expiry countdown</p>
              </div>
              {(() => {
                const exp = customer?.tradeLicenseExpiryDate ? new Date(customer.tradeLicenseExpiryDate) : null;
                const diff = exp ? Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24)) : null;
                return (
                  <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase border ${
                    diff !== null && diff < 0 ? "bg-rose-50 text-rose-600 border-rose-200" :
                    diff !== null && diff <= 30 ? "bg-amber-50 text-amber-600 border-amber-200" :
                    diff !== null && diff <= 60 ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                    "bg-emerald-50 text-emerald-600 border-emerald-200"
                  }`}>
                    {diff !== null ? (diff < 0 ? "Expired" : diff <= 30 ? "Expiring Soon" : "Active") : "No License Data"}
                  </span>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-bold">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400">License Number</span>
                <p className="text-slate-900 font-mono font-bold text-sm">{customer?.tradeLicenseNumber || "N/A"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400">License Expiry Date</span>
                <p className="text-slate-900 font-bold text-sm">{customer?.tradeLicenseExpiryDate ? new Date(customer.tradeLicenseExpiryDate).toLocaleDateString() : "No Expiry Date Set"}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400">Days Remaining</span>
                {(() => {
                  const d = customer?.tradeLicenseExpiryDate ? new Date(customer.tradeLicenseExpiryDate) : null;
                  const diff = d ? Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24)) : null;
                  return (
                    <p className={`font-black text-sm ${
                      diff !== null && diff < 0 ? "text-rose-600" :
                      diff !== null && diff <= 30 ? "text-amber-600" :
                      diff !== null && diff <= 60 ? "text-yellow-600" : "text-emerald-600"
                    }`}>
                      {diff !== null ? (diff < 0 ? `${Math.abs(diff)} Days Expired` : `${diff} Days Left`) : "N/A"}
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === "whatsapp" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise WhatsApp Business Integration</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time WhatsApp Business messaging, templates & delivery receipts</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                  Phone: {customer?.phone || "No Phone Set"}
                </span>
              </div>
            </div>

            {/* Template Buttons Strip */}
            <div className="space-y-2">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Compliance Templates Quick Send</span>
              <div className="flex flex-wrap gap-2">
                {[
                  "Welcome to JTS Compliance",
                  "VAT Return Filing Due Date Reminder",
                  "Corporate Tax Return Filing Due Date Reminder",
                  "Trade License Renewal Expiry Alert",
                  "Service Fee Invoice Payment Reminder"
                ].map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => alert(`Template prepared: "${tmpl}". Click Send to dispatch.`)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase rounded-xl transition-all"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Timeline List */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 max-h-96 overflow-y-auto">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-1.5 max-w-md ml-auto shadow-sm">
                <p className="text-xs font-bold text-slate-800">Hello {customer?.name}, your Corporate Tax Return Filing due date is approaching. Please submit your required financial documents.</p>
                <div className="flex justify-between items-center text-[8px] font-black text-slate-400 pt-1 border-t border-slate-100">
                  <span>Consultant Dispatch</span>
                  <span className="text-emerald-600 uppercase font-black">Delivered ✓✓</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5 max-w-md mr-auto shadow-sm">
                <p className="text-xs font-bold text-emerald-950">Thank you! We have received the reminder and will share the audit reports shortly.</p>
                <div className="flex justify-between items-center text-[8px] font-black text-emerald-600 pt-1 border-t border-emerald-100">
                  <span>Client Message</span>
                  <span>Received</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Activity Chronicle</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Audit log of customer status changes, compliance updates & interactions</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    placeholder="Search activity..."
                    value={timelineSearch || ""}
                    onChange={(e) => setTimelineSearch(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold outline-none"
                  />
                </div>
                <select
                  value={timelineFilter || "all"}
                  onChange={(e) => setTimelineFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                >
                  <option value="all">All Events</option>
                  <option value="status">Status Changes</option>
                  <option value="compliance">Compliance Updates</option>
                  <option value="payment">Payment Events</option>
                  <option value="assignment">Assignments</option>
                </select>
              </div>
            </div>

            <div className="relative border-l-2 border-slate-100 pl-8 ml-4 space-y-8">
              {(!timeline || timeline.length === 0) ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest pl-2">No activity timeline logged yet.</p>
              ) : (
                timeline
                  .filter(act => {
                    if (!timelineSearch) return true;
                    const q = timelineSearch.toLowerCase();
                    return (act.title && act.title.toLowerCase().includes(q)) || (act.description && act.description.toLowerCase().includes(q));
                  })
                  .filter(act => {
                    if (timelineFilter === "all") return true;
                    if (timelineFilter === "status" && (act.type === "work_status_changed" || act.type === "stage_changed")) return true;
                    if (timelineFilter === "compliance" && act.type === "compliance_updated") return true;
                    if (timelineFilter === "payment" && act.type === "payment_status_changed") return true;
                    if (timelineFilter === "assignment" && act.type === "consultant_reassigned") return true;
                    return false;
                  })
                  .map((act) => {
                    const actDate = new Date(act.activityAt || act.createdAt);
                    const now = new Date();
                    const diffMs = now - actDate;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMins / 60);
                    const diffDays = Math.floor(diffHours / 24);

                    let relativeTime = `${diffMins}m ago`;
                    if (diffMins < 1) relativeTime = "Just now";
                    else if (diffHours < 24) relativeTime = `${diffHours}h ago`;
                    else if (diffDays === 1) relativeTime = "Yesterday";
                    else if (diffDays < 7) relativeTime = `${diffDays}d ago`;
                    else relativeTime = actDate.toLocaleDateString();

                    return (
                      <div key={act._id} className="relative space-y-1 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
                        <span className={`absolute -left-[45px] top-4 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-black shadow-sm ${
                          act.type === "work_status_changed" ? "bg-sky-50 text-sky-600 border-sky-400" :
                          act.type === "payment_status_changed" ? "bg-emerald-50 text-emerald-600 border-emerald-400" :
                          act.type === "compliance_updated" ? "bg-purple-50 text-purple-600 border-purple-400" :
                          act.type === "consultant_reassigned" ? "bg-amber-50 text-amber-600 border-amber-400" :
                          "bg-indigo-50 text-indigo-600 border-indigo-400"
                        }`}>
                          ✓
                        </span>
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-black text-slate-900 uppercase tracking-tight">{act.title}</h5>
                          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{relativeTime}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-600">{act.description}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[9px] font-bold text-slate-400">
                          <span>Logged by {act.ownerId?.name || "System"}</span>
                          <span>{actDate.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {activeTab === "deals" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Customer Deals</h4>
            {deals.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No deals associated with this customer.</p>
            ) : (
              <div className="space-y-4">
                {deals.map(d => (
                  <div key={d._id} className="p-5 border border-slate-100 rounded-2xl flex justify-between items-center hover:bg-slate-50/50">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{d.dealName}</h5>
                      <span className="text-[9px] font-bold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-600">{d.stage}</span>
                    </div>
                    <span className="text-xs font-extrabold text-indigo-600">${d.dealValue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Tasks Follow-Up</h4>
              <button onClick={() => setShowTaskForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1"><Plus size={12} /> Add Task</button>
            </div>
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">All tasks completed!</p>
              ) : (
                tasks.map(t => (
                  <div key={t._id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center hover:bg-slate-50/50">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{t.title}</h5>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Due: {new Date(t.dueAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.priority === "high" || t.priority === "urgent" ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500"}`}>{t.priority}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "meetings" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Scheduled Meetings</h4>
              <button onClick={() => setShowMeetingForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1"><Plus size={12} /> Schedule Meeting</button>
            </div>
            <div className="space-y-4">
              {meetings.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No meetings scheduled.</p>
              ) : (
                meetings.map(m => (
                  <div key={m._id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center hover:bg-slate-50/50">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{m.title}</h5>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">Start: {new Date(m.startAt).toLocaleString()}</p>
                    </div>
                    {m.googleMeetUrl && <a href={m.googleMeetUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-xl uppercase">Join Meet</a>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "calls" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Logged Calls</h4>
            {calls.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No call logs registered.</p>
            ) : (
              <div className="space-y-4">
                {calls.map(c => (
                  <div key={c._id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-black text-slate-800 capitalize">{c.direction} Call - {c.status}</h5>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">{c.outcome || `Duration: ${c.duration}s`}</p>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "emails" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Email Communication Timeline</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Automated compliance reminders, client email exchanges & delivery logs</p>
              </div>
              <button
                onClick={() => setShowEmailForm(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase rounded-xl tracking-wider transition-all flex items-center gap-1.5 shadow-md"
              >
                <Plus size={12} /> Compose New Email
              </button>
            </div>

            {emails.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-12">No email communications logged.</p>
            ) : (
              <div className="space-y-4">
                {emails.map(e => (
                  <div key={e._id} className="p-5 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-300 transition-all bg-white shadow-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-black text-slate-900">{e.subject || "No Subject"}</h5>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          e.status === "Delivered" || e.status === "Sent" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                          e.status === "Opened" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" :
                          e.status === "Failed" ? "bg-rose-50 text-rose-600 border border-rose-200" :
                          "bg-amber-50 text-amber-600 border border-amber-200"
                        }`}>
                          {e.status || "Sent"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold line-clamp-1">{e.body || e.message || "No content summary"}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">To: {e.to || customer?.email || "Client Email"}</p>
                    </div>

                    <span className="text-[9px] font-bold text-slate-400 shrink-0">
                      {e.sentAt ? new Date(e.sentAt).toLocaleString() : new Date(e.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Compliance Document Vault</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Secure document repository with version history & compliance verification</p>
              </div>
              <button onClick={() => setShowDocForm(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <Plus size={12} /> Upload New Document
              </button>
            </div>

            {documents.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-12">No documents stored in vault.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {documents.map(d => (
                  <div key={d._id} className="p-5 border border-slate-200 rounded-2xl space-y-3 hover:border-indigo-300 transition-all bg-white shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <FileText size={20} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                          v{d.versionNumber || 1}.0
                        </span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                          d.status === "Verified" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                          d.status === "Pending Verification" ? "bg-amber-50 text-amber-600 border border-amber-200" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {d.status || "Verified"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-black text-slate-900 truncate" title={d.documentName || d.name}>{d.documentName || d.name}</h5>
                      <span className="text-[9px] font-bold uppercase text-slate-400 block mt-0.5">{d.category || "General Document"}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-bold text-slate-400">
                      <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                      {d.fileUrl && (
                        <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-black uppercase flex items-center gap-1">
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Customer Invoices</h4>
            <div className="space-y-4">
              {invoices.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No invoices logged.</p>
              ) : (
                invoices.map(inv => (
                  <div key={inv._id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{inv.invoiceId}</h5>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Due: {new Date(inv.issuedAt).toLocaleDateString()} • Total: {formatCurrency(inv.total)}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase text-indigo-500">{inv.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Customer Payments</h4>
            <div className="space-y-4">
              {payments.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No payments logs.</p>
              ) : (
                payments.map(pay => (
                  <div key={pay._id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{pay.paymentNumber}</h5>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Method: {pay.paymentMethod} • Date: {new Date(pay.paymentDate).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-600">{formatCurrency(pay.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "subscriptions" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Customer SaaS Subscriptions</h4>
            <div className="space-y-4">
              {subscriptions.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No subscription logs.</p>
              ) : (
                subscriptions.map(sub => (
                  <div key={sub._id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">Plan: {sub.planId?.name || "SaaS Plan"}</h5>
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Renewal: {new Date(sub.renewalDate).toLocaleDateString()} • Seats: {sub.seats}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase text-indigo-500">{sub.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Internal Remarks</h4>
            <div className="space-y-4">
              {notes.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No remarks registered.</p>
              ) : (
                notes.map((n, idx) => (
                  <div key={idx} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                      <span>{n.authorName || "Author"}</span>
                      <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{n.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Task Modal Overlay */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowTaskForm(false)} />
          <form onSubmit={handleCreateTask} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900">Add Task</h3>
              <button type="button" onClick={() => setShowTaskForm(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><X size={16} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Task Title</label>
              <input required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Due Date</label>
                <input type="date" required value={taskForm.dueAt} onChange={(e) => setTaskForm({ ...taskForm, dueAt: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Priority</label>
                <select value={taskForm.priority} onChange={(e) => setForm({ ...taskForm, priority: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2"><Check size={16} /> Save Task</button>
          </form>
        </div>
      )}

      {/* Meeting Modal Overlay */}
      {showMeetingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowMeetingForm(false)} />
          <form onSubmit={handleCreateMeeting} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900">Schedule Meeting</h3>
              <button type="button" onClick={() => setShowMeetingForm(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><X size={16} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Meeting Title</label>
              <input required value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Start Time</label>
                <input type="datetime-local" required value={meetingForm.startAt} onChange={(e) => setMeetingForm({ ...meetingForm, startAt: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">End Time</label>
                <input type="datetime-local" required value={meetingForm.endAt} onChange={(e) => setMeetingForm({ ...meetingForm, endAt: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Agenda</label>
              <input value={meetingForm.agenda} onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2"><Check size={16} /> Save Meeting</button>
          </form>
        </div>
      )}

      {/* Document Modal Overlay */}
      {showDocForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowDocForm(false)} />
          <form onSubmit={handleUploadDoc} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b pb-4 border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Upload UAE Compliance Document</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Trade License, Emirates ID, VAT, Corporate Tax, Ejari, NDA etc.</p>
              </div>
              <button type="button" onClick={() => setShowDocForm(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><X size={16} /></button>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Document Category (UAE Standard)</label>
              <select 
                value={docForm.category} 
                onChange={(e) => {
                  const cat = e.target.value;
                  setDocForm(prev => ({ 
                    ...prev, 
                    category: cat,
                    name: prev.name || cat
                  }));
                }} 
                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
              >
                <option value="Trade License">Trade License</option>
                <option value="Emirates ID">Emirates ID</option>
                <option value="Passport Copy">Passport Copy</option>
                <option value="VAT / TRN Certificate">VAT / TRN Certificate</option>
                <option value="Corporate Tax Certificate">Corporate Tax Registration</option>
                <option value="MOA / AOA">MOA / AOA (Company Memorandum)</option>
                <option value="Establishment Card">Establishment / Computer Card</option>
                <option value="Tenancy Contract / Ejari">Tenancy Contract / Ejari</option>
                <option value="NDA / Non-Disclosure Agreement">NDA / Non-Disclosure Agreement</option>
                <option value="Power of Attorney">Power of Attorney (POA)</option>
                <option value="Financial Audit Report">Financial Audit Report</option>
                <option value="Proposal / Contract">Proposal / Contract Agreement</option>
                <option value="Other Compliance Document">Other Compliance Document</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Document Name / Title</label>
              <input 
                required 
                placeholder="e.g. Trade License 2026 - Al Reza Global"
                value={docForm.name} 
                onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} 
                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Choose File from Device</label>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const fakeUrl = URL.createObjectURL(file);
                    setDocForm(prev => ({
                      ...prev,
                      name: prev.name || file.name,
                      fileUrl: fakeUrl,
                      filename: file.name
                    }));
                  }
                }}
                className="w-full text-xs font-bold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Or File URL / Storage Path</label>
              <input 
                required 
                placeholder="https://... or choose file above"
                value={docForm.fileUrl} 
                onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })} 
                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500" 
              />
            </div>

            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all">
              <Check size={16} /> Save Compliance Document
            </button>
          </form>
        </div>
      )}

      {/* Provision Service Modal Overlay */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowServiceModal(false)} />
          <form onSubmit={handleAddServiceSubmit} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Provision Client Service</h3>
              <button type="button" onClick={() => setShowServiceModal(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Service Scope</label>
                <select
                  value={serviceForm.serviceName}
                  onChange={(e) => setServiceForm({ ...serviceForm, serviceName: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold"
                >
                  <option value="Corporate Tax Registration">Corporate Tax Registration</option>
                  <option value="Corporate Tax Filing">Corporate Tax Filing</option>
                  <option value="VAT Registration">VAT Registration</option>
                  <option value="VAT Filing">VAT Filing</option>
                  <option value="Trade License Renewal">Trade License Renewal</option>
                  <option value="PRO Services">PRO Services</option>
                  <option value="Other Services">Other Services</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Work Status</label>
                  <select
                    value={serviceForm.workStatus}
                    onChange={(e) => setServiceForm({ ...serviceForm, workStatus: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Waiting for Documents">Waiting for Documents</option>
                    <option value="Documents Received">Documents Received</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Government Submitted">Government Submitted</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Priority</label>
                  <select
                    value={serviceForm.priority}
                    onChange={(e) => setServiceForm({ ...serviceForm, priority: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={serviceForm.dueDate}
                    onChange={(e) => setServiceForm({ ...serviceForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Payment Status</label>
                  <select
                    value={serviceForm.paymentStatus}
                    onChange={(e) => setServiceForm({ ...serviceForm, paymentStatus: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Remarks / Special Notes</label>
                <textarea
                  rows={2}
                  value={serviceForm.remarks}
                  onChange={(e) => setServiceForm({ ...serviceForm, remarks: e.target.value })}
                  placeholder="Optional compliance directives..."
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold"
                />
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
              <Plus size={16} /> Save Provisioned Service
            </button>
          </form>
        </div>
      )}
    </div>,
    document.body
  );
}
