import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MessageSquare, Mail, Phone, Send, ShieldAlert, Check, CheckCheck,
  RefreshCw, Search, Facebook, Instagram, UserPlus, Download, Printer, X
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";

const CHANNELS = [
  { id: "", label: "All Channels" },
  { id: "chat", label: "Live Chat" },
  { id: "ai_chat", label: "AI Chat" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS" },
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" }
];

export default function CrmOmnichannelInbox({ websiteId }) {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);

  // Filters
  const [filterChannel, setFilterChannel] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);

  // Reply Input & Internal Notes
  const [replyText, setReplyText] = useState("");
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Agent Status
  const [agentStatus, setAgentStatus] = useState("online");

  // Assignment & Merge Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [targetMergeSessionId, setTargetMergeSessionId] = useState("");

  // Label Input
  const [labelInput, setLabelInput] = useState("");

  const fetchInbox = async () => {
    setLoading(true);
    try {
      let query = `?websiteId=${websiteId}`;
      if (filterStatus && filterStatus !== "all") query += `&status=${filterStatus}`;
      if (filterChannel) query += `&channel=${filterChannel}`;
      if (filterPriority) query += `&priority=${filterPriority}`;
      if (unassignedOnly) query += `&unassigned=true`;
      if (searchTerm) query += `&search=${encodeURIComponent(searchTerm)}`;

      const res = await api(`/api/crm/omnichannel/sessions${query}`);
      setSessions(Array.isArray(res) ? res : []);
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
      setMessages(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await api(`/api/crm/employees?websiteId=${websiteId}`);
      if (res && res.employees) {
        setTeamMembers(res.employees);
      } else {
        setTeamMembers(Array.isArray(res) ? res : []);
      }
    } catch (err) {
      console.error("Failed to load team members:", err);
    }
  };

  useEffect(() => {
    fetchInbox();
    fetchTeamMembers();
  }, [websiteId, filterChannel, filterPriority, filterStatus, unassignedOnly, searchTerm]);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession);
      const interval = setInterval(() => fetchMessages(selectedSession), 4000);
      return () => clearInterval(interval);
    }
  }, [selectedSession]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedSession) return;

    try {
      await api(`/api/crm/omnichannel/messages`, {
        method: "POST",
        body: JSON.stringify({
          sessionId: selectedSession._id,
          message: replyText
        })
      });
      setReplyText("");
      fetchMessages(selectedSession);
      fetchInbox();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAssignAgent = async (agentId) => {
    if (!selectedSession) return;
    try {
      const res = await api(`/api/crm/omnichannel/sessions/${selectedSession._id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ agentId })
      });
      setSelectedSession(res);
      fetchInbox();
      toast.success("Agent assignment updated");
      setShowAssignModal(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdatePriority = async (priority) => {
    if (!selectedSession) return;
    try {
      const res = await api(`/api/crm/omnichannel/sessions/${selectedSession._id}/priority`, {
        method: "PATCH",
        body: JSON.stringify({ priority })
      });
      setSelectedSession(res);
      fetchInbox();
      toast.success(`Priority set to ${priority}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddLabel = async (e) => {
    e.preventDefault();
    if (!labelInput.trim() || !selectedSession) return;

    const updatedLabels = [...(selectedSession.labels || []), labelInput.trim()];
    try {
      const res = await api(`/api/crm/omnichannel/sessions/${selectedSession._id}/labels`, {
        method: "PATCH",
        body: JSON.stringify({ labels: updatedLabels })
      });
      setSelectedSession(res);
      setLabelInput("");
      fetchInbox();
      toast.success("Label added");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemoveLabel = async (labelToRemove) => {
    if (!selectedSession) return;
    const updatedLabels = (selectedSession.labels || []).filter(l => l !== labelToRemove);
    try {
      const res = await api(`/api/crm/omnichannel/sessions/${selectedSession._id}/labels`, {
        method: "PATCH",
        body: JSON.stringify({ labels: updatedLabels })
      });
      setSelectedSession(res);
      fetchInbox();
      toast.success("Label removed");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMergeConversations = async (e) => {
    e.preventDefault();
    if (!targetMergeSessionId || !selectedSession) return;

    try {
      await api(`/api/crm/omnichannel/sessions/${selectedSession._id}/merge`, {
        method: "POST",
        body: JSON.stringify({ targetSessionId: targetMergeSessionId })
      });
      toast.success("Conversations merged successfully");
      setSelectedSession(null);
      setTargetMergeSessionId("");
      setShowMergeModal(false);
      fetchInbox();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddInternalNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedSession) return;
    setAddingNote(true);
    try {
      const updatedNotes = [
        ...(selectedSession.internalNotes || []),
        { content: newNote.trim(), createdAt: new Date() }
      ];
      await api(`/api/crm/omnichannel/sessions/${selectedSession._id}/labels`, {
        method: "PATCH",
        body: JSON.stringify({ internalNotes: updatedNotes })
      });
      setSelectedSession({ ...selectedSession, internalNotes: updatedNotes });
      setNewNote("");
      toast.success("Internal note logged");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingNote(false);
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

  const getChannelIcon = (channel) => {
    switch (channel) {
      case "email": return <Mail size={11} className="text-blue-500" />;
      case "whatsapp": return <Phone size={11} className="text-emerald-500" />;
      case "sms": return <Phone size={11} className="text-indigo-500" />;
      case "facebook": return <Facebook size={11} className="text-blue-600" />;
      case "instagram": return <Instagram size={11} className="text-pink-500" />;
      default: return <MessageSquare size={11} className="text-slate-500" />;
    }
  };

  const handleExportCSV = () => {
    const data = sessions.map(s => ({
      "Session ID": s._id,
      "Customer / Contact": s.customerName || s.customerId?.name || "Guest",
      "Channel": (s.channel || "Chat").toUpperCase(),
      "Priority": (s.priority || "Normal").toUpperCase(),
      "Status": (s.status || "Active").toUpperCase(),
      "Assigned Agent": s.assignedAgent?.name || s.assignedAgentId?.name || "Unassigned",
      "Last Activity": s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : "-"
    }));
    exportToCSV(data, `Omnichannel_Inbox_Sessions_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportPDF = () => {
    const data = sessions.map(s => ({
      "Customer / Contact": s.customerName || s.customerId?.name || "Guest",
      "Channel": (s.channel || "Chat").toUpperCase(),
      "Priority": (s.priority || "Normal").toUpperCase(),
      "Status": (s.status || "Active").toUpperCase(),
      "Assigned Agent": s.assignedAgent?.name || s.assignedAgentId?.name || "Unassigned"
    }));
    exportToPDF(data, `Omnichannel_Inbox_Sessions_${new Date().toISOString().slice(0, 10)}`, "OMNICHANNEL INBOX CONVERSATIONS REPORT");
  };

  return (
    <div className="space-y-3">
      {/* Compact Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-xs gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <MessageSquare size={16} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Unified Omnichannel Inbox</h3>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
              {sessions.length} conversation{sessions.length === 1 ? "" : "s"} • Live Chat, WhatsApp, Email & Social
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto justify-end">
          <button
            onClick={fetchInbox}
            className="h-7 w-7 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            title="Refresh Inbox"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleExportCSV}
            className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
            title="Export Conversations to CSV"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="h-7 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[9px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
            title="Export Conversations to PDF"
          >
            <Printer size={11} /> PDF
          </button>

          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
            <span className="text-[9px] font-bold text-slate-400 uppercase hidden sm:inline">Status:</span>
            <select
              value={agentStatus}
              onChange={(e) => handleUpdateAgentStatus(e.target.value)}
              className="h-7 bg-slate-50 border border-slate-200 rounded-lg px-2 text-[9.5px] font-extrabold uppercase text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="online">🟢 Online</option>
              <option value="offline">⚪ Offline</option>
              <option value="busy">🔴 Busy</option>
              <option value="break">🟡 Break</option>
              <option value="away">🔵 Away</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[480px]">
        {/* Left Thread List Panel */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs space-y-2.5 flex flex-col">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
              <input
                type="text"
                placeholder="Search threads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-indigo-400"
              />
            </div>

            {/* Thread Status Pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
              {[
                { id: "active", label: "Active" },
                { id: "closed", label: "Closed" },
                { id: "all", label: "All" }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setFilterStatus(st.id)}
                  className={`flex-1 py-1 rounded-md text-[9px] font-extrabold uppercase transition-all cursor-pointer ${
                    filterStatus === st.id ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="w-full h-7 bg-slate-50 border border-slate-200 rounded-lg px-1.5 text-[9.5px] font-bold text-slate-700 uppercase outline-none focus:border-indigo-400 cursor-pointer"
              >
                {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full h-7 bg-slate-50 border border-slate-200 rounded-lg px-1.5 text-[9.5px] font-bold text-slate-700 uppercase outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-[9.5px] font-bold text-slate-500 uppercase cursor-pointer select-none">
              <input
                type="checkbox"
                checked={unassignedOnly}
                onChange={(e) => setUnassignedOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600"
              />
              <span>Unassigned Only</span>
            </label>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[380px] space-y-1.5 pr-0.5">
            {loading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map(n => <div key={n} className="h-14 bg-slate-50 rounded-xl animate-pulse" />)}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-[10px] font-bold uppercase tracking-wider">No conversations found</p>
            ) : (
              sessions.map(s => {
                const displayName = s.customerName || s.customerId?.name || s.sessionId;
                return (
                  <div
                    key={s._id}
                    onClick={() => setSelectedSession(s)}
                    className={`p-2.5 border rounded-xl flex flex-col gap-1 cursor-pointer transition-all ${
                      selectedSession?._id === s._id
                        ? "border-indigo-500 bg-indigo-50/30 shadow-2xs"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/70"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-1.5">
                      <span className="text-[10.5px] font-extrabold text-slate-900 truncate">{displayName}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {s.unreadCount > 0 && (
                          <span className="bg-rose-500 text-white rounded-full text-[8px] font-extrabold px-1.5 py-0.5 leading-none">{s.unreadCount}</span>
                        )}
                        <span className="text-[8px] font-extrabold uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                          {getChannelIcon(s.channel)}
                          {s.channel || "chat"}
                        </span>
                      </div>
                    </div>
                    <p className="text-[9.5px] font-medium text-slate-500 truncate">{s.lastMessagePreview || "No messages yet"}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center Chat Panel */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between min-h-[460px]">
          {selectedSession ? (
            <>
              <div className="border-b pb-2.5 border-slate-100 space-y-2">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-slate-900 truncate">
                      {selectedSession.customerName || selectedSession.customerId?.name || selectedSession.sessionId}
                    </h4>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase mt-0.5">
                      ID: {selectedSession.sessionId} • Assigned: {selectedSession.assignedAgent?.name || selectedSession.assignedAgentId?.name || "Unassigned"}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => {
                        exportSingleRecordPDF(
                          `OMNICHANNEL CONVERSATION BRIEF - ${selectedSession.sessionId || selectedSession._id}`,
                          {
                            "Session ID": selectedSession.sessionId || selectedSession._id,
                            "Customer Name": selectedSession.customerName || selectedSession.customerId?.name || "Guest",
                            "Channel": (selectedSession.channel || "Chat").toUpperCase(),
                            "Priority Level": (selectedSession.priority || "Normal").toUpperCase(),
                            "Assigned Agent": selectedSession.assignedAgent?.name || selectedSession.assignedAgentId?.name || "Unassigned",
                            "Current Status": (selectedSession.status || "Active").toUpperCase(),
                            "Last Message Summary": selectedSession.lastMessagePreview || "-"
                          },
                          `Conversation_${selectedSession.sessionId || selectedSession._id}`
                        );
                      }}
                      className="px-2 py-1 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-[9px] font-extrabold uppercase text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Printer size={10} /> PDF
                    </button>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-[9px] font-extrabold uppercase text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus size={10} /> Assign
                    </button>
                    <button
                      onClick={() => setShowMergeModal(true)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-[9px] font-extrabold uppercase text-slate-700 cursor-pointer"
                    >
                      Merge
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase">
                    <span>Priority:</span>
                    <select
                      value={selectedSession.priority || "medium"}
                      onChange={(e) => handleUpdatePriority(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="flex-1 flex flex-wrap items-center gap-1 pl-1">
                    {(selectedSession.labels || []).map(label => (
                      <span key={label} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase flex items-center gap-1">
                        {label}
                        <button onClick={() => handleRemoveLabel(label)} className="text-slate-400 hover:text-rose-500 font-bold cursor-pointer">&times;</button>
                      </span>
                    ))}
                    <form onSubmit={handleAddLabel} className="inline-flex">
                      <input
                        type="text"
                        placeholder="+ Label"
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-[9px] w-16 outline-none focus:border-indigo-400"
                      />
                    </form>
                  </div>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto max-h-[320px] py-3 space-y-2 pr-1">
                {messages.map(m => (
                  <div key={m._id} className={`flex ${m.sender === "agent" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] px-3 py-2 rounded-xl text-[11px] font-medium leading-relaxed ${
                      m.sender === "agent"
                        ? "bg-indigo-600 text-white rounded-br-xs"
                        : "bg-slate-100 text-slate-800 rounded-bl-xs"
                    }`}>
                      <p>{m.message}</p>
                      {m.attachmentUrl && (
                        <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="block mt-1 text-[9.5px] font-bold underline opacity-90">
                          Attachment
                        </a>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1 opacity-70 text-[8.5px]">
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {m.sender === "agent" && (
                          <span>
                            {m.deliveryStatus === "read" ? <CheckCheck size={10} className="text-sky-300 inline" /> : m.deliveryStatus === "delivered" ? <CheckCheck size={10} className="inline" /> : <Check size={10} className="inline" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="border-t pt-2.5 border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a response..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-[11px] font-medium focus:outline-none focus:border-indigo-400"
                />
                <button type="submit" className="h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center justify-center cursor-pointer">
                  <Send size={14} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-1.5 py-16 text-center">
              <MessageSquare size={26} className="text-slate-300" />
              <p className="text-[10px] font-bold uppercase tracking-wider">Select a thread to view messages</p>
            </div>
          )}
        </div>

        {/* Right Customer Info Sidebar */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs space-y-3 flex flex-col">
          <h4 className="text-[10.5px] font-extrabold text-slate-900 uppercase tracking-wider border-b pb-2 border-slate-100 flex items-center gap-1.5">
            <ShieldAlert size={13} className="text-indigo-500" /> Customer Info
          </h4>

          {selectedSession ? (
            <div className="flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-2.5 text-[11px]">
                <div>
                  <p className="text-[8.5px] font-bold text-slate-400 uppercase">Profile</p>
                  <p className="text-slate-900 font-extrabold text-xs">{selectedSession.customerName || selectedSession.customerId?.name || "Visitor"}</p>
                </div>
                <div>
                  <p className="text-[8.5px] font-bold text-slate-400 uppercase">Email</p>
                  <p className="text-slate-700 font-medium truncate">{selectedSession.customerId?.email || "No email linked"}</p>
                </div>
                <div>
                  <p className="text-[8.5px] font-bold text-slate-400 uppercase">Phone</p>
                  <p className="text-slate-700 font-medium">{selectedSession.customerId?.phone || "No phone linked"}</p>
                </div>
                {selectedSession.customerId?.facebookId && (
                  <div>
                    <p className="text-[8.5px] font-bold text-slate-400 uppercase">Facebook ID</p>
                    <p className="text-slate-700 font-medium truncate">{selectedSession.customerId.facebookId}</p>
                  </div>
                )}
                {selectedSession.customerId?.instagramId && (
                  <div>
                    <p className="text-[8.5px] font-bold text-slate-400 uppercase">Instagram ID</p>
                    <p className="text-slate-700 font-medium truncate">{selectedSession.customerId.instagramId}</p>
                  </div>
                )}
              </div>

              {/* Internal Notes */}
              <div className="border-t border-slate-100 pt-2.5 space-y-2 flex-1 flex flex-col justify-between max-h-[220px]">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Internal Notes</p>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 max-h-[130px]">
                  {(selectedSession.internalNotes || []).length === 0 ? (
                    <p className="text-[9.5px] text-slate-400 font-medium">No internal notes yet.</p>
                  ) : (
                    (selectedSession.internalNotes || []).map((note, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 border border-slate-100 rounded-lg space-y-0.5">
                        <p className="text-[10px] text-slate-700 font-medium">{note.content}</p>
                        <span className="text-[8px] text-slate-400 block">{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddInternalNote} className="flex gap-1 pt-1">
                  <input
                    type="text"
                    placeholder="Add note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 h-7 bg-slate-50 border border-slate-200 rounded-lg px-2 text-[10px] outline-none focus:border-indigo-400"
                  />
                  <button type="submit" disabled={addingNote} className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-extrabold uppercase cursor-pointer">
                    Log
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <p className="text-[10px] font-bold text-slate-400 uppercase text-center py-8">No thread selected</p>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setShowAssignModal(false)} />
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full relative z-10 border border-slate-200 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Assign Agent</h4>
              <button onClick={() => setShowAssignModal(false)} className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"><X size={12} /></button>
            </div>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              <button
                onClick={() => handleAssignAgent(null)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-600 border border-slate-100 flex justify-between cursor-pointer"
              >
                <span>Unassign (Queue)</span>
                {!selectedSession?.assignedAgent && <span>✓</span>}
              </button>
              {teamMembers.map(member => (
                <button
                  key={member._id}
                  onClick={() => handleAssignAgent(member._id)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-800 border border-slate-100 flex justify-between cursor-pointer"
                >
                  <span>{member.name} ({member.role})</span>
                  {selectedSession?.assignedAgent?._id === member._id && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Merge Dialog Modal */}
      {showMergeModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setShowMergeModal(false)} />
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full relative z-10 border border-slate-200 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Merge Conversation</h4>
              <button onClick={() => setShowMergeModal(false)} className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"><X size={12} /></button>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-relaxed">
              Re-associate all messages in <b>{selectedSession?.sessionId}</b> into the target thread and archive this thread.
            </p>
            <form onSubmit={handleMergeConversations} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Target Session</label>
                <select
                  value={targetMergeSessionId}
                  onChange={(e) => setTargetMergeSessionId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[11px] font-bold outline-none"
                  required
                >
                  <option value="">Select thread...</option>
                  {sessions.filter(s => s._id !== selectedSession?._id).map(s => (
                    <option key={s._id} value={s._id}>{s.sessionId} ({s.channel})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowMergeModal(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase rounded-lg cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-extrabold uppercase rounded-lg cursor-pointer">
                  Confirm Merge
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
