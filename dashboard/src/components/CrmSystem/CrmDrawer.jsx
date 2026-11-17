import React, { useState, useEffect } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import { createPortal } from "react-dom";
import {
  X, PlusCircle, Mail, Ticket as TicketIcon, MessageCircle,
  Tag, Clock, FileText, Zap, Calendar, Shield, Archive, Trash2, UserCheck, Edit2, ReceiptText
} from "lucide-react";

import ActivityTimeline from "../ActivityTimeline.jsx";
import CRMQuotationTab from "./CrmQuotationTab.jsx";
import {
  CRMStageBadge,
  formatCurrency,
  NBARecommendationCard,
  formatRequirement
} from "./CrmUIComponents.jsx";

import TicketsTab from "./DrawerTabs/TicketsTab.jsx";
import ChatsTab from "./DrawerTabs/ChatsTab.jsx";
import NotesTab from "./DrawerTabs/NotesTab.jsx";
import TasksTab from "./DrawerTabs/TasksTab.jsx";
import ActionsTab from "./DrawerTabs/ActionsTab.jsx";
import EmailTab from "./DrawerTabs/EmailTab.jsx";
import HistoryTimelineTab from "./DrawerTabs/HistoryTimelineTab.jsx";
import CRMInvoiceTab from "./CrmInvoiceTab.jsx";

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
  onSendWhatsApp,
  sendingWhatsApp,
  onGenerateCode,
  onUnlock,
  onPostWin,
  teamMembers,
  onOpenFullProfile
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

  useEffect(() => {
    if (!showDrawer) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setShowDrawer(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDrawer, setShowDrawer]);

  if (!showDrawer) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px] z-[99] animate-in fade-in duration-200"
        onClick={() => setShowDrawer(false)}
      />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-5 pointer-events-none">
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        >

          {/* Modal Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {selectedCustomer?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                    {selectedCustomer?.name}
                  </h3>
                  {selectedCustomer?.priority && (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${selectedCustomer.priority === "high" ? "bg-rose-50 text-rose-600 border-rose-100" :
                      selectedCustomer.priority === "medium" ? "bg-amber-50 text-amber-600 border-amber-100" :
                        "bg-slate-50 text-slate-500 border-slate-200"
                      }`}>
                      {selectedCustomer.priority}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 mt-0.5">
                  {selectedCustomer?.crn && (
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                      {selectedCustomer.crn}
                    </p>
                  )}
                  {selectedCustomer?.email && (
                    <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 truncate">
                      <Mail size={10} /> {selectedCustomer.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {othersViewing.length > 0 && (
                <div className="hidden sm:flex items-center -space-x-1.5 mr-1">
                  {othersViewing.map((u) => (
                    <div
                      key={u._id}
                      title={`${u.name} is also viewing`}
                      className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px] font-bold border-2 border-white shadow-2xs"
                    >
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                  ))}
                  <span className="pl-2 text-[8px] font-bold text-indigo-500 uppercase tracking-wider animate-pulse">
                    Live
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                {onOpenFullProfile && (
                  <button
                    onClick={() => {
                      onOpenFullProfile(selectedCustomer._id);
                      setShowDrawer(false);
                    }}
                    title="Open Customer 360 Full Profile"
                    className="py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/80 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle size={13} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Full Profile</span>
                  </button>
                )}
                {canAssignOwners && onAutoAssign && (
                  <button
                    onClick={() => onAutoAssign(selectedCustomer)}
                    title="Auto-Assign Lead"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all cursor-pointer"
                  >
                    <UserCheck size={15} />
                  </button>
                )}
                {canEditCRM && (
                  <button
                    onClick={() => onOpenEditLead()}
                    title="Edit Lead"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                  >
                    <Edit2 size={15} />
                  </button>
                )}
                {canAssignOwners && onArchive && (
                  <button
                    onClick={() => onArchive(selectedCustomer)}
                    title="Archive Lead"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"
                  >
                    <Archive size={15} />
                  </button>
                )}
                {canAssignOwners && onDelete && (
                  <button
                    onClick={() => onDelete(selectedCustomer)}
                    title="Delete Lead Permanently"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Context Wrapper */}
          <div className="flex-1 overflow-y-auto bg-slate-50/40 custom-scrollbar">
            {/* Quick Stats Banner */}
            {(() => {
              const invTotalSum = (customerDetails?.invoices || [])
                .filter(inv => inv.status !== "cancelled" && inv.status !== "void")
                .reduce((sum, inv) => sum + Number(inv.total || inv.grandTotal || 0), 0);

              const quoteTotalSum = (customerDetails?.quotations || [])
                .filter(q => q.status !== "rejected" && q.status !== "expired")
                .reduce((sum, q) => sum + Number(q.total || q.grandTotal || 0), 0);

              const totalDocSum = invTotalSum > 0 ? invTotalSum : quoteTotalSum;
              const displayEstValue = totalDocSum > 0 ? totalDocSum : (selectedCustomer?.leadValue || 0);

              return (
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 items-center">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Pipeline Stage</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <CRMStageBadge stage={selectedCustomer?.pipelineStage} />
                        {selectedCustomer?.isLocked && selectedCustomer?.pipelineStage === "won" && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-bold uppercase">
                            <Shield size={9} /> Locked
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Est. Value</p>
                      <div className="flex items-center gap-1">
                        <p className="text-[11px] font-bold text-slate-900">{formatCurrency(displayEstValue)}</p>
                        {canEditCRM && (
                          <button
                            onClick={() => onOpenEditLead()}
                            title="Edit Estimated Lead Value"
                            className="text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            <Edit2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Budget</p>
                      <p className="text-[11px] font-bold text-indigo-600">{formatCurrency(selectedCustomer?.budget)}</p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Probability</p>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-8 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, Number(selectedCustomer?.probability || 0)))}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600">{selectedCustomer?.probability || 0}%</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Exp. Close</p>
                      <p className="text-[11px] font-bold text-slate-900 truncate">
                        {selectedCustomer?.expectedCloseDate ? new Date(selectedCustomer.expectedCloseDate).toLocaleDateString() : "TBD"}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Decision Maker</p>
                      <p className="text-[11px] font-bold text-slate-900 truncate">{selectedCustomer?.decisionMaker || "Not specified"}</p>
                    </div>

                    <div className="space-y-0.5 col-span-2 sm:col-span-2 lg:col-span-1">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Requirement</p>
                      <p className="text-[11px] font-semibold text-indigo-600 truncate" title={formatRequirement(selectedCustomer?.requirement)}>
                        {formatRequirement(selectedCustomer?.requirement)}
                      </p>
                    </div>
                  </div>

                  {selectedCustomer?.pipelineStage === "won" && (
                    <div className="pt-1.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Deal Workflow Actions</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {!selectedCustomer?.isLocked ? (
                          (() => {
                            const hasQuote = Boolean(
                              (customerDetails?.quotations && customerDetails.quotations.length > 0) ||
                              customerDetails?.hasQuotation ||
                              selectedCustomer?.hasQuotation
                            );
                            return (
                              <button
                                onClick={() => hasQuote && onGenerateCode(selectedCustomer._id)}
                                disabled={!hasQuote}
                                title={!hasQuote ? "A Digital Quotation must be created under Quotes tab before generating code" : "Generate code and start purchase workflow"}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${hasQuote
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
                                    : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-70"
                                  }`}
                              >
                                <Zap size={10} className={hasQuote ? "fill-white" : "fill-slate-400"} /> Generate Code
                              </button>
                            );
                          })()
                        ) : selectedCustomer?.generatedCode ? (
                          <div className="text-[9px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                            Code: <span className="font-bold text-indigo-600 ml-1">{selectedCustomer.generatedCode}</span>
                          </div>
                        ) : null}

                        {onUnlock && (
                          <button
                            onClick={() => {
                              if (window.confirm("Unlock this lead and move it back to Negotiation stage?")) {
                                onUnlock(selectedCustomer._id);
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/80 text-[9px] font-bold uppercase tracking-wider hover:bg-rose-100 transition-all cursor-pointer"
                          >
                            <Shield size={10} /> Unlock Lead
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tab Navigation */}
            <div className="flex items-center border-b border-slate-100 bg-white px-2 sticky top-0 z-10 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                { key: "tickets", label: "Tickets", icon: TicketIcon, badge: customerDetails?.tickets?.length },
                { key: "chats", label: "Chats", icon: MessageCircle, badge: customerDetails?.sessions?.length },
                { key: "email", label: "Email & WhatsApp", icon: Mail },
                { key: "notes", label: "Notes", icon: Tag, badge: customerDetails?.customer?.internalNotes?.length },
                { key: "tasks", label: "Tasks", icon: Clock, badge: customerDetails?.tasks?.length },
                { key: "quotes", label: "Quotes", icon: FileText, badge: customerDetails?.quotations?.length },
                { key: "invoices", label: "Invoices", icon: ReceiptText, badge: customerDetails?.invoices?.length },
                { key: "journey", label: "Journey", icon: Zap },
                { key: "activity", label: "Timeline", icon: Calendar },
                { key: "history", label: "Audit Log", icon: Shield },
                { key: "actions", label: "Actions", icon: Zap }
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setDrawerTab(t.key)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 text-[9.5px] font-bold uppercase tracking-wider border-b-2 transition-all shrink-0 whitespace-nowrap cursor-pointer ${drawerTab === t.key
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                >
                  <t.icon size={11} />
                  {t.label}
                  {t.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold flex items-center justify-center ${drawerTab === t.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Modal Body Content */}
            <div className="p-4 space-y-3">
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
                      customer={selectedCustomer}
                      onSendWhatsApp={onSendWhatsApp}
                      sendingWhatsApp={sendingWhatsApp}
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
                      onPostWin={onPostWin}
                      onConverted={() => setDrawerTab("invoices")}
                    />
                  )}
                  {drawerTab === "invoices" && (
                    <CRMInvoiceTab
                      customer={selectedCustomer}
                      websiteId={selectedCustomer?.websiteId?._id || selectedCustomer?.websiteId}
                    />
                  )}
                  {drawerTab === "journey" && (
                    <div className="space-y-2.5">
                      <div className="bg-white border border-slate-200/70 rounded-xl px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="text-[8.5px] font-bold uppercase tracking-wider text-teal-600">Intent Intelligence</p>
                          <h4 className="text-xs font-bold text-slate-900 tracking-tight">Visitor Website Journey</h4>
                        </div>
                        <Zap size={16} className="text-teal-500" />
                      </div>
                      <ActivityTimeline
                        items={customerDetails?.activity?.filter(a => a.type === "page_view") || []}
                        emptyLabel="No page journey recorded yet."
                      />
                    </div>
                  )}
                  {drawerTab === "activity" && (
                    <div className="bg-white rounded-xl border border-slate-200/70 p-3">
                      <ActivityTimeline items={customerDetails?.activity?.filter(a => a.type !== "page_view") || []} />
                    </div>
                  )}
                  {drawerTab === "history" && (
                    <HistoryTimelineTab entityId={selectedCustomer?._id} />
                  )}
                  {drawerTab === "actions" && (
                    <ActionsTab
                      customer={selectedCustomer}
                      websiteId={selectedCustomer?.websiteId?._id || selectedCustomer?.websiteId}
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
                      onRefreshCustomer={async () => {
                        if (selectedCustomer?._id) {
                          try {
                            const refreshed = await api(`/api/crm/${selectedCustomer._id}`);
                            if (refreshed) setCustomerDetails(refreshed);
                          } catch (e) { }
                        }
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
