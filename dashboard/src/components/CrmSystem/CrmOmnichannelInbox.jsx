import React, { useState, useEffect } from "react";
import {
  MessageSquare, Mail, Phone, Calendar, Send, ShieldAlert, Check, CheckCheck,
  UserCheck, RefreshCw, Filter, Search, Tag, Pin, Facebook, Instagram, Trash,
  PlusCircle, AlertCircle, HelpCircle, Archive, CheckCircle2, ChevronRight, UserPlus
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

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

  const handleAssignAgent = async (agentId) => {
    if (!selectedSession) return;
    try {
      const res = await api(`/api/crm/omnichannel/sessions/${selectedSession._id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ agentId })
      });
      setSelectedSession(res);
      fetchInbox();
      toast.success("Agent assignment updated successfully");
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
      // Save internalNotes to conversation
      const res = await api(`/api/crm/omnichannel/sessions/${selectedSession._id}/labels`, {
        // we can reuse labels patch or define a separate crm update for sessions
        // let's define that it is updated via same PATCH route
        method: "PATCH",
        body: JSON.stringify({ internalNotes: updatedNotes })
      });
      // Fallback: update local state session
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

  const handleCreateMockInbound = async (channel) => {
    try {
      await api(`/api/crm/omnichannel/sessions`, {
        method: "POST",
        body: JSON.stringify({
          websiteId,
          channel,
          department: "general",
          messageText: `Simulated inbound customer message on channel: ${channel}`
        })
      });
      fetchInbox();
      toast.success(`Simulated inbound message via ${channel}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case "email": return <Mail size={12} className="text-blue-500" />;
      case "whatsapp": return <Phone size={12} className="text-emerald-500" />;
      case "sms": return <Phone size={12} className="text-indigo-500" />;
      case "facebook": return <Facebook size={12} className="text-blue-600" />;
      case "instagram": return <Instagram size={12} className="text-pink-500" />;
      default: return <MessageSquare size={12} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Unified Omnichannel Inbox</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Live Chat, WhatsApp, SMS, Email, Facebook & Instagram</p>
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
        <span className="text-[9px] font-black uppercase text-slate-400 mr-2">Simulator:</span>
        {["chat", "email", "whatsapp", "sms", "facebook", "instagram"].map(ch => (
          <button
            key={ch}
            onClick={() => handleCreateMockInbound(ch)}
            className="py-1.5 px-3 bg-white border hover:bg-slate-50 text-[9px] font-black uppercase text-slate-600 rounded-xl transition-all shadow-sm"
          >
            + Mock {ch}
          </button>
        ))}
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
        {/* Left conversations List Panel */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4 flex flex-col">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border rounded-xl pl-9 pr-4 py-3 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className="w-full bg-slate-50 border rounded-xl px-2 py-2 text-[9px] font-black text-slate-600 uppercase outline-none focus:border-indigo-500 transition-colors"
              >
                {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full bg-slate-50 border rounded-xl px-2 py-2 text-[9px] font-black text-slate-600 uppercase outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">Priorities</option>
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

          <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2 pr-1">
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
                    <div className="flex items-center gap-1">
                      {s.unreadCount > 0 && (
                        <span className="bg-red-500 text-white rounded-full text-[8px] font-black px-1.5 py-0.5">{s.unreadCount}</span>
                      )}
                      <span className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1">
                        {getChannelIcon(s.channel)}
                        {s.channel}
                      </span>
                    </div>
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
              <div className="border-b pb-3 border-slate-100 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-black text-slate-800">{selectedSession.sessionId}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Assigned: {selectedSession.assignedAgent?.name || "Unassigned"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-2 py-1 bg-slate-50 border hover:bg-slate-100 rounded-xl text-[9px] font-black uppercase text-slate-600 flex items-center gap-1"
                    >
                      <UserPlus size={10} /> Assign Agent
                    </button>
                    <button
                      onClick={() => setShowMergeModal(true)}
                      className="px-2 py-1 bg-slate-50 border hover:bg-slate-100 rounded-xl text-[9px] font-black uppercase text-slate-600 flex items-center gap-1"
                    >
                      Merge Thread
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-50">
                  <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
                    <span>Priority:</span>
                    <select
                      value={selectedSession.priority || "medium"}
                      onChange={(e) => handleUpdatePriority(e.target.value)}
                      className="bg-slate-50 border rounded-lg px-2 py-1 text-[9px]"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div className="flex-1 flex flex-wrap items-center gap-1 pl-2">
                    {(selectedSession.labels || []).map(label => (
                      <span key={label} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1">
                        {label}
                        <button onClick={() => handleRemoveLabel(label)} className="text-slate-400 hover:text-red-500 font-bold">&times;</button>
                      </span>
                    ))}
                    <form onSubmit={handleAddLabel} className="inline-flex">
                      <input
                        type="text"
                        placeholder="+ Label"
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        className="bg-slate-50 border rounded-lg px-2 py-0.5 text-[8px] max-w-[60px]"
                      />
                    </form>
                  </div>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto max-h-[300px] py-4 space-y-3 pr-1">
                {messages.map(m => (
                  <div key={m._id} className={`flex ${m.sender === "agent" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] p-3.5 rounded-[22px] text-xs font-bold leading-relaxed ${m.sender === "agent" ? "bg-indigo-600 text-white rounded-br-sm" : "bg-slate-50 text-slate-800 rounded-bl-sm"}`}>
                      <p>{m.message}</p>
                      {m.attachmentUrl && (
                        <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="block mt-2 text-[9px] font-bold text-indigo-400 hover:underline">
                          🔗 Attachment
                        </a>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1 opacity-60 text-[8px]">
                        <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                        {m.sender === "agent" && (
                          <span>
                            {m.deliveryStatus === "read" ? <CheckCheck size={10} className="text-blue-400 inline" /> : m.deliveryStatus === "delivered" ? <CheckCheck size={10} className="text-slate-300 inline" /> : <Check size={10} className="text-slate-300 inline" />}
                          </span>
                        )}
                      </div>
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

        {/* Right Customer Info Sidebar */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-6 flex flex-col">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-3 border-slate-100 flex items-center gap-1.5"><ShieldAlert size={14} className="text-indigo-500" /> Customer Sidebar</h4>
          
          {selectedSession ? (
            <div className="flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4 text-xs font-bold text-slate-600">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Customer Profile</p>
                  <p className="text-slate-800 font-extrabold text-[13px]">{selectedSession.customerId?.name || "Anonymous Visitor"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Email</p>
                  <p className="text-slate-800 truncate">{selectedSession.customerId?.email || "No email linked"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Phone</p>
                  <p className="text-slate-800">{selectedSession.customerId?.phone || "No phone linked"}</p>
                </div>
                {selectedSession.customerId?.facebookId && (
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Facebook ID</p>
                    <p className="text-slate-800 truncate">{selectedSession.customerId.facebookId}</p>
                  </div>
                )}
                {selectedSession.customerId?.instagramId && (
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Instagram ID</p>
                    <p className="text-slate-800 truncate">{selectedSession.customerId.instagramId}</p>
                  </div>
                )}
              </div>

              {/* Internal Notes block */}
              <div className="border-t pt-4 space-y-3 flex-1 flex flex-col justify-between max-h-[220px]">
                <p className="text-[9px] font-black text-slate-400 uppercase">Internal Team Notes</p>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[120px]">
                  {(selectedSession.internalNotes || []).length === 0 ? (
                    <p className="text-[9px] text-slate-400 font-bold">No internal notes logged.</p>
                  ) : (
                    (selectedSession.internalNotes || []).map((note, idx) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded-xl space-y-1">
                        <p className="text-[10px] text-slate-700 font-medium">{note.content}</p>
                        <span className="text-[7px] text-slate-400 block">{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddInternalNote} className="flex gap-1 pt-2">
                  <input
                    type="text"
                    placeholder="Log note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 bg-slate-50 border rounded-lg px-2 py-1 text-[9px]"
                  />
                  <button type="submit" disabled={addingNote} className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-bold">
                    Log
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <p className="text-[10px] font-bold text-slate-400 uppercase text-center py-6">No thread selected</p>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
          <div className="bg-white rounded-[28px] p-6 max-w-sm w-full relative z-10 border shadow-xl space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Assign Agent</h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              <button
                onClick={() => handleAssignAgent(null)}
                className="w-full text-left p-3 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 border border-slate-100 flex justify-between"
              >
                <span>Unassign (Put in Queue)</span>
                {!selectedSession?.assignedAgent && <span>✓</span>}
              </button>
              {teamMembers.map(member => (
                <button
                  key={member._id}
                  onClick={() => handleAssignAgent(member._id)}
                  className="w-full text-left p-3 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border border-slate-100 flex justify-between"
                >
                  <span>{member.name} ({member.role})</span>
                  {selectedSession?.assignedAgent?._id === member._id && <span>✓</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAssignModal(false)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase rounded-xl">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Merge Dialog Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowMergeModal(false)} />
          <div className="bg-white rounded-[28px] p-6 max-w-sm w-full relative z-10 border shadow-xl space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Merge Conversation</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              This will re-associate all messages in the current thread <b>{selectedSession?.sessionId}</b> into the target thread, and archive this thread.
            </p>
            <form onSubmit={handleMergeConversations} className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Target Session (select active thread)</label>
                <select
                  value={targetMergeSessionId}
                  onChange={(e) => setTargetMergeSessionId(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-bold"
                  required
                >
                  <option value="">Select thread...</option>
                  {sessions.filter(s => s._id !== selectedSession?._id).map(s => (
                    <option key={s._id} value={s._id}>{s.sessionId} ({s.channel})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowMergeModal(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-black uppercase rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shadow-md">
                  Confirm Merge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
