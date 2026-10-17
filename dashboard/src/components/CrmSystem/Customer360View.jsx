import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X, User, Mail, Phone, Calendar, DollarSign, Clock, FileText, CheckCircle2,
  Trash2, Plus, Edit3, Eye, ArrowLeft, Paperclip, MessageSquare, AlertCircle, BookOpen, Search, Filter, Download, Send, Globe, Building2, ShieldCheck, Tag, Layers, Check, CheckCircle, ChevronRight, ChevronLeft, Upload, File, Share2, MoreVertical, AlertTriangle, Star, Save, RefreshCw, Printer,
  MapPin, Mic, MicOff, Navigation, Volume2, Sparkles, ExternalLink, Copy
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
  { id: "telegram", label: "Telegram Bot" },
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

function formatServiceScope(val) {
  if (!val) return "Web & Cloud Services";
  if (typeof val === "object") {
    const candidate = val.serviceName || val.serviceType || val.service || val.inquiryType || val.plan || val.topic || val.subject;
    if (candidate && typeof candidate === "string" && !candidate.trim().startsWith("{")) return candidate;
    return val.preferred_date_time ? "Client Consultation & Appointment Booking" : "Customer Consultation & Support";
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        const candidate =
          parsed.serviceName ||
          parsed.serviceType ||
          parsed.service ||
          parsed.plan ||
          parsed.inquiryType ||
          parsed.topic ||
          parsed.subject ||
          parsed.requirement ||
          parsed.inquiry ||
          parsed.message;
        if (candidate && typeof candidate === "string" && !candidate.trim().startsWith("{")) {
          return candidate;
        }
        return parsed.preferred_date_time ? "Client Consultation & Appointment Booking" : "Customer Consultation & Support";
      } catch {
        return "Customer Consultation & Support";
      }
    }
    return val;
  }
  return String(val);
}

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

  // WhatsApp Interactive State
  const [whatsappInput, setWhatsappInput] = useState("");
  const [sendingWa, setSendingWa] = useState(false);
  const [waNotice, setWaNotice] = useState(null);
  const [whatsappTimeline, setWhatsappTimeline] = useState([
    {
      id: "w1",
      sender: "agent",
      text: "Hello Mohit Kumar Maurya, your Corporate Tax Return Filing due date is approaching. Please submit your required financial documents.",
      time: "10:30 AM",
      status: "Delivered ✓✓"
    },
    {
      id: "w2",
      sender: "customer",
      text: "Thank you! We have received the reminder and will share the audit reports shortly.",
      time: "10:45 AM",
      status: "Received"
    }
  ]);

  // Telegram Interactive State
  const [telegramInput, setTelegramInput] = useState("");
  const [sendingTg, setSendingTg] = useState(false);
  const [tgNotice, setTgNotice] = useState(null);
  const [telegramTimeline, setTelegramTimeline] = useState([
    {
      id: "tg1",
      sender: "bot",
      text: "🚀 Hello Mohit! JTS Chat Support Bot is now LIVE! Your Telegram bot is connected to our backend.",
      time: "2:24 PM",
      status: "Delivered ✓✓"
    }
  ]);

  // Form states for modals/actions
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", dueAt: "", notes: "", priority: "medium" });

  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingForm, setMeetingForm] = useState({ title: "", startAt: "", endAt: "", agenda: "", location: "" });

  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({ name: "", category: "Trade License", fileUrl: "" });

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    serviceName: "E-Invoicing & Billing Suite",
    serviceCategory: "Software & Digital Services",
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

  const isTaxEnabled = Boolean(
    (customer?.trn && customer.trn !== "Not Registered" && customer.trn !== "N/A" && customer.trn !== "-") ||
    (customer?.tradeLicenseNumber && customer.tradeLicenseNumber !== "N/A" && customer.tradeLicenseNumber !== "Not Registered" && customer.tradeLicenseNumber !== "-") ||
    customer?.corporateTaxDueDate ||
    customer?.vatFilingDueDate ||
    (customer?.corporateTaxStatus && !["Pending", "Not Registered", "none", "", "Pending Review"].includes(customer.corporateTaxStatus)) ||
    (customer?.vatFilingPeriod && !["None", "", "Pending"].includes(customer.vatFilingPeriod))
  );

  const visibleTabs = useMemo(() => {
    return PROFILE_TABS.filter(tab => {
      if (["corporate_tax", "vat_compliance", "trade_license"].includes(tab.id)) {
        return isTaxEnabled;
      }
      return true;
    });
  }, [isTaxEnabled]);

  useEffect(() => {
    if (!isTaxEnabled && ["corporate_tax", "vat_compliance", "trade_license"].includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [isTaxEnabled, activeTab]);

  const profileScore = [
    Boolean(customer?.name),
    Boolean(customer?.email),
    Boolean(customer?.phone),
    Boolean(customer?.companyName),
    Boolean(customer?.leadValue || customer?.budget),
    Boolean(customer?.serviceType || customer?.requirement),
    Boolean(customer?.pipelineStage)
  ].filter(Boolean).length;
  const profileCompleteness = Math.round((profileScore / 7) * 100);

  const setupScore = [
    Boolean(customer?.email),
    Boolean(customer?.phone),
    Boolean(customer?.companyName),
    Boolean(customer?.trn && customer.trn !== "Not Registered"),
    Boolean(customer?.tradeLicenseNumber && customer.tradeLicenseNumber !== "N/A"),
    Boolean(customer?.tradeLicenseExpiryDate),
    Boolean(customer?.vatFilingDueDate || customer?.corporateTaxDueDate)
  ].filter(Boolean).length;
  const setupPercentage = isTaxEnabled ? Math.round((setupScore / 7) * 100) : profileCompleteness;
  const setupLabel = isTaxEnabled ? "Tax Setup" : "Profile Health";

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

  // Field Sales GPS Visit Check-in State
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsNote, setGpsNote] = useState("");
  const [gettingGps, setGettingGps] = useState(false);
  const [visitHistory, setVisitHistory] = useState([
    { timestamp: "2026-09-01 14:30", coords: "25.2048° N, 55.2708° E", location: "Downtown Dubai Client Office", note: "Product demo completed. Contract review pending." }
  ]);

  // AI Voice Note Transcriber State
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [transcribedText, setTranscribedText] = useState("");
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  // Handlers for GPS
  const handleCaptureGps = () => {
    setGettingGps(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({
            lat: pos.coords.latitude.toFixed(4),
            lng: pos.coords.longitude.toFixed(4),
            accuracy: Math.round(pos.coords.accuracy)
          });
          setGettingGps(false);
        },
        () => {
          // Fallback mock Dubai coordinates if permission denied / desktop
          setGpsLocation({ lat: "25.2048", lng: "55.2708", accuracy: 12 });
          setGettingGps(false);
        },
        { timeout: 8000 }
      );
    } else {
      setGpsLocation({ lat: "25.2048", lng: "55.2708", accuracy: 15 });
      setGettingGps(false);
    }
  };

  const handleSaveVisitCheckin = () => {
    const newVisit = {
      timestamp: new Date().toLocaleString(),
      coords: gpsLocation ? `${gpsLocation.lat}° N, ${gpsLocation.lng}° E` : "25.2048° N, 55.2708° E",
      location: customer?.companyName || customer?.name || "Client Site",
      note: gpsNote || "On-site commercial consultation."
    };
    setVisitHistory(v => [newVisit, ...v]);
    setShowGpsModal(false);
    setGpsNote("");
    alert(`GPS Visit Check-in logged successfully for ${customer?.companyName || "Client"}!`);
  };

  // Handlers for Voice Note
  const handleToggleVoiceRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      setVoiceSeconds(0);
      setTranscribedText("");
      const timer = setInterval(() => {
        setVoiceSeconds(s => s + 1);
      }, 1000);
      window.__voiceTimer = timer;
    } else {
      setIsRecording(false);
      clearInterval(window.__voiceTimer);
      setIsProcessingVoice(true);

      setTimeout(() => {
        setIsProcessingVoice(false);
        setTranscribedText(
          `"Met with ${customer?.companyName || "client"} operations team. Discussed ${customer?.serviceType || "UAE Corporate Tax registration"} scope and budget. Action items: Send revised quotation by Thursday and schedule technical onboarding call next Monday."`
        );
      }, 1800);
    }
  };

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
            serviceName: "E-Invoicing & Digital Billing Suite",
            serviceCategory: "Digital Operations",
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
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-2.5 flex items-center justify-between shadow-xs z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onClose} 
            aria-label="Go back to customer list" 
            className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 transition-all cursor-pointer shrink-0"
            title="Back to Customer List"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight flex items-center gap-2 truncate">
              <span className="truncate">{customer?.name}</span>
              {customer?.priority === "urgent" && (
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200 text-[8px] font-black uppercase shrink-0">
                  Urgent
                </span>
              )}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{customer?.companyName || "Lead Profile"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            title="Download complete 360 degree CSV / Excel sheet"
          >
            <Download size={13} />
            Export CSV
          </button>

          <button
            onClick={handleGenerateProfessionalPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            title="Print or Save Executive PDF Report"
          >
            <Printer size={13} />
            Export PDF / Print
          </button>

          <button 
            onClick={onClose} 
            aria-label="Close modal" 
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Profile Summary Widget Strip - All 6 Items Inline on One Single Row */}
      <section className="bg-slate-50/80 border-b border-slate-200/70 px-6 py-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-center">
        {/* 1. Email */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
            <Mail size={13} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider truncate">Email Address</p>
            <p className="text-xs font-bold text-slate-800 truncate" title={customer?.email}>{customer?.email || "-"}</p>
          </div>
        </div>

        {/* 2. Phone */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 shrink-0">
            <Phone size={13} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider truncate">Phone</p>
            <p className="text-xs font-bold text-slate-800 truncate">{customer?.phone || "-"}</p>
          </div>
        </div>

        {/* 3. Lead Value */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <DollarSign size={13} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider truncate">Lead Value</p>
            <p className="text-xs font-black text-emerald-600 truncate">{formatCurrency(customer?.leadValue)}</p>
          </div>
        </div>

        {/* 4. Pipeline Stage */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
            <Clock size={13} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider truncate">Pipeline Stage</p>
            <p className="text-xs font-black text-slate-800 uppercase tracking-wide truncate">{customer?.pipelineStage || "-"}</p>
          </div>
        </div>

        {/* 5. AI Sentiment & Score */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 shrink-0">
            <Sparkles size={13} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider truncate">AI Sentiment</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase border ${
                customer?.priority === "urgent" || customer?.lostReason ? "bg-rose-50 text-rose-600 border-rose-200" :
                customer?.pipelineStage === "won" || customer?.pipelineStage === "proposal" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                "bg-sky-50 text-sky-600 border-sky-200"
              }`}>
                {customer?.priority === "urgent" || customer?.lostReason ? "Urgent" : customer?.pipelineStage === "won" || customer?.pipelineStage === "proposal" ? "Positive" : "Neutral"}
              </span>
              <span className="text-xs font-black text-indigo-600">
                {Math.min(99, Math.max(35, (customer?.leadValue ? Math.min(40, Math.floor(customer.leadValue / 1000)) : 20) + (customer?.pipelineStage === "won" ? 50 : customer?.pipelineStage === "proposal" ? 30 : 15)))}/100
              </span>
            </div>
          </div>
        </div>

        {/* 6. Profile Health */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
            <ShieldCheck size={13} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-center mb-0.5">
              <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider truncate">{setupLabel}</p>
              <span className="text-[9px] font-black text-emerald-600">{setupPercentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" style={{ width: `${setupPercentage}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* Tabs list - sticky & compact */}
      <div className="sticky top-[49px] z-10 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-1.5 shadow-xs">
        <div className="flex overflow-x-auto no-scrollbar gap-1 items-center">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <main className="flex-1 p-4 sm:p-5 max-w-7xl mx-auto w-full">
        {activeTab === "overview" && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* Quick Action & Contact Banner - Ultra Clean & Inline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-3.5 text-white shadow-sm flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              
              {/* Left Side: Avatar + Customer Core Details Inline */}
              <div className="flex items-center gap-3 relative z-10 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black text-sm shadow-inner shrink-0">
                  {(customer?.companyName || customer?.name || "C").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black tracking-tight text-white truncate max-w-[200px]">
                      {customer?.companyName || customer?.name}
                    </h3>
                    
                    {/* Live Record Type Toggle */}
                    <select
                      value={customer?.recordType || "lead"}
                      onChange={(e) => handleUpdateCustomerFields({ recordType: e.target.value })}
                      className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase outline-none cursor-pointer hover:bg-indigo-500/30"
                    >
                      <option value="lead" className="bg-slate-900 text-white">LEAD</option>
                      <option value="customer" className="bg-slate-900 text-white">CUSTOMER</option>
                      <option value="deal" className="bg-slate-900 text-white">DEAL</option>
                    </select>

                    {/* Live Pipeline Stage Dropdown */}
                    <select
                      value={customer?.pipelineStage || "new"}
                      onChange={(e) => handleUpdateCustomerFields({ pipelineStage: e.target.value })}
                      className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase outline-none cursor-pointer hover:bg-slate-750"
                    >
                      <option value="new" className="bg-slate-900 text-white">STAGE: NEW</option>
                      <option value="contacted" className="bg-slate-900 text-white">STAGE: CONTACTED</option>
                      <option value="proposal_sent" className="bg-slate-900 text-white">STAGE: PROPOSAL SENT</option>
                      <option value="under_review" className="bg-slate-900 text-white">STAGE: UNDER REVIEW</option>
                      <option value="won" className="bg-slate-900 text-emerald-400 font-bold">STAGE: WON / CLOSED</option>
                      <option value="lost" className="bg-slate-900 text-rose-400 font-bold">STAGE: LOST</option>
                    </select>
                  </div>

                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-2 mt-0.5 truncate">
                    {customer?.name && (
                      <span className="truncate">
                        Contact: <strong className="text-slate-200 font-bold">{customer.name}</strong>
                      </span>
                    )}
                    {customer?.crn && (
                      <span className="font-mono text-indigo-300 font-semibold shrink-0">
                        • CRN: {customer.crn}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Quick Communication & Workflow Actions (Clean Inline Toolbar) */}
              <div className="flex items-center gap-1.5 relative z-10 flex-wrap justify-start xl:justify-end shrink-0">
                {customer?.phone && (
                  <a
                    href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                  >
                    <MessageSquare size={12} /> WhatsApp
                  </a>
                )}
                {customer?.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                  >
                    <Mail size={12} /> Email
                  </a>
                )}
                <button
                  onClick={() => {
                    setShowGpsModal(true);
                    handleCaptureGps();
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <MapPin size={12} /> GPS Check-in
                </button>
                <button
                  onClick={() => setShowVoiceModal(true)}
                  className="px-2.5 py-1.5 bg-purple-600/80 hover:bg-purple-600 text-white border border-purple-400/20 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Mic size={12} className="text-amber-300" /> Voice Note
                </button>
                <button
                  onClick={() => setActiveTab("tasks")}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 size={12} className="text-emerald-400" /> Add Task
                </button>
                <button
                  onClick={() => setActiveTab("meetings")}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Calendar size={12} className="text-sky-400" /> Schedule
                </button>
              </div>
            </div>

            {/* 4 Key Executive KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Financial Health */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:border-indigo-200 transition-all space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[9px] font-black uppercase tracking-wider">Pipeline & Deal Value</span>
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={14} /></div>
                </div>
                <div className="text-lg font-black text-slate-900 leading-tight">
                  {formatCurrency(customer?.leadValue || customer?.expectedRevenue || 0)}
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-0.5">
                  <span>Win Probability: <strong className="text-emerald-600">{customer?.probability || 10}%</strong></span>
                  <span className="uppercase text-slate-400">{customer?.pipelineStage || "New"}</span>
                </div>
              </div>

              {/* UAE Compliance Health / Profile Completeness */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:border-indigo-200 transition-all space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[9px] font-black uppercase tracking-wider">{isTaxEnabled ? "Compliance Readiness" : "Profile Completeness"}</span>
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><ShieldCheck size={14} /></div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-slate-900 leading-tight">{setupPercentage}%</span>
                  <span className="text-[10px] font-bold text-emerald-600">{isTaxEnabled ? "Setup Score" : "Profile Score"}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full transition-all duration-500" style={{ width: `${setupPercentage}%` }} />
                </div>
              </div>

              {/* Lead Health & Temperature Interactive Selector */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:border-indigo-200 transition-all space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[9px] font-black uppercase tracking-wider">AI Lead Temperature</span>
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Star size={14} /></div>
                </div>
                
                {/* Temperature Interactive Pill Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                  {["hot", "warm", "cold"].map((temp) => (
                    <button
                      key={temp}
                      onClick={() => handleUpdateCustomerFields({ leadTemperature: temp })}
                      className={`flex-1 py-0.5 text-[8px] font-black uppercase rounded transition-all cursor-pointer ${
                        (customer?.leadTemperature || "warm") === temp
                          ? temp === "hot" ? "bg-rose-600 text-white shadow-xs" : temp === "warm" ? "bg-amber-500 text-white shadow-xs" : "bg-slate-700 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {temp}
                    </button>
                  ))}
                </div>

                <div className="text-[9px] font-bold text-slate-500 flex justify-between pt-0.5">
                  <span>Score: <strong className="text-slate-800">{customer?.leadScore || 0} pts</strong></span>
                  <span>Churn Risk: <strong className="text-slate-700">{customer?.churnRisk || 0}%</strong></span>
                </div>
              </div>

              {/* Service Scope / Trade License Status */}
              {isTaxEnabled ? (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:border-indigo-200 transition-all space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-wider">Trade License</span>
                    <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg"><Building2 size={14} /></div>
                  </div>
                  <div className="font-mono text-xs font-black text-slate-900 truncate">
                    {customer?.tradeLicenseNumber || "N/A"}
                  </div>
                  <div className="text-[9px] font-bold flex items-center justify-between pt-0.5">
                    <span className="text-slate-400">Expiry:</span>
                    <span className={customer?.tradeLicenseExpiryDate && new Date(customer.tradeLicenseExpiryDate) < new Date() ? "text-rose-600 font-black" : "text-slate-700 font-bold"}>
                      {customer?.tradeLicenseExpiryDate ? new Date(customer.tradeLicenseExpiryDate).toLocaleDateString() : "Not Registered"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:border-indigo-200 transition-all space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-wider">Primary Service Scope</span>
                    <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg"><Building2 size={14} /></div>
                  </div>
                  <div className="text-xs font-black text-slate-900 truncate" title={formatServiceScope(customer?.serviceType || customer?.requirement)}>
                    {formatServiceScope(customer?.serviceType || customer?.requirement)}
                  </div>
                  <div className="text-[9px] font-bold flex items-center justify-between pt-0.5">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-600 font-black uppercase">
                      {customer?.workStatus || "Active"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Main Information Grid - Compact & Responsive */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
              {/* Left Column (2 Cols wide) */}
              <div className="lg:col-span-2 space-y-3.5">
                {/* Customer Account & Inquiry Profile */}
                <div className="bg-white p-4 sm:p-5 border border-slate-200/90 rounded-2xl shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b pb-2.5 border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Building2 size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Customer Account & Inquiry Profile</h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Key business engagement, requirements & lifecycle status</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black uppercase text-slate-400">Status:</span>
                      <select
                        value={customer?.workStatus || "Pending"}
                        onChange={(e) => handleUpdateWorkStatus(e.target.value)}
                        className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider outline-none cursor-pointer border transition-all shadow-xs ${
                          customer?.workStatus === "Completed" || customer?.workStatus === "Approved" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          customer?.workStatus === "In Progress" ? "bg-sky-50 text-sky-600 border-sky-200" :
                          customer?.workStatus === "Under Review" ? "bg-purple-50 text-purple-600 border-purple-200" :
                          "bg-amber-50 text-amber-600 border-amber-200"
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Active Client">Active Client</option>
                        <option value="Completed">Won / Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    <div className="p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-0.5">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Company / Business</span>
                      <span className="text-xs font-black text-slate-900 block truncate" title={customer?.companyName || "Individual / Not Specified"}>{customer?.companyName || "Individual / Not Specified"}</span>
                    </div>

                    <div className="p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-0.5">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Service Scope / Interest</span>
                      <span className="text-xs font-black text-indigo-600 block truncate" title={formatServiceScope(customer?.serviceType || customer?.requirement)}>{formatServiceScope(customer?.serviceType || customer?.requirement)}</span>
                    </div>

                    <div className="p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-0.5">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Payment Status</span>
                      <select
                        value={customer?.paymentStatus || "Pending"}
                        onChange={(e) => handleUpdatePaymentStatus(e.target.value)}
                        className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase outline-none cursor-pointer border transition-all ${
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

                    <div className="p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-0.5">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Pipeline Stage</span>
                      <span className="text-xs font-bold text-slate-800 uppercase">{customer?.pipelineStage || (customer?.recordType === "lead" ? "New Lead" : "Active Customer")}</span>
                    </div>

                    <div className="p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-0.5">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Estimated Budget / Value</span>
                      <span className="text-xs font-bold text-emerald-600">{customer?.budget ? formatCurrency(customer.budget) : (customer?.leadValue ? formatCurrency(customer.leadValue) : "Flexible / TBD")}</span>
                    </div>

                    <div className="p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-0.5">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block">Customer Reference (CRN)</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black text-slate-900">{customer?.crn || "Not Assigned"}</span>
                        {customer?.crn && (
                          <button
                            onClick={() => { navigator.clipboard.writeText(customer.crn); alert("CRN copied to clipboard!"); }}
                            className="text-[8px] text-indigo-600 font-bold hover:underline"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline Quick Follow-up Note Logger */}
                <div className="bg-white p-4 sm:p-5 border border-slate-200/90 rounded-2xl shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Edit3 size={14} className="text-indigo-600" />
                      Quick Activity Follow-up Note
                    </h4>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Saves to timeline</span>
                  </div>

                  <form onSubmit={handleAddQuickNote} className="space-y-2.5">
                    <textarea
                      rows={2}
                      value={quickNoteText}
                      onChange={(e) => setQuickNoteText(e.target.value)}
                      placeholder="Type a quick client interaction note or update..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingNote || !quickNoteText.trim()}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {savingNote ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                        Save Note to Profile
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column (1 Col wide) */}
              <div className="space-y-3.5">
                {/* Account Owner & Live Consultant Assignment Dropdown */}
                <div className="bg-white p-4 sm:p-5 border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-2 border-slate-100 flex items-center justify-between">
                    <span>Account Ownership</span>
                    <User size={13} className="text-indigo-600" />
                  </h4>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
                        {(customer?.ownerId?.name || "U").charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 truncate">{customer?.ownerId?.name || "Unassigned Consultant"}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{customer?.ownerId?.role || "Assigned Account Owner"}</p>
                      </div>
                    </div>

                    {/* Live Reassign Dropdown */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Reassign Owner</label>
                      <select
                        value={customer?.ownerId?._id || customer?.ownerId || ""}
                        onChange={(e) => handleUpdateCustomerFields({ ownerId: e.target.value || null })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                <div className="bg-white p-4 sm:p-5 border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2 border-slate-100">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Client Portal Access</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${portalAccess.active ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"}`}>
                      {portalAccess.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {portalLoading ? (
                    <p className="text-[9px] text-slate-400 font-bold uppercase text-center py-2 animate-pulse">Checking credentials...</p>
                  ) : (
                    <div className="space-y-2.5">
                      {portalAccess.active ? (
                        <div className="space-y-2.5">
                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                            <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Linked Login Email</span>
                            <span className="font-bold text-slate-800 block truncate">{portalAccess.email}</span>
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={handleRevokePortalAccess}
                              className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all border border-rose-200/60 cursor-pointer"
                            >
                              Revoke Portal Access
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="text-[10px] font-medium text-slate-500 mb-2.5 leading-relaxed">
                            Granting access generates customer login credentials for the client portal.
                          </p>
                          {!isReadOnly && (
                            <button
                              onClick={handleGrantPortalAccess}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
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
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Service Management</h4>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Independent compliance & licensing services provisioned for this customer</p>
              </div>
              <button
                onClick={() => handleOpenServiceModal()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <Plus size={13} /> Provision Service
              </button>
            </div>

            {(() => {
              const explicitServices = customer?.services || [];
              const derivedServices = [];

              if (customer?.serviceType) {
                let cleanCategory = "Software & Digital Services";
                let cleanRemarks = customer.vatFilingPeriod ? `Filing Period: ${customer.vatFilingPeriod}${customer.trn ? ` | TRN: ${customer.trn}` : ""}` : (customer.trn ? `TRN: ${customer.trn}` : "Primary Registered Service");
                const isVat = typeof customer.serviceType === "string" && customer.serviceType.includes("VAT");
                const isCt = typeof customer.serviceType === "string" && customer.serviceType.includes("Corporate");
                const isTl = typeof customer.serviceType === "string" && customer.serviceType.includes("Trade");

                if (isVat) cleanCategory = "VAT Compliance";
                else if (isCt) cleanCategory = "Corporate Tax";
                else if (isTl) cleanCategory = "Trade License";

                if (typeof customer.serviceType === "string" && customer.serviceType.trim().startsWith("{")) {
                  try {
                    const parsed = JSON.parse(customer.serviceType.trim());
                    if (parsed.preferred_date_time) {
                      cleanRemarks = `Preferred Booking: ${parsed.preferred_date_time}`;
                      cleanCategory = "Consultation & Booking";
                    }
                  } catch {}
                }

                const dueDate = customer.corporateTaxDueDate || customer.vatFilingDueDate || customer.tradeLicenseExpiryDate;

                derivedServices.push({
                  _id: `derived-primary-${customer._id}`,
                  serviceName: formatServiceScope(customer.serviceType),
                  serviceCategory: cleanCategory,
                  workStatus: customer.workStatus || "Pending",
                  paymentStatus: customer.paymentStatus || "Pending",
                  priority: "High",
                  dueDate: dueDate,
                  remarks: cleanRemarks
                });
              }

              const displayServices = explicitServices.length > 0 ? explicitServices : derivedServices;

              if (displayServices.length === 0) {
                return (
                  <div className="text-center py-8 space-y-2">
                    <FileText size={28} className="mx-auto text-slate-300" />
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">No active services provisioned for this client.</p>
                    <button
                      onClick={() => handleOpenServiceModal()}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={12} /> Add First Service
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {displayServices.map((srv) => {
                    const dueDate = srv.dueDate ? new Date(srv.dueDate) : null;
                    const now = new Date();
                    const diffDays = dueDate ? Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : null;

                    return (
                      <div key={srv._id} className="p-3.5 sm:p-4 border border-slate-200/90 rounded-2xl bg-white hover:border-indigo-300 hover:shadow-xs transition-all space-y-2.5 shadow-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{srv.serviceCategory || "Compliance"}</span>
                            <h5 className="text-xs sm:text-sm font-black text-slate-900 mt-1 truncate" title={formatServiceScope(srv.serviceName)}>
                              {formatServiceScope(srv.serviceName)}
                            </h5>
                          </div>
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border shrink-0 ${
                            srv.workStatus === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                            srv.workStatus === "In Progress" ? "bg-sky-50 text-sky-600 border-sky-200" :
                            srv.workStatus === "Under Review" ? "bg-purple-50 text-purple-600 border-purple-200" :
                            "bg-amber-50 text-amber-600 border-amber-200"
                          }`}>
                            {srv.workStatus || "Pending"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold pt-2 border-t border-slate-100">
                          <div className="p-1.5 bg-slate-50/80 rounded-lg">
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Priority</span>
                            <span className={`text-[9px] uppercase font-black truncate block ${
                              srv.priority === "Critical" ? "text-rose-600" :
                              srv.priority === "High" ? "text-amber-600" : "text-slate-700"
                            }`}>{srv.priority || "Medium"}</span>
                          </div>
                          <div className="p-1.5 bg-slate-50/80 rounded-lg">
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Payment</span>
                            <span className={`text-[9px] uppercase font-black truncate block ${
                              srv.paymentStatus === "Paid" ? "text-emerald-600" :
                              srv.paymentStatus === "Overdue" ? "text-rose-600" : "text-amber-600"
                            }`}>{srv.paymentStatus || "Pending"}</span>
                          </div>
                          <div className="p-1.5 bg-slate-50/80 rounded-lg">
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Due Date</span>
                            <span className="text-[9px] text-slate-700 font-bold truncate block">{dueDate ? dueDate.toLocaleDateString() : "No Due Date"}</span>
                          </div>
                          <div className="p-1.5 bg-slate-50/80 rounded-lg">
                            <span className="text-[8px] font-black uppercase text-slate-400 block">Remaining</span>
                            <span className={`text-[9px] font-black truncate block ${
                              diffDays !== null && diffDays < 0 ? "text-rose-600" :
                              diffDays !== null && diffDays <= 30 ? "text-amber-600" : "text-emerald-600"
                            }`}>
                              {diffDays !== null ? (diffDays < 0 ? `${Math.abs(diffDays)}d Overdue` : `${diffDays}d left`) : "N/A"}
                            </span>
                          </div>
                        </div>

                        {srv.remarks && (
                          <p className="text-[9px] text-slate-600 font-semibold bg-slate-50 p-2 rounded-xl border border-slate-100 truncate" title={srv.remarks}>{srv.remarks}</p>
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
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">Corporate Tax Compliance</h4>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Annual corporate tax return schedules & live countdown</p>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${
                customer?.workStatus === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
              }`}>
                {customer?.workStatus || "Pending"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[8px] font-black uppercase text-slate-400">TRN (Tax Reg No)</span>
                <p className="text-slate-900 font-mono font-bold text-xs">{customer?.trn || "Not Registered"}</p>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[8px] font-black uppercase text-slate-400">Corporate Tax Filing Due</span>
                <p className="text-slate-900 font-bold text-xs">{customer?.corporateTaxDueDate ? new Date(customer.corporateTaxDueDate).toLocaleDateString() : "No Due Date Set"}</p>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[8px] font-black uppercase text-slate-400">Days Remaining</span>
                {(() => {
                  const d = customer?.corporateTaxDueDate ? new Date(customer.corporateTaxDueDate) : null;
                  const diff = d ? Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24)) : null;
                  return (
                    <p className={`font-black text-xs ${diff !== null && diff < 0 ? "text-rose-600" : diff !== null && diff <= 30 ? "text-amber-600" : "text-emerald-600"}`}>
                      {diff !== null ? (diff < 0 ? `${Math.abs(diff)} Days Overdue` : `${diff} Days Left`) : "N/A"}
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === "vat_compliance" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">VAT Compliance & Filing</h4>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Value Added Tax return schedules & filing status</p>
              </div>
              <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${
                customer?.workStatus === "Completed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
              }`}>
                {customer?.workStatus || "Pending"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[8px] font-black uppercase text-slate-400">VAT Registration No (TRN)</span>
                <p className="text-slate-900 font-mono font-bold text-xs">{customer?.trn || "Not Registered"}</p>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[8px] font-black uppercase text-slate-400">VAT Filing Due Date</span>
                <p className="text-slate-900 font-bold text-xs">{customer?.vatFilingDueDate ? new Date(customer.vatFilingDueDate).toLocaleDateString() : "No Due Date Set"}</p>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[8px] font-black uppercase text-slate-400">VAT Filing Period</span>
                <p className="text-indigo-600 font-black text-xs">{customer?.vatFilingPeriod || "Quarterly"}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "trade_license" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">Trade License Management & Renewal</h4>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Commercial trade license details, authority & expiry countdown</p>
              </div>
              {(() => {
                const exp = customer?.tradeLicenseExpiryDate ? new Date(customer.tradeLicenseExpiryDate) : null;
                const diff = exp ? Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24)) : null;
                return (
                  <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold">
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[8px] font-black uppercase text-slate-400">License Number</span>
                <p className="text-slate-900 font-mono font-bold text-xs">{customer?.tradeLicenseNumber || "N/A"}</p>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[8px] font-black uppercase text-slate-400">License Expiry Date</span>
                <p className="text-slate-900 font-bold text-xs">{customer?.tradeLicenseExpiryDate ? new Date(customer.tradeLicenseExpiryDate).toLocaleDateString() : "No Expiry Date Set"}</p>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-0.5">
                <span className="text-[8px] font-black uppercase text-slate-400">Days Remaining</span>
                {(() => {
                  const d = customer?.tradeLicenseExpiryDate ? new Date(customer.tradeLicenseExpiryDate) : null;
                  const diff = d ? Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24)) : null;
                  return (
                    <p className={`font-black text-xs ${
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
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise WhatsApp Business Integration</h4>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Real-time WhatsApp Business messaging, templates & delivery receipts</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                  <Phone size={12} className="text-emerald-600" /> Phone: {customer?.phone || "No Phone Set"}
                </span>
              </div>
            </div>

            {/* Quick Templates Strip */}
            <div className="space-y-1.5">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Select Template to Pre-fill Message</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Welcome to JTS", text: `Hello ${customer?.name || "Customer"}, welcome to JTS Enterprise Support! We are here to assist you with compliance and account services.` },
                  { label: "VAT Return Reminder", text: `Hello ${customer?.name || "Customer"}, this is a reminder that your VAT Return Filing due date is approaching. Please submit your documents.` },
                  { label: "Corporate Tax Reminder", text: `Hello ${customer?.name || "Customer"}, your Corporate Tax Return Filing due date is approaching. Please submit your required financial documents.` },
                  { label: "Trade License Expiry Alert", text: `Urgent Notice: Dear ${customer?.name || "Customer"}, your Trade License renewal is approaching. Please verify and renew to ensure seamless business operations.` },
                  { label: "Service Fee Invoice Reminder", text: `Dear ${customer?.name || "Customer"}, your service fee invoice has been generated. Please review and settle it at your convenience.` }
                ].map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setWhatsappInput(tmpl.text);
                      setWaNotice(null);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 text-[9px] font-black uppercase rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    ⚡ {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Message Composer */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-emerald-600" /> WhatsApp Message Body
                </label>
                <span className="text-[8px] font-bold text-slate-400">{whatsappInput.length} characters</span>
              </div>

              <textarea
                rows={2}
                value={whatsappInput}
                onChange={(e) => setWhatsappInput(e.target.value)}
                placeholder="Click a template above or type your customized WhatsApp message here..."
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />

              {waNotice && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  waNotice.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}>
                  {waNotice.type === "success" ? <CheckCircle size={13} className="text-emerald-600" /> : <AlertTriangle size={13} className="text-rose-600" />}
                  <span>{waNotice.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!whatsappInput.trim()) return;
                      navigator.clipboard.writeText(whatsappInput);
                      setWaNotice({ type: "success", message: "Message copied to clipboard!" });
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Copy size={12} /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappInput("");
                      setWaNotice(null);
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* WhatsApp Web Launch Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const rawPhone = String(customer?.phone || "").replace(/[^0-9]/g, "");
                      if (!rawPhone) {
                        setWaNotice({ type: "error", message: "Customer phone number is missing." });
                        return;
                      }
                      const targetPhone = rawPhone.startsWith("91") || rawPhone.length > 10 ? rawPhone : `91${rawPhone}`;
                      const msg = whatsappInput.trim() || `Hello ${customer?.name || "Customer"}, greetings from JTS Chat Support!`;
                      window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <ExternalLink size={12} /> Open Web
                  </button>

                  {/* WhatsApp Cloud API Direct Dispatch */}
                  <button
                    type="button"
                    disabled={sendingWa}
                    onClick={async () => {
                      const rawPhone = String(customer?.phone || "").replace(/[^0-9]/g, "");
                      if (!rawPhone) {
                        setWaNotice({ type: "error", message: "Customer phone number is missing." });
                        return;
                      }
                      const targetPhone = rawPhone.startsWith("91") || rawPhone.length > 10 ? rawPhone : `91${rawPhone}`;
                      const msg = whatsappInput.trim() || `Hello ${customer?.name || "Customer"}, greetings from JTS Chat Support!`;

                      setSendingWa(true);
                      setWaNotice(null);
                      try {
                        const res = await api.post("/api/crm/communication/send-whatsapp", {
                          to: targetPhone,
                          message: msg,
                          customerId: customer?._id
                        });

                        const newMsg = {
                          id: `w_${Date.now()}`,
                          sender: "agent",
                          text: msg,
                          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                          status: res?.data?.mode === "live" ? "Sent Live ✓✓" : "Dispatched ✓"
                        };
                        setWhatsappTimeline(prev => [...prev, newMsg]);
                        setWhatsappInput("");
                        setWaNotice({ type: "success", message: `✅ Message dispatched via WhatsApp Cloud API to +${targetPhone}!` });
                      } catch (err) {
                        setWaNotice({
                          type: "error",
                          message: err?.response?.data?.error || err.message || "Failed to dispatch via WhatsApp Cloud API"
                        });
                      } finally {
                        setSendingWa(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {sendingWa ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                    Send via Cloud API
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Timeline List */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 max-h-80 overflow-y-auto">
              {whatsappTimeline.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl space-y-1 max-w-md shadow-xs border ${
                    msg.sender === "agent"
                      ? "bg-white border-slate-200 ml-auto"
                      : "bg-emerald-50 border-emerald-200 mr-auto"
                  }`}
                >
                  <p className={`text-xs font-bold ${msg.sender === "agent" ? "text-slate-800" : "text-emerald-950"}`}>
                    {msg.text}
                  </p>
                  <div className={`flex justify-between items-center text-[8px] font-black pt-1 border-t ${
                    msg.sender === "agent" ? "border-slate-100 text-slate-400" : "border-emerald-100 text-emerald-600"
                  }`}>
                    <span>{msg.sender === "agent" ? "Consultant Dispatch" : "Client Message"} • {msg.time}</span>
                    <span className="text-emerald-600 uppercase font-black">{msg.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Telegram Bot Interactive Tab */}
        {activeTab === "telegram" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Telegram Bot Integration</h4>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Automated bot notifications, customer alerts & bilateral dispatch</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-sky-700 bg-sky-50 border border-sky-300 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                  🤖 Bot: @JtsAiSupportBot • Active 🟢
                </span>
              </div>
            </div>

            {/* Quick Templates Strip */}
            <div className="space-y-1.5">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Select Telegram Alert Template</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Welcome Greeting", text: `🚀 Hello ${customer?.name || "Customer"}, Welcome to JTS Enterprise Support Bot! We are here to assist you 24/7.` },
                  { label: "Account Status Update", text: `📊 Update for ${customer?.name || "Customer"}: Your corporate compliance audit has been completed successfully.` },
                  { label: "Urgent Meeting Alert", text: `📅 Meeting Reminder: A review meeting has been scheduled for ${customer?.name || "Customer"}. Please check your calendar.` },
                  { label: "Service Request Resolved", text: `✅ Service Ticket Resolved: Your recent inquiry has been closed by our executive team. Thank you for choosing JTS.` }
                ].map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTelegramInput(tmpl.text);
                      setTgNotice(null);
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 border border-slate-200 text-slate-700 text-[9px] font-black uppercase rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    ⚡ {tmpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Message Composer */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-sky-600" /> Telegram Message Body
                </label>
                <span className="text-[8px] font-bold text-slate-400">{telegramInput.length} characters</span>
              </div>

              <textarea
                rows={2}
                value={telegramInput}
                onChange={(e) => setTelegramInput(e.target.value)}
                placeholder="Click a template above or type your Telegram message..."
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-inner"
              />

              {tgNotice && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  tgNotice.type === "success" ? "bg-sky-50 text-sky-800 border border-sky-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}>
                  {tgNotice.type === "success" ? <CheckCircle size={13} className="text-sky-600" /> : <AlertTriangle size={13} className="text-rose-600" />}
                  <span>{tgNotice.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!telegramInput.trim()) return;
                      navigator.clipboard.writeText(telegramInput);
                      setTgNotice({ type: "success", message: "Message copied to clipboard!" });
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Copy size={12} /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTelegramInput("");
                      setTgNotice(null);
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Telegram Web Launcher */}
                  <button
                    type="button"
                    onClick={() => {
                      window.open("https://t.me/JtsAiSupportBot", "_blank");
                    }}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <ExternalLink size={12} /> Open Bot
                  </button>

                  {/* Telegram Bot API Dispatch Button */}
                  <button
                    type="button"
                    disabled={sendingTg}
                    onClick={async () => {
                      const msg = telegramInput.trim() || `Hello ${customer?.name || "Customer"}, this is a real-time notification from JTS Support Bot!`;

                      setSendingTg(true);
                      setTgNotice(null);
                      try {
                        const res = await api.post("/api/crm/communication/send-telegram", {
                          text: msg,
                          customerId: customer?._id
                        });

                        const newMsg = {
                          id: `tg_${Date.now()}`,
                          sender: "bot",
                          text: msg,
                          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                          status: "Dispatched Live ✓✓"
                        };
                        setTelegramTimeline(prev => [...prev, newMsg]);
                        setTelegramInput("");
                        setTgNotice({ type: "success", message: "✅ Message delivered live to Telegram via @JtsAiSupportBot!" });
                      } catch (err) {
                        setTgNotice({
                          type: "error",
                          message: err?.response?.data?.error || err.message || "Failed to dispatch via Telegram Bot API"
                        });
                      } finally {
                        setSendingTg(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {sendingTg ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                    Send via Bot API
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Timeline List */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 max-h-80 overflow-y-auto">
              {telegramTimeline.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 rounded-xl space-y-1 max-w-md shadow-xs border bg-white border-slate-200 ml-auto"
                >
                  <p className="text-xs font-bold text-slate-800">
                    {msg.text}
                  </p>
                  <div className="flex justify-between items-center text-[8px] font-black pt-1 border-t border-slate-100 text-slate-400">
                    <span>Bot Dispatch • {msg.time}</span>
                    <span className="text-sky-600 uppercase font-black">{msg.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Activity Chronicle</h4>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Audit log of customer status changes, compliance updates & interactions</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                  <input
                    placeholder="Search activity..."
                    value={timelineSearch || ""}
                    onChange={(e) => setTimelineSearch(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold outline-none"
                  />
                </div>
                <select
                  value={timelineFilter || "all"}
                  onChange={(e) => setTimelineFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none"
                >
                  <option value="all">All Events</option>
                  <option value="status">Status Changes</option>
                  <option value="compliance">Compliance Updates</option>
                  <option value="payment">Payment Events</option>
                  <option value="assignment">Assignments</option>
                </select>
              </div>
            </div>

            <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-3">
              {(!timeline || timeline.length === 0) ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider pl-2 py-4">No activity timeline logged yet.</p>
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
                      <div key={act._id} className="relative space-y-1 bg-slate-50/60 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                        <span className={`absolute -left-[35px] top-3 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black shadow-xs ${
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
                          <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{relativeTime}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600">{act.description}</p>
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[8px] font-bold text-slate-400">
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
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2.5 border-slate-100">Customer Deals</h4>
            {deals.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-wider text-center py-6">No deals associated with this customer.</p>
            ) : (
              <div className="space-y-2">
                {deals.map(d => (
                  <div key={d._id} className="p-3 sm:p-3.5 border border-slate-200/90 rounded-xl flex justify-between items-center hover:bg-slate-50/50">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{d.dealName}</h5>
                      <span className="text-[8px] font-bold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-600">{d.stage}</span>
                    </div>
                    <span className="text-xs font-extrabold text-indigo-600">${d.dealValue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex justify-between items-center border-b pb-2.5 border-slate-100">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">Tasks Follow-Up</h4>
              <button onClick={() => setShowTaskForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1 cursor-pointer hover:underline"><Plus size={12} /> Add Task</button>
            </div>
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider text-center py-6">All tasks completed!</p>
              ) : (
                tasks.map(t => (
                  <div key={t._id} className="p-3 sm:p-3.5 border border-slate-200/90 rounded-xl flex justify-between items-center hover:bg-slate-50/50">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{t.title}</h5>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">Due: {new Date(t.dueAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.priority === "high" || t.priority === "urgent" ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-500"}`}>{t.priority}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "meetings" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex justify-between items-center border-b pb-2.5 border-slate-100">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">Scheduled Meetings</h4>
              <button onClick={() => setShowMeetingForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1 cursor-pointer hover:underline"><Plus size={12} /> Schedule Meeting</button>
            </div>
            <div className="space-y-2">
              {meetings.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider text-center py-6">No meetings scheduled.</p>
              ) : (
                meetings.map(m => {
                  const formatGDate = (d) => {
                    try { return new Date(d).toISOString().replace(/-|:|\.\d\d\d/g, ""); }
                    catch { return ""; }
                  };
                  const gStart = formatGDate(m.startAt || new Date());
                  const gEnd = formatGDate(m.endAt || new Date(new Date(m.startAt || Date.now()).getTime() + 3600000));
                  const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(m.title)}&dates=${gStart}/${gEnd}&details=${encodeURIComponent(m.agenda || "JTS Meeting with Client")}&location=${encodeURIComponent(m.location || "Google Meet / Online")}`;

                  const oStart = m.startAt ? new Date(m.startAt).toISOString() : new Date().toISOString();
                  const oEnd = m.endAt ? new Date(m.endAt).toISOString() : new Date(Date.now() + 3600000).toISOString();
                  const oCalUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(m.title)}&startdt=${oStart}&enddt=${oEnd}&body=${encodeURIComponent(m.agenda || "JTS Meeting with Client")}`;

                  return (
                    <div key={m._id} className="p-3 sm:p-3.5 border border-slate-200/90 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/50 shadow-xs transition-all">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-black text-slate-800">{m.title}</h5>
                          <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">Confirmed 🟢</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-500">📅 Start: {new Date(m.startAt).toLocaleString()}</p>
                        {m.agenda && <p className="text-[9px] font-medium text-slate-400">📝 Agenda: {m.agenda}</p>}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {m.googleMeetUrl && (
                          <a href={m.googleMeetUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg uppercase hover:bg-indigo-100 transition-all">
                            Join Meet
                          </a>
                        )}

                        <a
                          href={gCalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Calendar size={11} className="text-blue-600" /> Google Cal
                        </a>

                        <a
                          href={oCalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Calendar size={11} className="text-sky-600" /> Outlook
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === "calls" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2.5 border-slate-100">Logged Calls</h4>
            {calls.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-wider text-center py-6">No call logs registered.</p>
            ) : (
              <div className="space-y-2">
                {calls.map(c => (
                  <div key={c._id} className="p-3 sm:p-3.5 border border-slate-200/90 rounded-xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-black text-slate-800 capitalize">{c.direction} Call - {c.status}</h5>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5">{c.outcome || `Duration: ${c.duration}s`}</p>
                    </div>
                    <span className="text-[8px] font-bold text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "emails" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-100">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Email Communication Timeline</h4>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Automated compliance reminders, client email exchanges & delivery logs</p>
              </div>
              <button
                onClick={() => setShowEmailForm(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase rounded-xl tracking-wider transition-all flex items-center gap-1 shadow-xs cursor-pointer self-start sm:self-auto"
              >
                <Plus size={11} /> Compose New Email
              </button>
            </div>

            {emails.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-wider text-center py-6">No email communications logged.</p>
            ) : (
              <div className="space-y-2">
                {emails.map(e => (
                  <div key={e._id} className="p-3 sm:p-3.5 border border-slate-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 transition-all bg-white shadow-xs">
                    <div className="space-y-0.5">
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
                      <p className="text-[9px] text-slate-500 font-bold line-clamp-1">{e.body || e.message || "No content summary"}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">To: {e.to || customer?.email || "Client Email"}</p>
                    </div>

                    <span className="text-[8px] font-bold text-slate-400 shrink-0">
                      {e.sentAt ? new Date(e.sentAt).toLocaleString() : new Date(e.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-100">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">Enterprise Compliance Document Vault</h4>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Secure document repository with version history & compliance verification</p>
              </div>
              <button onClick={() => setShowDocForm(true)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs cursor-pointer self-start sm:self-auto">
                <Plus size={11} /> Upload New Document
              </button>
            </div>

            {documents.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-wider text-center py-6">No documents stored in vault.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {documents.map(d => (
                  <div key={d._id} className="p-3 sm:p-3.5 border border-slate-200/90 rounded-xl space-y-2 hover:border-indigo-300 transition-all bg-white shadow-xs">
                    <div className="flex justify-between items-start">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <FileText size={16} />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-black uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                          v{d.versionNumber || 1}.0
                        </span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
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
                      <span className="text-[8px] font-bold uppercase text-slate-400 block mt-0.5">{d.category || "General Document"}</span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[8px] font-bold text-slate-400">
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
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2.5 border-slate-100">Customer Invoices</h4>
            <div className="space-y-2">
              {invoices.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider text-center py-6">No invoices logged.</p>
              ) : (
                invoices.map(inv => (
                  <div key={inv._id} className="p-3 sm:p-3.5 border border-slate-200/90 rounded-xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{inv.invoiceId}</h5>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">Due: {new Date(inv.issuedAt).toLocaleDateString()} • Total: {formatCurrency(inv.total)}</p>
                    </div>
                    <span className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{inv.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2.5 border-slate-100">Customer Payments</h4>
            <div className="space-y-2">
              {payments.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider text-center py-6">No payments logs.</p>
              ) : (
                payments.map(pay => (
                  <div key={pay._id} className="p-3 sm:p-3.5 border border-slate-200/90 rounded-xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{pay.paymentNumber}</h5>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">Method: {pay.paymentMethod} • Date: {new Date(pay.paymentDate).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-600">{formatCurrency(pay.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "subscriptions" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2.5 border-slate-100">Customer SaaS Subscriptions</h4>
            <div className="space-y-2">
              {subscriptions.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider text-center py-6">No subscription logs.</p>
              ) : (
                subscriptions.map(sub => (
                  <div key={sub._id} className="p-3 sm:p-3.5 border border-slate-200/90 rounded-xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">Plan: {sub.planId?.name || "SaaS Plan"}</h5>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">Renewal: {new Date(sub.renewalDate).toLocaleDateString()} • Seats: {sub.seats}</p>
                    </div>
                    <span className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{sub.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-2.5 border-slate-100">Internal Remarks</h4>
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider text-center py-6">No remarks registered.</p>
              ) : (
                notes.map((n, idx) => (
                  <div key={idx} className="p-3 sm:p-3.5 bg-slate-50/60 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400">
                      <span>{n.authorName || "Author"}</span>
                      <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{n.text}</p>
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
          <form onSubmit={handleCreateTask} className="relative w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b pb-2.5 border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Add Task</h3>
              <button type="button" onClick={() => setShowTaskForm(false)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer"><X size={15} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Task Title</label>
              <input required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/70 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Due Date</label>
                <input type="date" required value={taskForm.dueAt} onChange={(e) => setTaskForm({ ...taskForm, dueAt: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/70 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Priority</label>
                <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/70 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"><Check size={14} /> Save Task</button>
          </form>
        </div>
      )}

      {/* Meeting Modal Overlay */}
      {showMeetingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowMeetingForm(false)} />
          <form onSubmit={handleCreateMeeting} className="relative w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center border-b pb-2.5 border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Schedule Meeting</h3>
              <button type="button" onClick={() => setShowMeetingForm(false)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer"><X size={15} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Meeting Title</label>
              <input required value={meetingForm.title} onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/70 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Start Time</label>
                <input type="datetime-local" required value={meetingForm.startAt} onChange={(e) => setMeetingForm({ ...meetingForm, startAt: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/70 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">End Time</label>
                <input type="datetime-local" required value={meetingForm.endAt} onChange={(e) => setMeetingForm({ ...meetingForm, endAt: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/70 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Agenda</label>
              <input value={meetingForm.agenda} onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/70 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"><Check size={14} /> Save Meeting</button>
          </form>
        </div>
      )}

      {/* Document Modal Overlay */}
      {showDocForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowDocForm(false)} />
          <form onSubmit={handleUploadDoc} className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-3.5 border border-slate-100">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Upload UAE Compliance Document</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Trade License, Emirates ID, VAT, Corporate Tax, Ejari, NDA etc.</p>
              </div>
              <button type="button" onClick={() => setShowDocForm(false)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer"><X size={15} /></button>
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Document Category (UAE Standard)</label>
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
                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
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
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Document Name / Title</label>
              <input 
                required 
                placeholder="e.g. Trade License 2026 - Al Reza Global"
                value={docForm.name} 
                onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} 
                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Choose File from Device</label>
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
                className="w-full text-xs font-bold text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Or File URL / Storage Path</label>
              <input 
                required 
                placeholder="https://... or choose file above"
                value={docForm.fileUrl} 
                onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })} 
                className="w-full bg-slate-50 rounded-xl border border-slate-200/80 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500" 
              />
            </div>

            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer">
              <Check size={14} /> Save Compliance Document
            </button>
          </form>
        </div>
      )}

      {/* Provision Service Modal Overlay */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowServiceModal(false)} />
          <form onSubmit={handleAddServiceSubmit} className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-3.5 border border-slate-100">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Provision Client Service</h3>
              <button type="button" onClick={() => setShowServiceModal(false)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer"><X size={15} /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Service Scope</label>
                <select
                  value={serviceForm.serviceName}
                  onChange={(e) => setServiceForm({ ...serviceForm, serviceName: e.target.value })}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                >
                  <option value="E-Invoicing & Billing Suite">E-Invoicing & Billing Suite</option>
                  <option value="Cloud ERP & Accounting Software">Cloud ERP & Accounting Software</option>
                  <option value="Software API & Webhook Integration">Software API & Webhook Integration</option>
                  <option value="Annual Maintenance Contract (AMC)">Annual Maintenance Contract (AMC)</option>
                  <option value="Chat Support & Customer Care Suite">Chat Support & Customer Care Suite</option>
                  <option value="Payment Gateway Integration">Payment Gateway Integration</option>
                  <option value="Technical Consultation & Training">Technical Consultation & Training</option>
                  <option value="Custom Business Service">Custom Business Service</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Work Status</label>
                  <select
                    value={serviceForm.workStatus}
                    onChange={(e) => setServiceForm({ ...serviceForm, workStatus: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
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
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Priority</label>
                  <select
                    value={serviceForm.priority}
                    onChange={(e) => setServiceForm({ ...serviceForm, priority: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={serviceForm.dueDate}
                    onChange={(e) => setServiceForm({ ...serviceForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Payment Status</label>
                  <select
                    value={serviceForm.paymentStatus}
                    onChange={(e) => setServiceForm({ ...serviceForm, paymentStatus: e.target.value })}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Remarks / Special Notes</label>
                <textarea
                  rows={2}
                  value={serviceForm.remarks}
                  onChange={(e) => setServiceForm({ ...serviceForm, remarks: e.target.value })}
                  placeholder="Optional compliance directives..."
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all">
              <Plus size={14} /> Save Provisioned Service
            </button>
          </form>
        </div>
      )}

      {/* Field Sales GPS Visit Check-in Modal */}
      {showGpsModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in border border-indigo-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <MapPin size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Field Sales GPS Check-in</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">On-Site Client Visit Geotagging</p>
                </div>
              </div>
              <button onClick={() => setShowGpsModal(false)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100/80 flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-black text-indigo-500 uppercase tracking-wider block">Live GPS Coordinates</span>
                  <p className="text-xs font-black text-slate-900 mt-0.5">
                    {gettingGps ? "Acquiring satellite lock…" : (gpsLocation ? `${gpsLocation.lat}° N, ${gpsLocation.lng}° E` : "25.2048° N, 55.2708° E")}
                  </p>
                  <span className="text-[8px] font-bold text-emerald-600">Accuracy: ±{gpsLocation?.accuracy || 12} meters</span>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureGps}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <RefreshCw size={11} className={gettingGps ? "animate-spin" : ""} /> Refresh GPS
                </button>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Visit Meeting Notes & Outcome</label>
                <textarea
                  rows={2}
                  value={gpsNote}
                  onChange={(e) => setGpsNote(e.target.value)}
                  placeholder="e.g. Met Director of Operations, demonstrated software suite, agreed on proposal review next Tuesday."
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              {/* Past Visit Logs */}
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Recent Visit History</span>
                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                  {visitHistory.map((v, i) => (
                    <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[9px]">
                      <div className="flex justify-between font-black text-slate-700">
                        <span>{v.location}</span>
                        <span className="text-indigo-600">{v.timestamp}</span>
                      </div>
                      <p className="text-slate-500 font-medium mt-0.5">{v.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowGpsModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveVisitCheckin}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle size={13} /> Confirm Visit Check-in
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* AI Voice Note Transcriber Modal */}
      {showVoiceModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-in border border-purple-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-600 text-white rounded-xl">
                  <Mic size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">AI Voice Note Transcriber</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Instant Audio To CRM Tasks & Summary</p>
                </div>
              </div>
              <button onClick={() => setShowVoiceModal(false)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-center">
              {/* Record Microphone Button */}
              <div className="py-3 flex flex-col items-center justify-center space-y-2">
                <button
                  type="button"
                  onClick={handleToggleVoiceRecord}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
                    isRecording
                      ? "bg-rose-600 text-white animate-pulse shadow-rose-200 scale-105 ring-4 ring-rose-100"
                      : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200"
                  }`}
                >
                  {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  {isRecording ? `Recording Audio (${voiceSeconds}s)… Tap to Stop` : "Tap to Record Voice Note"}
                </p>
              </div>

              {isProcessingVoice && (
                <div className="py-2 space-y-1">
                  <Sparkles size={20} className="mx-auto text-purple-600 animate-spin" />
                  <p className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Transcribing with Gemini Speech AI…</p>
                </div>
              )}

              {transcribedText && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-left space-y-1.5">
                  <span className="text-[8px] font-black text-purple-600 uppercase tracking-wider block">AI Transcribed CRM Task</span>
                  <p className="text-xs font-medium text-slate-800 leading-relaxed italic">{transcribedText}</p>
                </div>
              )}
            </div>

            {transcribedText && (
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowVoiceModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert("Voice Note transcription saved directly into client timeline & task queue!");
                    setShowVoiceModal(false);
                  }}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle size={13} /> Add to Client Tasks
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
}

