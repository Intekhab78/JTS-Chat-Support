import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, MessageSquare, Clock, Globe, Shield, ChevronRight, Check, Trash2, UserCheck } from "lucide-react";
import ChatPanel from "./ChatPanel.jsx";
import TicketConversionModal from "./TicketConversionModal.jsx";
import SessionList from "./ConversationSystem/SessionList.jsx";
import ConversationDrawer from "./ConversationSystem/ConversationDrawer.jsx";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { cleanString } from "../utils/stringUtils.js";

export default function ConversationHub({ socket, initialSessions = [], websiteId, userRole = "agent", extraHeader = null }) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState(initialSessions);
  const selectedSessionId = searchParams.get("sessionId") || "";
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [sessionToConvert, setSessionToConvert] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // -- Bulk Selection State --
  const [selectedIds, setSelectedIds] = useState([]);
  
  const activeRequestRef = useRef("");

  const selectedSession = useMemo(() =>
    sessions.find(s => s.sessionId === selectedSessionId),
    [sessions, selectedSessionId]
  );

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  useEffect(() => {
    setMessages([]); // Clear previous session messages immediately

    if (!selectedSessionId) {
      return;
    }

    setLoadingMessages(true);
    activeRequestRef.current = selectedSessionId;

    api(`/api/chat/sessions/${selectedSessionId}/messages`)
      .then(data => {
        // Prevent session leakage: only update if this request still matches active selection
        if (activeRequestRef.current === selectedSessionId) {
          setMessages(data);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (activeRequestRef.current === selectedSessionId) {
          setLoadingMessages(false);
        }
      });

    if (socket) {
      socket.emit("agent:join-session", { sessionId: selectedSessionId });
    }
  }, [selectedSessionId, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload) => {
      // Use currentSelectedId from ref to ensure we're matching against latest UI state
      if (payload.sessionId === activeRequestRef.current) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === payload._id || (m.createdAt === payload.createdAt && m.message === payload.message));
          if (exists) return prev;
          return [...prev, payload];
        });
      }

      setSessions(prev => prev.map(s =>
        s.sessionId === payload.sessionId
          ? { ...s, lastMessagePreview: payload.message, updatedAt: new Date() }
          : s
      ));
    };

    const handleSessionUpdated = (session) => {
      setSessions((prev) => {
        const exists = prev.some((s) => s.sessionId === session.sessionId);
        if (!exists) return [session, ...prev];
        return prev.map((s) => (s.sessionId === session.sessionId ? { ...s, ...session } : s));
      });
    };

    const handleClosed = ({ sessionId }) => {
      setSessions((prev) => prev.map((s) => (
        s.sessionId === sessionId ? { ...s, status: "closed", closedAt: new Date().toISOString() } : s
      )));
    };

    const handleAssigned = ({ sessionId }) => {
      setSessions((prev) => prev.map((s) => (
        s.sessionId === sessionId ? { ...s, status: "active" } : s
      )));
    };

    const handleQueued = (data = {}) => {
      const sessionId = data.sessionId || selectedSessionId;
      if (!sessionId) return;
      setSessions((prev) => prev.map((s) => (
        s.sessionId === sessionId ? { ...s, status: "queued" } : s
      )));
    };

    socket.on("chat:new-message", handleNewMessage);
    socket.on("chat:session-updated", handleSessionUpdated);
    socket.on("chat:closed", handleClosed);
    socket.on("chat:assigned", handleAssigned);
    socket.on("chat:queued", handleQueued);

    return () => {
      socket.off("chat:new-message", handleNewMessage);
      socket.off("chat:session-updated", handleSessionUpdated);
      socket.off("chat:closed", handleClosed);
      socket.off("chat:assigned", handleAssigned);
      socket.off("chat:queued", handleQueued);
    };
  }, [socket, selectedSessionId]);

  const handleSend = (payload) => {
    if (!socket || !selectedSessionId) return;
    socket.emit("agent:message", {
      sessionId: selectedSessionId,
      message: payload.text,
      attachmentUrl: payload.attachmentUrl,
      attachmentType: payload.attachmentType
    });
  };

  const handleBulkClose = async () => {
    if (!window.confirm(`Close ${selectedIds.length} sessions?`)) return;
    try {
      await api("/api/chat/bulk-close", { method: "POST", body: { sessionIds: selectedIds } });
      toast.success(`Closed ${selectedIds.length} sessions`);
      setSelectedIds([]);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Permanently DELETE ${selectedIds.length} sessions? This cannot be undone.`)) return;
    try {
      await api("/api/chat/bulk-delete", { method: "POST", body: { sessionIds: selectedIds } });
      toast.success(`Deleted ${selectedIds.length} sessions`);
      setSelectedIds([]);
      // Force refresh sessions via parent or reload
      window.location.reload(); 
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleSelection = (sessionId) => {
    setSelectedIds(prev => 
      prev.includes(sessionId) ? prev.filter(id => id !== sessionId) : [...prev, sessionId]
    );
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchesWebsite = !websiteId || (s.websiteId?._id === websiteId || s.websiteId === websiteId);
      const matchesSearch = !searchTerm ||
        s.visitorId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.visitorId?.visitorId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.lastMessagePreview?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesWebsite && matchesSearch;
    });
  }, [sessions, websiteId, searchTerm]);

  return (
    <section className="relative h-[calc(100vh-180px)] min-h-[600px]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full animate-in slide-in-from-bottom-4 duration-700">
        
        {/* Session List Component */}
        <SessionList 
          sessions={filteredSessions}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedSessionId={selectedSessionId}
          onSelectSession={(id) => {
            const params = new URLSearchParams(searchParams);
            params.set("sessionId", id);
            setSearchParams(params);
          }}
          selectedIds={selectedIds}
          toggleSelection={toggleSelection}
          extraHeader={extraHeader}
        />

        <div className="lg:col-span-8 h-full relative">
          <ChatPanel
            session={selectedSession}
            messages={messages}
            onSend={handleSend}
            onTyping={(isTyping) => socket.emit("agent_typing", { sessionId: selectedSessionId, isTyping })}
            onConvertToTicket={(s) => {
              setSessionToConvert(s);
              setShowTicketModal(true);
            }}
            onIntelClick={() => setIsDrawerOpen(true)}
            onConvertToLead={() => setIsDrawerOpen(true)} 
          />
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-[32px] shadow-2xl flex items-center gap-10 z-50 animate-in slide-in-from-bottom-10 duration-500 border border-white/10 backdrop-blur-xl">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">{selectedIds.length} Selected</span>
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">Omni-Channel Operations</span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBulkClose}
              className="px-5 py-2.5 bg-white/5 hover:bg-emerald-600 transition-all rounded-2xl flex items-center gap-2 group"
            >
              <UserCheck size={16} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Bulk Close</span>
            </button>
            {["admin", "client", "manager"].includes(userRole) && (
              <button 
                onClick={handleBulkDelete}
                className="px-5 py-2.5 bg-white/5 hover:bg-rose-600 transition-all rounded-2xl flex items-center gap-2 group text-rose-400 hover:text-white"
              >
                <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Bulk Delete</span>
              </button>
            )}
            <button 
              onClick={() => setSelectedIds([])}
              className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest px-4 py-2 hover:bg-white/5 rounded-xl transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Intelligence & Governance Drawer */}
      <ConversationDrawer 
        session={selectedSession}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onConvertToTicket={(s) => {
          setSessionToConvert(s);
          setShowTicketModal(true);
        }}
        onDeleteSession={async (id) => {
          if (!window.confirm("Permanently delete this session?")) return;
          try {
            await api(`/api/chat/sessions/${id}`, { method: "DELETE" });
            toast.success("Session deleted");
            setIsDrawerOpen(false);
            window.location.reload();
          } catch (err) {
            toast.error(err.message);
          }
        }}
      />

      {showTicketModal && (
        <TicketConversionModal
          session={sessionToConvert}
          onClose={() => setShowTicketModal(false)}
          onSuccess={() => {
            setShowTicketModal(false);
            toast.success("Ticket created successfully");
          }}
        />
      )}
    </section>
  );
}
