import React, { useState, useEffect } from "react";
import { MessageSquare, Mail, Phone, Calendar, Send, ShieldAlert, CheckCheck, UserCheck, RefreshCw, Filter, Search, Tag, Pin } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

const CHANNELS = [
  { id: "", label: "All Channels" },
  { id: "chat", label: "Live Chat" },
  { id: "ai_chat", label: "AI Chat" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS" },
  { id: "telegram", label: "Telegram" }
];

export default function CrmOmnichannelInbox({ websiteId }) {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterChannel, setFilterChannel] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);

  // Reply Input
  const [replyText, setReplyText] = useState("");
  
  // Agent Status
  const [agentStatus, setAgentStatus] = useState("online");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignAgentId, setAssignAgentId] = useState("");

  const fetchInbox = async () => {
    setLoading(true);
    try {
      let query = `?websiteId=${websiteId}&status=${filterStatus}`;
      if (filterChannel) query += `&channel=${filterChannel}`;
      if (filterPriority) query += `&priority=${filterPriority}`;
      if (unassignedOnly) query += `&unassigned=true`;
      if (searchTerm) query += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await api(`/api/crm/omnichannel/sessions${query}`);
      setSessions(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (session) => {
    if (!session) return;
    try {
      const res = await api(`/api/crm/omnichannel/sessions/messages/${session._id}`);
      setMessages(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [websiteId, filterChannel, filterPriority, filterStatus, unassignedOnly, searchTerm]);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession);
      const interval = setInterval(() => fetchMessages(selectedSession), 4000); // Poll messages
      return () => clearInterval(interval);
    }
  }, [selectedSession]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedSession) return;

    try {
      const payload = {
        sessionId: selectedSession._id,
        message: replyText
      };
      await api(`/api/crm/omnichannel/messages`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setReplyText("");
      fetchMessages(selectedSession);
      fetchInbox();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateAgentStatus = async (status) => {
    try {
      await api(`/api/crm/omnichannel/agent-status`, {
        method: "PATCH",
        body: JSON.stringify({ agentStatus: status })
      });
      setAgentStatus(status);
      toast.success(`Status updated to: ${status}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateMockInbound = async (channel) => {
    try {
      await api(`/api/crm/omnichannel/sessions`, {
        method: "POST",
        body: JSON.stringify({
          websiteId,
          channel,
          department: "general",
          messageText: `Mock inbound incoming message on channel ${channel}`
        })
      });
      fetchInbox();
      toast.success(`Simulated inbound ${channel} message`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Status Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Unified Omnichannel Inbox</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Integrate SMS, Emails, Telegram, Live Chat, and WhatsApp</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-[10px] font-black text-slate-400 uppercase">Agent Status:</span>
          <select
            value={agentStatus}
            onChange={(e) => handleUpdateAgentStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black uppercase text-slate-700 focus:outline-none"
          >
            <option value="online">🟢 Online</option>
            <option value="offline">⚪ Offline</option>
            <option value="busy">🔴 Busy</option>
            <option value="break">🟡 Break</option>
            <option value="away">🔵 Away</option>
          </select>
        </div>
      </div>

      {/* Simulator Tools */}
      <div className="bg-slate-50 rounded-2xl p-4 flex flex-wrap gap-2 items-center">
        <span className="text-[9px] font-black uppercase text-slate-400 mr-2">Simulate Inbound:</span>
        {["chat", "email", "whatsapp", "sms", "telegram"].map(ch => (
          <button
            key={ch}
            onClick={() => handleCreateMockInbound(ch)}
            className="py-1.5 px-3 bg-white border hover:bg-slate-50 text-[9px] font-black uppercase text-slate-600 rounded-xl"
          >
            + {ch}
          </button>
        ))}
      </div>

      {/* Inbox Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
        {/* Left conversations List Panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4 flex flex-col">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search inbox..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border rounded-xl pl-9 pr-4 py-3 text-xs font-bold"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="flex-1 bg-slate-50 border rounded-xl px-3 py-2 text-[10px] font-black text-slate-600 uppercase"
              >
                {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="flex-1 bg-slate-50 border rounded-xl px-3 py-2 text-[10px] font-black text-slate-600 uppercase"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase cursor-pointer">
              <input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} className="rounded" />
              <span>Unassigned Only</span>
            </label>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2">
            {loading ? (
              <p className="text-center py-6 text-slate-400 text-xs font-bold">Loading...</p>
            ) : sessions.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Inbox is empty</p>
            ) : (
              sessions.map(s => (
                <div
                  key={s._id}
                  onClick={() => setSelectedSession(s)}
                  className={`p-4 border rounded-2xl flex flex-col justify-between cursor-pointer transition-colors ${selectedSession?._id === s._id ? "border-indigo-500 bg-indigo-50/10" : "border-slate-100 hover:bg-slate-50/50"}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-800">{s.sessionId}</span>
                    <span className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{s.channel}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 truncate mt-2">{s.lastMessagePreview}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center Chat Panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between min-h-[450px]">
          {selectedSession ? (
            <>
              {/* Message Header */}
              <div className="border-b pb-3 border-slate-100 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black text-slate-800">{selectedSession.sessionId}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Assigned: {selectedSession.assignedAgent?.name || "Unassigned"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${selectedSession.priority === "urgent" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}>{selectedSession.priority}</span>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto max-h-[300px] py-4 space-y-3">
                {messages.map(m => (
                  <div key={m._id} className={`flex ${m.sender === "agent" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] p-3.5 rounded-[22px] text-xs font-bold leading-relaxed ${m.sender === "agent" ? "bg-indigo-600 text-white rounded-br-sm" : "bg-slate-50 text-slate-800 rounded-bl-sm"}`}>
                      <p>{m.message}</p>
                      <span className="text-[8px] opacity-60 block mt-1 text-right">{new Date(m.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="border-t pt-4 border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-slate-50 border rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-indigo-500"
                />
                <button type="submit" className="p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all">
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2 py-20 text-center">
              <MessageSquare size={32} className="text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-wider">Select a session thread to start messaging</p>
            </div>
          )}
        </div>

        {/* Right Session compliance Panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-6">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-3 border-slate-100 flex items-center gap-1.5"><ShieldAlert size={14} className="text-indigo-500" /> Compliance Details</h4>
          {selectedSession ? (
            <div className="space-y-4 text-xs font-bold text-slate-600">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Routing Department</p>
                <p className="text-slate-800 uppercase text-[10px]">{selectedSession.department}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">SLA Deadline Time</p>
                <p className="text-rose-500">{selectedSession.slaDueAt ? new Date(selectedSession.slaDueAt).toLocaleTimeString() : "No SLA set"}</p>
              </div>
              <div className="border-t pt-4">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Associated Customer</p>
                <p className="text-slate-800">{selectedSession.customerId?.name || "Anonymous Visitor"}</p>
              </div>
            </div>
          ) : (
            <p className="text-[10px] font-bold text-slate-400 uppercase text-center py-6">No session selected</p>
          )}
        </div>
      </div>
    </div>
  );
}
