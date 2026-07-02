import React, { useState, useEffect } from "react";
import {
  X, User, Mail, Phone, Calendar, DollarSign, Clock, FileText, CheckCircle2,
  Trash2, Plus, Edit3, Eye, ArrowLeft, Paperclip, MessageSquare, AlertCircle, BookOpen
} from "lucide-react";
import { api } from "../../api/client.js";

const PROFILE_TABS = [
  { id: "overview", label: "Overview" },
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
  const [customer, setCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  // Tab Data States
  const [timeline, setTimeline] = useState([]);
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
  const [docForm, setDocForm] = useState({ name: "", category: "nda", fileUrl: "" });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/${customerId}`);
      setCustomer(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async () => {
    try {
      if (activeTab === "timeline") {
        const res = await api(`/api/crm/activities?customerId=${customerId}&websiteId=${websiteId}`);
        setTimeline(res.activities || []);
      } else if (activeTab === "deals") {
        const res = await api(`/api/crm/deals?customerId=${customerId}&websiteId=${websiteId}`);
        setDeals(res.deals || []);
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
        const res = await api(`/api/crm/invoices?customerId=${customerId}&websiteId=${websiteId}`);
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

  useEffect(() => {
    if (customerId) fetchProfile();
  }, [customerId]);

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
    return (
      <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-40 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-50 flex flex-col overflow-y-auto">
      {/* Upper Navigation Header */}
      <header className="sticky top-0 bg-white border-b border-slate-200/80 px-8 py-5 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-3.5 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors"><ArrowLeft size={16} /></button>
          <div>
            <h2 className="text-base font-black text-slate-900">{customer?.name}</h2>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{customer?.companyName || "Lead Profile"}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-900 transition-colors"><X size={20} /></button>
      </header>

      {/* Profile Summary Widget Strip */}
      <section className="bg-white border-b border-slate-200/50 px-8 py-6 grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <p className="text-xs font-extrabold text-indigo-600 mt-0.5">${customer?.leadValue || 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-amber-500" />
          <div>
            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Pipeline Stage</p>
            <p className="text-xs font-black text-slate-700 mt-0.5 uppercase tracking-wide">{customer?.pipelineStage || "-"}</p>
          </div>
        </div>
      </section>

      {/* Tabs list */}
      <div className="flex bg-white px-8 border-b border-slate-200 overflow-x-auto">
        {PROFILE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-4 text-[10px] font-black uppercase tracking-wider border-b-2 transition-all shrink-0 ${activeTab === tab.id ? "border-indigo-600 text-indigo-600 bg-indigo-50/10" : "border-transparent text-slate-400 hover:text-slate-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-white p-8 border border-slate-200 rounded-[30px] shadow-sm space-y-6">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Ecosystem Properties</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-bold">
                <div><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Ecosystem Ref CRN</span> {customer?.crn || "-"}</div>
                <div><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Win Probability</span> {customer?.probability || 10}%</div>
                <div><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Lead Temperature</span> <span className="uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{customer?.leadTemperature || "warm"}</span></div>
                <div><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Expected Revenue</span> ${customer?.expectedRevenue || 0}</div>
                <div><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Campaign</span> {customer?.campaign || "Direct Traffic"}</div>
                <div><span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Competitor Mentioned</span> {customer?.competitor || "None"}</div>
              </div>
            </div>
            
            <div className="bg-white p-8 border border-slate-200 rounded-[30px] shadow-sm space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Lead Health</h4>
              <div className="space-y-4 text-xs font-bold text-slate-600">
                <div><span className="text-[9px] font-black uppercase text-slate-400 block">Lead Score</span> {customer?.leadScore || 0} points</div>
                <div><span className="text-[9px] font-black uppercase text-slate-400 block">AI Win Rating</span> {customer?.winProbability || 10}%</div>
                <div><span className="text-[9px] font-black uppercase text-slate-400 block">Churn Risk</span> {customer?.churnRisk || 0}%</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Unified Chronicle</h4>
            <div className="relative border-l-2 border-slate-100 pl-8 ml-4 space-y-8">
              {timeline.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest pl-2">No activity timeline logged.</p>
              ) : (
                timeline.map((act) => (
                  <div key={act._id} className="relative space-y-1">
                    <span className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-indigo-50 border-2 border-indigo-500 flex items-center justify-center text-[10px] text-indigo-600">✓</span>
                    <h5 className="text-xs font-black text-slate-800">{act.title}</h5>
                    <p className="text-xs font-bold text-slate-500">{act.description}</p>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block pt-1">{new Date(act.activityAt).toLocaleString()}</span>
                  </div>
                ))
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
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b pb-3 border-slate-100">Email History</h4>
            {emails.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No emails dispatched.</p>
            ) : (
              <div className="space-y-4">
                {emails.map(e => (
                  <div key={e._id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{e.subject}</h5>
                      <span className="text-[9px] font-bold text-indigo-500 uppercase">{e.status}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">{new Date(e.sentAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Document Vault</h4>
              <button onClick={() => setShowDocForm(true)} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1"><Plus size={12} /> Upload Doc</button>
            </div>
            {documents.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">Vault is empty.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {documents.map(d => (
                  <div key={d._id} className="p-4 border border-slate-100 rounded-2xl space-y-2 hover:bg-slate-50/50 transition-colors">
                    <FileText className="text-indigo-500" size={24} />
                    <h5 className="text-xs font-black text-slate-800 truncate">{d.name}</h5>
                    <span className="text-[9px] font-bold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500">{d.category}</span>
                    {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black text-indigo-600 block pt-1 hover:underline">Download</a>}
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
                      <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Due: {new Date(inv.issuedAt).toLocaleDateString()} • Total: ${inv.total}</p>
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
                    <span className="text-xs font-black text-emerald-600">${pay.amount}</span>
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
          <form onSubmit={handleUploadDoc} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-slate-900">Upload Document</h3>
              <button type="button" onClick={() => setShowDocForm(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><X size={16} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Document Name</label>
              <input required value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category</label>
              <select value={docForm.category} onChange={(e) => setDocForm({ ...docForm, category: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold">
                <option value="contract">Contract</option>
                <option value="gst">GST</option>
                <option value="pan">PAN</option>
                <option value="proposal">Proposal</option>
                <option value="nda">NDA</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">File URL</label>
              <input required value={docForm.fileUrl} onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })} className="w-full bg-slate-50 rounded-xl border border-slate-200/50 px-4 py-3 text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2"><Check size={16} /> Save Document</button>
          </form>
        </div>
      )}
    </div>
  );
}
