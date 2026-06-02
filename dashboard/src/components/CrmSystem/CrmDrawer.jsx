import React, { useState, useEffect } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import { createPortal } from "react-dom";
import {
  X, PlusCircle, Mail, Ticket as TicketIcon, MessageCircle,
  Tag, Clock, FileText, Zap, Calendar, Shield, Archive, Trash2, UserCheck
} from "lucide-react";

import ActivityTimeline from "../ActivityTimeline.jsx";
import CRMQuotationTab from "./CrmQuotationTab.jsx";
import {
  CRMStageBadge,
  formatCurrency,
  NBARecommendationCard
} from "./CrmUIComponents.jsx";

import TicketsTab from "./DrawerTabs/TicketsTab.jsx";
import ChatsTab from "./DrawerTabs/ChatsTab.jsx";
import NotesTab from "./DrawerTabs/NotesTab.jsx";
import TasksTab from "./DrawerTabs/TasksTab.jsx";
import ActionsTab from "./DrawerTabs/ActionsTab.jsx";
import EmailTab from "./DrawerTabs/EmailTab.jsx";
import HistoryTimelineTab from "./DrawerTabs/HistoryTimelineTab.jsx";

export default function CrmDrawer({
  showDrawer,
  setShowDrawer,
  selectedCustomer,
  customerDetails,
  loadingDetails,
  drawerTab,
  setDrawerTab,
  canEditCRM,
  canAssignOwners,
  onOpenEditLead,
  onArchive,
  onDelete,
  onAutoAssign,
  // Handlers for tabs
  onAddNote,
  onUpdateTaskStatus,
  onCreateTask,
  onBulkCompleteTasks,
  onDeleteOverdueTasks,
  onLogInteraction,
  onSendEmail,
  // States for tabs
  newNote,
  setNewNote,
  savingNote,
  taskForm,
  setTaskForm,
  taskSaving,
  interactionType,
  setInteractionType,
  interactionNote,
  setInteractionNote,
  interactionSaving,
  emailDraft,
  setEmailDraft,
  sendingEmail,
  onGenerateCode,
  teamMembers
}) {
  const socket = useSocket();
  const [othersViewing, setOthersViewing] = useState([]);

  useEffect(() => {
    if (!socket || !showDrawer || !selectedCustomer?._id) return;

    const leadId = selectedCustomer._id;
    
    // Emit viewing status
    socket.emit("crm:viewing-lead", { leadId, isViewing: true });

    // Listen for presence updates
    const handlePresence = ({ leadId: incomingId, user, isViewing }) => {
      if (incomingId !== leadId) return;
      setOthersViewing(prev => {
        if (isViewing) {
          // Avoid duplicates
          if (prev.find(u => u._id === user._id)) return prev;
          return [...prev, user];
        } else {
          return prev.filter(u => u._id !== user._id);
        }
      });
    };

    const handleSync = ({ leadId: incomingId, others }) => {
      if (incomingId === leadId) {
        setOthersViewing(others);
      }
    };

    socket.on("crm:lead-presence", handlePresence);
    socket.on("crm:lead-presence-sync", handleSync);

    return () => {
      socket.emit("crm:viewing-lead", { leadId, isViewing: false });
      socket.off("crm:lead-presence", handlePresence);
      socket.off("crm:lead-presence-sync", handleSync);
      setOthersViewing([]);
    };
  }, [socket, showDrawer, selectedCustomer?._id]);

  if (!showDrawer) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] z-[99] animate-in fade-in duration-300"
        onClick={() => setShowDrawer(false)}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-full md:w-[860px] bg-white border-l border-slate-200 z-[100] shadow-[0_0_50px_rgba(0,0,0,0.15)] overflow-hidden animate-in slide-in-from-right duration-500 flex flex-col">

        {/* Drawer Header */}
        <div className="px-5 py-5 md:px-8 border-b border-slate-100 flex items-start justify-between gap-4 bg-white shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center font-black text-xl shadow-xl shadow-indigo-500/20 shrink-0">
              {selectedCustomer?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight truncate">
                  {selectedCustomer?.name}
                </h3>
                {selectedCustomer?.priority && (
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${selectedCustomer.priority === "high" ? "bg-rose-50 text-rose-600 border-rose-100" :
                    selectedCustomer.priority === "medium" ? "bg-amber-50 text-amber-600 border-amber-100" :
                      "bg-slate-50 text-slate-500 border-slate-200"
                    }`}>
                    {selectedCustomer.priority}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                  {selectedCustomer?.crn}
                </p>
                {selectedCustomer?.email && (
                  <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Mail size={10} /> {selectedCustomer.email}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {othersViewing.length > 0 && (
              <div className="flex items-center -space-x-2 mr-2">
                {othersViewing.map((u) => (
                  <div 
                    key={u._id}
                    title={`${u.name} is also viewing`}
                    className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm animate-in zoom-in-50 duration-300"
                  >
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                ))}
                <div className="pl-3 text-[9px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">
                  Viewing Now
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
            {canAssignOwners && onAutoAssign && (
              <button
                onClick={() => onAutoAssign(selectedCustomer)}
                title="Auto-Assign Lead"
                className="p-2.5 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all border border-transparent hover:border-teal-100"
              >
                <UserCheck size={18} />
              </button>
            )}
            {canEditCRM && (
              <button
                onClick={onOpenEditLead}
                title="Edit Lead"
                className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
              >
                <PlusCircle size={18} />
              </button>
            )}
            {canAssignOwners && onArchive && (
              <button
                onClick={() => onArchive(selectedCustomer)}
                title="Archive Lead"
                className="p-2.5 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all border border-transparent hover:border-amber-100"
              >
                <Archive size={18} />
              </button>
            )}
            {canAssignOwners && onDelete && (
              <button
                onClick={() => onDelete(selectedCustomer)}
                title="Delete Lead Permanently"
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={() => setShowDrawer(false)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

        {/* Scrollable Context Wrapper */}
        <div className="flex-1 overflow-y-auto bg-slate-50/40 custom-scrollbar">
          {/* Quick Stats Banner */}
          <div className="px-5 py-4 md:px-8 border-b border-slate-100 bg-white flex flex-wrap items-start gap-x-8 gap-y-4 sticky top-0 z-[11] shadow-sm">
            <div className="space-y-1 min-w-[120px]">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pipeline Stage</p>
              <div className="flex items-center gap-2">
                <CRMStageBadge stage={selectedCustomer?.pipelineStage} />
                {selectedCustomer?.isLocked && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black uppercase tracking-widest">
                    <Shield size={10} className="fill-amber-600/20" /> Locked
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1 min-w-[100px]">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Est. Value</p>
              <p className="text-xs font-black text-slate-900">{formatCurrency(selectedCustomer?.leadValue)}</p>
            </div>

            <div className="space-y-1 min-w-[100px]">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Budget</p>
              <p className="text-xs font-black text-indigo-600">{formatCurrency(selectedCustomer?.budget)}</p>
            </div>

            <div className="space-y-1 min-w-[80px]">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Prob.</p>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-8 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(selectedCustomer?.probability || 0)))}%` }} />
                </div>
                <span className="text-[10px] font-black text-indigo-600">{selectedCustomer?.probability || 0}%</span>
              </div>
            </div>

            <div className="space-y-1 min-w-[100px]">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Exp. Close</p>
              <p className="text-xs font-black text-slate-900 truncate">
                {selectedCustomer?.expectedCloseDate ? new Date(selectedCustomer.expectedCloseDate).toLocaleDateString() : "TBD"}
              </p>
            </div>

            <div className="space-y-1 min-w-[120px]">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Decision Maker</p>
              <p className="text-xs font-black text-slate-900 truncate">{selectedCustomer?.decisionMaker || "Unknown"}</p>
            </div>

            {(selectedCustomer?.pipelineStage === "won" || selectedCustomer?.isLocked) && (
              <div className="space-y-1 min-w-[140px] border-l border-slate-100 pl-8 ml-auto">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Special Actions</p>
                {selectedCustomer?.pipelineStage === "won" && !selectedCustomer?.isLocked ? (
                  <button
                    onClick={() => onGenerateCode(selectedCustomer._id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    <Zap size={10} className="fill-white" /> Generate Code
                  </button>
                ) : (
                  <div className="text-[9px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 inline-block">
                    Code: <span className="font-black text-indigo-600 ml-1">{selectedCustomer.generatedCode}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-100 bg-white sticky top-[65px] z-10 overflow-x-auto scrollbar-hide">
            {[
              { key: "tickets", label: "Tickets", icon: TicketIcon, badge: customerDetails?.tickets?.length },
              { key: "chats", label: "Chats", icon: MessageCircle, badge: customerDetails?.sessions?.length },
              { key: "email", label: "Email", icon: Mail },
              { key: "notes", label: "Notes", icon: Tag, badge: customerDetails?.customer?.internalNotes?.length },
              { key: "tasks", label: "Tasks", icon: Clock, badge: customerDetails?.tasks?.length },
              { key: "quotes", label: "Quotes", icon: FileText },
              { key: "journey", label: "Journey", icon: Zap },
              { key: "activity", label: "Timeline", icon: Calendar },
              { key: "history", label: "Audit Log", icon: Shield }, // New Audit Tab
              { key: "actions", label: "Actions", icon: Zap }
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setDrawerTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all min-w-[110px] ${drawerTab === t.key
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/10"
                  : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
              >
                <t.icon size={12} />
                {t.label}
                {t.badge > 0 && (
                  <span className={`w-4 h-4 rounded-full text-[8px] flex items-center justify-center ${drawerTab === t.key ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Drawer Content */}
          <div className="p-5 md:p-8 space-y-6">
            {selectedCustomer?.nbaMetadata && (
              <NBARecommendationCard nba={selectedCustomer.nbaMetadata} />
            )}

            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <span className="animate-spin w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Synchronizing intelligence…</p>
              </div>
            ) : (
              <>
                {drawerTab === "tickets" && <TicketsTab tickets={customerDetails?.tickets} />}
                {drawerTab === "chats" && <ChatsTab sessions={customerDetails?.sessions} />}
                {drawerTab === "email" && (
                  <EmailTab
                    emailDraft={emailDraft}
                    setEmailDraft={setEmailDraft}
                    onSendEmail={onSendEmail}
                    sendingEmail={sendingEmail}
                  />
                )}
                {drawerTab === "notes" && (
                  <NotesTab
                    notes={customerDetails?.customer?.internalNotes}
                    newNote={newNote}
                    setNewNote={setNewNote}
                    onAddNote={onAddNote}
                    savingNote={savingNote}
                  />
                )}
                {drawerTab === "tasks" && (
                  <TasksTab
                    tasks={customerDetails?.tasks}
                    onUpdateTaskStatus={onUpdateTaskStatus}
                    onBulkCompleteTasks={onBulkCompleteTasks}
                    onDeleteOverdueTasks={onDeleteOverdueTasks}
                  />
                )}
                {drawerTab === "quotes" && (
                  <CRMQuotationTab
                    customer={selectedCustomer}
                    websiteId={selectedCustomer?.websiteId?._id || selectedCustomer?.websiteId}
                  />
                )}
                {drawerTab === "journey" && (
                  <div className="space-y-4">
                    <div className="bg-teal-50 border border-teal-100 rounded-3xl p-6 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-1">Intent Intelligence</p>
                        <h4 className="text-sm font-black text-teal-900 uppercase tracking-tight">Visitor Website Journey</h4>
                      </div>
                      <Zap size={24} className="text-teal-400" />
                    </div>
                    <ActivityTimeline
                      items={customerDetails?.activity?.filter(a => a.type === "page_view") || []}
                      emptyLabel="No page journey recorded yet."
                    />
                  </div>
                )}
                {drawerTab === "activity" && (
                  <div className="bg-white rounded-3xl border border-slate-100 p-2 shadow-sm min-h-[400px]">
                    <ActivityTimeline items={customerDetails?.activity?.filter(a => a.type !== "page_view") || []} />
                  </div>
                )}
                {drawerTab === "history" && (
                  <HistoryTimelineTab entityId={selectedCustomer?._id} />
                )}
                {drawerTab === "actions" && (
                  <ActionsTab
                    interactionType={interactionType}
                    setInteractionType={setInteractionType}
                    interactionNote={interactionNote}
                    setInteractionNote={setInteractionNote}
                    onLogInteraction={onLogInteraction}
                    interactionSaving={interactionSaving}
                    taskForm={taskForm}
                    setTaskForm={setTaskForm}
                    onCreateTask={onCreateTask}
                    taskSaving={taskSaving}
                    canAssignOwners={canAssignOwners}
                    teamMembers={teamMembers}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
