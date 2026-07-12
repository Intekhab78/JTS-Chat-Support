import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import CRMManager from "../components/CRMManager.jsx";
import InsightsPanel from "../components/InsightsPanel.jsx";
import PaginationControls from "../components/PaginationControls.jsx";
import Layout from "../components/Layout.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import {
  Activity,
  MessageCircle,
  FileText,
  CheckSquare,
  Clock,
  Calendar,
  Phone,
  Mail,
  Zap,
  ArrowRight,
  ChevronRight,
  ArrowLeft,
  Globe,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  RefreshCw
} from "lucide-react";
import ChatPanel from "../components/ChatPanel.jsx";
import { hasModule } from "../utils/planAccess.js";
import CustomerManager from "../components/CustomerManager.jsx";
import InventoryManager from "../components/InventoryManager.jsx";
import TicketManager from "../components/TicketManager.jsx";

function SessionStatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-50 text-emerald-600 border-emerald-100",
    queued: "bg-amber-50 text-amber-600 border-amber-100",
    closed: "bg-slate-100 text-slate-500 border-slate-200"
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${styles[status] || styles.closed}`}>
      {status || "unknown"}
    </span>
  );
}

function SalesChatsPanel({ onConvertToLead }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api("/api/chat/sessions");
        if (!cancelled) setSessions(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load sales chats");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    let cancelled = false;
    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const data = await api(`/api/chat/sessions/${selectedSession.sessionId}/messages`);
        if (!cancelled) setMessages(data);
      } catch (err) {
        console.error("Failed to load messages", err);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }
    loadMessages();
    return () => { cancelled = true; };
  }, [selectedSession]);

  const handleSendMessage = async (payload) => {
    if (!selectedSession) return;
    try {
      const msg = await api(`/api/chat/sessions/${selectedSession.sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setMessages(prev => [...prev, msg]);
    } catch (err) {
      alert("Failed to send message: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400">
        <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Synchronizing assigned queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-red-50 border border-red-100 text-red-600">
        <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400">
        <Activity size={40} className="mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-slate-600 uppercase tracking-tight">No active sales chats</h2>
        <p className="text-sm font-bold mt-2">Only chats assigned to this sales user appear here.</p>
      </div>
    );
  }

  if (selectedSession) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <button
          onClick={() => setSelectedSession(null)}
          className="flex items-center gap-2.5 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
        >
          <ArrowLeft size={14} /> Back to Lead Queue
        </button>
        <ChatPanel
          session={selectedSession}
          messages={messages}
          onSend={handleSendMessage}
          onTyping={() => { }}
          isTyping={false}
          onConvertToLead={() => onConvertToLead(selectedSession)}
        />
      </div>
    );
  }

  const paginatedSessions = getPaginationMeta(sessions, page);

  return (
    <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-bottom-4 duration-700">
      {paginatedSessions.pageItems.map((session) => (
        <div
          key={session._id}
          onClick={() => setSelectedSession(session)}
          className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 cursor-pointer hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
             <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg"><MessageCircle size={20} /></div>
          </div>
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-4 min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xl">
                   {session.visitorId?.name?.[0] || "V"}
                </div>
                <div>
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                     {session.visitorId?.name || "Anonymous visitor"}
                   </h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     {session.websiteId?.websiteName || "Website"}
                   </p>
                </div>
              </div>
              
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-slate-400 break-all">{session.visitorId?.email || session.visitorId?.visitorId || "No contact info"}</p>
                 <p className="text-[12px] font-medium text-slate-600 line-clamp-1 italic">
                   &ldquo;{session.lastMessagePreview || "Waiting for interaction..."}&rdquo;
                 </p>
              </div>

              <div className="flex items-center gap-4 pt-2">
                 <SessionStatusBadge status={session.status} />
                 <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    <Clock size={12} />
                    {new Date(session.updatedAt || session.createdAt).toLocaleDateString()} at {new Date(session.updatedAt || session.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                 </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <PaginationControls
        currentPage={paginatedSessions.currentPage}
        totalPages={paginatedSessions.totalPages}
        totalItems={paginatedSessions.totalItems}
        itemLabel="sales chats"
        onPageChange={setPage}
      />
    </div>
  );
}

function GlobalTasksPanel() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api("/api/crm/tasks/my");
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load global tasks", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">Synchronizing action items...</div>;

  if (tasks.length === 0) {
    return (
      <div className="p-16 border-2 border-dashed border-slate-200 rounded-[40px] bg-slate-50 text-center mt-6">
        <CheckSquare size={48} className="mx-auto mb-4 text-slate-200" />
        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Zero pending actions</h3>
        <p className="text-sm font-bold text-slate-500 mt-2">All your follow-ups are completed. Great work!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-700 mt-6">
      {tasks.map(task => (
        <div key={task._id} className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="flex items-start gap-4">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                task.status === "completed" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
             }`}>
                {task.type === "call" ? <Phone size={20} /> : task.type === "email" ? <Mail size={20} /> : <CheckSquare size={20} />}
             </div>
             <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.type}</p>
                   <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                      task.customerId?.priority === "high" ? "bg-rose-50 text-rose-500 border-rose-100" : "bg-slate-50 text-slate-400 border-slate-200"
                   }`}>{task.customerId?.priority || "Medium"}</span>
                </div>
                <h4 className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{task.title}</h4>
                <p className="text-[11px] font-bold text-indigo-500 truncate mt-1">
                   {task.customerId?.name} <span className="text-slate-300 mx-1">•</span> {task.customerId?.crn}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                   <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(task.dueAt).toLocaleDateString()}</span>
                   <span className="flex items-center gap-1.5"><Clock size={12} /> {task.status}</span>
                </div>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GlobalNotesPanel() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api("/api/crm/notes/my");
        setNotes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load global notes", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">Aggregating lead intelligence...</div>;

  if (notes.length === 0) {
    return (
      <div className="p-16 border-2 border-dashed border-slate-200 rounded-[40px] bg-slate-50 text-center mt-6">
        <FileText size={48} className="mx-auto mb-4 text-slate-200" />
        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Intelligence empty</h3>
        <p className="text-sm font-bold text-slate-500 mt-2">Log your first note from any lead profile to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700 mt-6">
      {notes.map((note, idx) => (
        <div key={idx} className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm hover:border-indigo-100 transition-all group">
          <div className="flex items-start justify-between gap-4 mb-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black">
                   <Zap size={18} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Lead: {note.customerName}</p>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{note.type || "Note"}</p>
                </div>
             </div>
             <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{note.customerCrn}</span>
             </div>
          </div>
          <p className="text-xs font-semibold text-slate-700 leading-relaxed pl-[52px]">
             {note.text}
          </p>
          <div className="mt-4 pt-4 border-t border-slate-50 pl-[52px] flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
             <span className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[7px] text-slate-500 font-black">
                   {note.authorName?.[0] || "?"}
                </div>
                {note.authorName}
             </span>
             <span className="text-slate-300">{new Date(note.createdAt).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}


export default function SalesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "pipeline";
  const [initialLeadData, setInitialLeadData] = useState(null);
  const [highlightLeadId, setHighlightLeadId] = useState(null);
  const canUseCRM = hasModule(user, "crm");
  const canUseReports = hasModule(user, "reports");
  const [websites, setWebsites] = useState([]);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState("");
  const [inventorySubTab, setInventorySubTab] = useState("master");

  useEffect(() => {
    async function loadWebsites() {
      try {
        const data = await api("/api/websites");
        const list = Array.isArray(data) ? data : [];
        setWebsites(list);
      } catch (err) {
        console.error("Failed to load websites", err);
      }
    }
    loadWebsites();
  }, []);

  const handleConvertLead = (session) => {
    setInitialLeadData({
      name: session.visitorId?.name || "Anonymous",
      email: session.visitorId?.email || "",
      phone: session.visitorId?.phone || "",
      leadSource: "chat",
      notes: `Lead converted from chat session: ${session.sessionId || session._id}`,
      sessionId: session._id
    });
    setSearchParams({ tab: "pipeline" });
  };

  const handleViewLead = (lead) => {
    setHighlightLeadId(lead._id);
    setSearchParams({ tab: "pipeline" });
  };

  const menuItems = [
    { label: "Pipeline", href: "/sales" },
    { label: "Tasks", href: "/sales?tab=tasks" },
    { label: "Notes", href: "/sales?tab=notes" },
    { label: "Chats", href: "/sales?tab=chats" },
    { label: "Inventory", href: "/sales?tab=inventory" },
    { label: "Tickets", href: "/sales?tab=tickets" },
    ...(canUseReports ? [{ label: "Insights", href: "/sales?tab=insights" }] : []),
    { label: "Customer Master", href: "/sales?tab=customer-master" }
  ];

  const WebsiteSelector = () => (
    <div className="flex items-center gap-3 mb-6 bg-white border border-slate-200 p-4 rounded-[28px] shadow-sm animate-in fade-in duration-500">
      <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
        <Globe size={18} />
      </div>
      <div className="flex-1">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Operational Context</p>
        <select
          value={selectedWebsiteId}
          onChange={(e) => setSelectedWebsiteId(e.target.value)}
          className="w-full bg-transparent border-none text-sm font-black text-slate-900 uppercase tracking-tight outline-none cursor-pointer"
        >
          <option value="">All Ecosystem Assets</option>
          {websites.map(w => (
            <option key={w._id} value={w._id}>{w.websiteName}</option>
          ))}
        </select>
      </div>
    </div>
  );

  if (!canUseCRM && activeTab === "pipeline") {
    return (
      <Layout menuItems={menuItems} title="Plan Upgrade Required" subtitle="CRM is available on Pro only">
        <div className="rounded-[40px] border border-emerald-100 bg-emerald-50 p-12 text-center">
          <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight">Pro plan required</h3>
          <p className="mt-3 text-sm font-bold text-emerald-700">This sales account can only use CRM when the client is on the Pro plan.</p>
        </div>
      </Layout>
    );
  }

  if (activeTab === "insights") {
    if (!canUseReports) {
      return (
        <Layout menuItems={menuItems} title="Plan Upgrade Required" subtitle="Reports are not enabled for this account">
          <div className="rounded-[40px] border border-sky-100 bg-sky-50 p-12 text-center">
            <h3 className="text-lg font-black text-sky-900 uppercase tracking-tight">Reports not included</h3>
            <p className="mt-3 text-sm font-bold text-sky-700">Enable reporting to unlock sales insights and performance analytics.</p>
          </div>
        </Layout>
      );
    }
    return (
      <Layout menuItems={menuItems} title="Sales Intelligence" subtitle="Performance metrics and revenue projection">
         <InsightsPanel onViewLead={handleViewLead} />
      </Layout>
    );
  }

  if (activeTab === "chats") {
    return (
      <Layout menuItems={menuItems} title="Sales Chats" subtitle="Manage your assigned visitor conversations">
         <SalesChatsPanel onConvertToLead={handleConvertLead} />
      </Layout>
    );
  }

  if (activeTab === "tasks") {
    return (
      <Layout menuItems={menuItems} title="My Tasks" subtitle="Follow-ups and scheduled activities">
        <GlobalTasksPanel />
      </Layout>
    );
  }

  if (activeTab === "notes") {
    return (
      <Layout menuItems={menuItems} title="My Notes" subtitle="Internal observations and lead context">
        <GlobalNotesPanel />
      </Layout>
    );
  }

  if (activeTab === "customer-master") {
    return (
      <Layout menuItems={menuItems} title="Customer Master Registry" subtitle="Global management of customer profiles and accounts">
        <WebsiteSelector />
        <CustomerManager websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  if (activeTab === "inventory") {
    const subTabs = [
      { id: "master", label: "Master Items", icon: Package },
      { id: "history", label: "History", icon: RefreshCw }
    ];

    return (
      <Layout menuItems={menuItems} title="Stock Intelligence" subtitle="Real-time inventory levels and movement history">
        <WebsiteSelector />
        
        <div className="flex items-center gap-2 mb-8 bg-white/50 backdrop-blur-md p-1.5 rounded-[24px] border border-slate-200 w-fit shadow-sm">
          {subTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setInventorySubTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${
                inventorySubTab === tab.id 
                ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
              }`}
            >
              <tab.icon size={14} className={inventorySubTab === tab.id ? "text-indigo-400" : "text-slate-300"} />
              {tab.label}
            </button>
          ))}
        </div>

        <InventoryManager websiteId={selectedWebsiteId} activeTab={inventorySubTab} readOnly={true} />
      </Layout>
    );
  }

  if (activeTab === "tickets") {
    return (
      <Layout menuItems={menuItems} title="Service Records" subtitle="Customer support context and ticket history">
        <WebsiteSelector />
        <TicketManager websiteId={selectedWebsiteId} />
      </Layout>
    );
  }

  // default: pipeline
  return (
    <Layout
      menuItems={menuItems}
      title="Sales Pipeline"
      subtitle="Manage your leads, opportunities, and deals"
    >
      <WebsiteSelector />
      <CRMManager websiteId={selectedWebsiteId} initialLeadData={initialLeadData} highlightLeadId={highlightLeadId} />
    </Layout>
  );
}
