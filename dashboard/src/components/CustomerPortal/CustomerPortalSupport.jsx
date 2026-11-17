import React, { useState, useEffect } from "react";
import { Send, Plus, X, MessageSquare } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function CustomerPortalSupport({ onTicketChange }) {
  const toast = useToast();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await api("/api/crm/customer-portal/tickets");
      const list = Array.isArray(res) ? res : [];
      setTickets(list);
      if (selectedTicket) {
        const updated = list.find((t) => t._id === selectedTicket._id);
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showCreateModal) {
        setShowCreateModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCreateModal]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || submitting) return;

    setSubmitting(true);
    try {
      const created = await api("/api/crm/customer-portal/tickets", {
        method: "POST",
        body: JSON.stringify({ subject, description, category, priority })
      });
      toast.success("Support ticket submitted");
      setSubject("");
      setDescription("");
      setShowCreateModal(false);
      await fetchTickets();
      if (created?._id) setSelectedTicket(created);
      onTicketChange?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket || sendingReply) return;

    setSendingReply(true);
    try {
      const res = await api(`/api/crm/customer-portal/tickets/${selectedTicket._id}/replies`, {
        method: "POST",
        body: JSON.stringify({ message: replyMessage })
      });
      setReplyMessage("");
      setSelectedTicket(res);
      fetchTickets();
      onTicketChange?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return <p className="text-center py-12 text-slate-400 text-xs font-semibold">Loading tickets...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-3 border-slate-200">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Help &amp; Support</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Submit requests and track support responses</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
        >
          <Plus size={14} /> New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tickets List */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Your Tickets ({tickets.length})
          </h4>
          <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
            {tickets.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-xs">No tickets submitted.</p>
            ) : (
              tickets.map((t) => (
                <button
                  type="button"
                  key={t._id}
                  onClick={() => setSelectedTicket(t)}
                  className={`w-full text-left p-3 border rounded-xl transition-colors ${
                    selectedTicket?._id === t._id
                      ? "border-indigo-500 bg-indigo-50/40"
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700">
                      {t.ticketId || `#${t._id.slice(-6).toUpperCase()}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        t.status === "closed" || t.status === "resolved"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <h5 className="text-xs font-semibold text-slate-900 mt-1 truncate">{t.subject}</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Updated {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message stream panel */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between min-h-[440px]">
          {selectedTicket ? (
            <>
              <div className="border-b border-slate-100 pb-2.5 flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-indigo-600">
                      {selectedTicket.ticketId || `#${selectedTicket._id.slice(-6).toUpperCase()}`}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{selectedTicket.subject}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 capitalize mt-0.5">Category: {selectedTicket.category || "general"}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 ${
                    selectedTicket.priority === "high" || selectedTicket.priority === "urgent"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {selectedTicket.priority}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[320px] py-3 space-y-2.5 pr-1">
                <div className="flex justify-end">
                  <div className="bg-indigo-50 border border-indigo-100 text-slate-800 p-3 rounded-2xl rounded-br-xs text-xs leading-relaxed max-w-[85%]">
                    <span className="text-[10px] font-bold text-indigo-600 block mb-0.5">Original Request</span>
                    <p>{selectedTicket.description}</p>
                  </div>
                </div>

                {(selectedTicket.notes || []).map((note, idx) => {
                  const isCustomer =
                    (note.addedBy && user?._id && String(note.addedBy) === String(user._id)) ||
                    (note.authorName && user?.name && note.authorName === user.name);

                  return (
                    <div key={note._id || idx} className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                          isCustomer
                            ? "bg-indigo-600 text-white rounded-br-xs"
                            : "bg-slate-100 text-slate-800 rounded-bl-xs"
                        }`}
                      >
                        <span className={`text-[10px] font-semibold block mb-0.5 ${isCustomer ? "text-indigo-100" : "text-slate-500"}`}>
                          {isCustomer ? "You" : note.authorName || "Support Team"}
                        </span>
                        <p>{note.content}</p>
                        <span className={`text-[9px] block mt-1 text-right ${isCustomer ? "text-indigo-200" : "text-slate-400"}`}>
                          {note.createdAt ? new Date(note.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handlePostReply} className="border-t pt-3 border-slate-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Write a reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyMessage.trim()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl transition-colors flex items-center justify-center"
                >
                  <Send size={14} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2 py-16 text-center">
              <MessageSquare size={28} className="text-slate-300" />
              <p className="text-xs font-semibold">Select a ticket to view conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-sm font-bold text-slate-900">New Support Ticket</h4>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs text-slate-700">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="Summarize the issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="billing">Billing &amp; Invoice</option>
                    <option value="technical">Technical Support</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Description</label>
                <textarea
                  placeholder="Describe your request..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 h-24 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
