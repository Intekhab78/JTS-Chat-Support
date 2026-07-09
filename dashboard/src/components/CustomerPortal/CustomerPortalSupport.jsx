import React, { useState, useEffect } from "react";
import { Headphones, Send, Clock, Plus, X, MessageSquare, AlertCircle } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function CustomerPortalSupport() {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");

  const [replyMessage, setReplyMessage] = useState("");

  const fetchTickets = async () => {
    try {
      const res = await api("/api/crm/customer-portal/tickets");
      setTickets(res || []);
      if (selectedTicket) {
        const updated = res.find(t => t._id === selectedTicket._id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    try {
      await api("/api/crm/customer-portal/tickets", {
        method: "POST",
        body: JSON.stringify({ subject, description, category, priority })
      });
      toast.success("Support ticket logged successfully");
      setSubject("");
      setDescription("");
      setShowCreateModal(false);
      fetchTickets();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    try {
      const res = await api(`/api/crm/customer-portal/tickets/${selectedTicket._id}/replies`, {
        method: "POST",
        body: JSON.stringify({ message: replyMessage })
      });
      setReplyMessage("");
      setSelectedTicket(res);
      fetchTickets();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase">Loading tickets...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3 border-slate-200">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Help & Support</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Submit issues and track tickets responses</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md transition-all"
        >
          <Plus size={14} /> Log Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b pb-2">Support Tickets</h4>
          <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
            {tickets.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-[10px] font-bold uppercase">No tickets submitted.</p>
            ) : (
              tickets.map(t => (
                <div
                  key={t._id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-colors ${selectedTicket?._id === t._id ? "border-indigo-500 bg-indigo-50/10" : "border-slate-100 hover:bg-slate-50/50"}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-slate-800">#{t._id.slice(-6).toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.status === "closed" ? "bg-slate-100 text-slate-600" : "bg-indigo-50 text-indigo-600"}`}>{t.status}</span>
                  </div>
                  <h5 className="text-[11px] font-black text-slate-700 mt-2 truncate">{t.subject}</h5>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Updated: {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message stream panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between min-h-[450px]">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="border-b pb-3 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black text-slate-800">{selectedTicket.subject}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Category: {selectedTicket.category}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${selectedTicket.priority === "high" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}>{selectedTicket.priority}</span>
              </div>

              {/* Message Streams */}
              <div className="flex-1 overflow-y-auto max-h-[300px] py-4 space-y-3 pr-1">
                {/* Description */}
                <div className="flex justify-start">
                  <div className="bg-slate-50 text-slate-800 p-4 rounded-[22px] text-xs font-bold leading-relaxed max-w-[80%] rounded-bl-sm">
                    <span className="text-[8px] font-black text-indigo-500 uppercase block mb-1">Original Issue Details</span>
                    <p>{selectedTicket.description}</p>
                  </div>
                </div>

                {/* Replies */}
                {(selectedTicket.notes || []).map((note, idx) => {
                  const isCustomer = note.isPublic === true; // customer replies are public
                  return (
                    <div key={idx} className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
                      <div className={`p-3.5 rounded-[22px] text-xs font-bold leading-relaxed max-w-[85%] ${isCustomer ? "bg-indigo-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>
                        <p>{note.content}</p>
                        <span className="text-[8px] opacity-60 block mt-1 text-right">{new Date(note.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={handlePostReply} className="border-t pt-4 border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Post response..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
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
              <p className="text-[10px] font-black uppercase tracking-wider">Select a ticket from the list to view thread history</p>
            </div>
          )}
        </div>
      </div>

      {/* Log Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="bg-white rounded-[28px] p-8 max-w-md w-full relative z-10 border shadow-2xl space-y-6">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-3">Log New Support Ticket</h4>
            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs font-bold text-slate-600">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Summarize the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                  >
                    <option value="billing">Billing & Invoice</option>
                    <option value="technical">Technical Support</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Description / Notes</label>
                <textarea
                  placeholder="Detail your request..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2 h-24"
                  required
                />
              </div>

              <div className="flex gap-2 border-t pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-black uppercase rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shadow-md">
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
