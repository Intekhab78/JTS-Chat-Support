import React, { useState, useEffect } from "react";
import {
  Phone, Clock, Calendar, Video, Mail, Link2, Copy, ExternalLink,
  Send, Check, CheckCircle2, Sparkles, MessageSquare, AlertCircle, Loader2
} from "lucide-react";
import { api } from "../../../api/client.js";
import { useToast } from "../../../context/ToastContext.jsx";
import { renderPlatformIcon } from "../platformIconHelper.jsx";

export default function ActionsTab({
  customer,
  websiteId,
  interactionType,
  setInteractionType,
  interactionNote,
  setInteractionNote,
  onLogInteraction,
  interactionSaving,
  taskForm,
  setTaskForm,
  onCreateTask,
  taskSaving,
  canAssignOwners,
  teamMembers,
  onRefreshCustomer
}) {
  const toast = useToast();

  // Meeting sub-mode: "schedule" | "instant" | "log"
  const [meetingMode, setMeetingMode] = useState("schedule");

  // Meeting platforms from DB
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState("jts_meet");

  // Scheduled meeting form state
  const getDefaultDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(11, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(getDefaultDateTime);
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendEmailInvite, setSendEmailInvite] = useState(true);
  const [scheduledRoomId, setScheduledRoomId] = useState("");
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);

  // Instant meeting state
  const [instantRoomId, setInstantRoomId] = useState("");
  const [sendingInstantEmail, setSendingInstantEmail] = useState(false);
  const [instantCopied, setInstantCopied] = useState(false);

  // Generate fresh room IDs on mount or when customer changes
  useEffect(() => {
    const random1 = Math.random().toString(36).substring(2, 7) + Math.random().toString(36).substring(2, 7);
    const random2 = Math.random().toString(36).substring(2, 7) + Math.random().toString(36).substring(2, 7);
    setScheduledRoomId(`jts-${random1}`);
    setInstantRoomId(`jts-${random2}`);
    if (customer?.name) {
      setMeetingTitle(`Product Demo & Review with ${customer.name}`);
    } else {
      setMeetingTitle("Video Meeting & Discussion");
    }
    if (customer?.email) {
      setInviteEmail(customer.email);
    }
  }, [customer]);

  // Fetch meeting platforms for this website
  useEffect(() => {
    const targetWid = websiteId || customer?.websiteId?._id || customer?.websiteId;
    if (targetWid) {
      api(`/api/crm/meeting-platforms?websiteId=${targetWid}`)
        .then(res => {
          if (Array.isArray(res.platforms) && res.platforms.length > 0) {
            setPlatforms(res.platforms);
            const def = res.platforms.find(p => p.isDefault) || res.platforms[0];
            if (def) setSelectedPlatform(def.key);
          }
        })
        .catch(() => {});
    }
  }, [websiteId, customer]);

  // Resolve link preview based on platform template
  const getMeetingLink = (roomId, platformKey) => {
    const plat = platforms.find(p => p.key === platformKey);
    if (plat?.urlTemplate) {
      return plat.urlTemplate.replace("{roomId}", roomId);
    }
    if (platformKey === "jts_meet") {
      return `https://meet.jtsmiddleeast.com/meet/${roomId}`;
    }
    if (platformKey === "zoom") return `https://zoom.us/j/${roomId}`;
    if (platformKey === "google_meet") return `https://meet.google.com/${roomId}`;
    return `https://meet.jtsmiddleeast.com/meet/${roomId}`;
  };

  const activeScheduledLink = getMeetingLink(scheduledRoomId, selectedPlatform);
  const activeInstantLink = `https://meet.jtsmiddleeast.com/meet/${instantRoomId}`;

  // Handle scheduling the meeting & emailing customer
  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!meetingTitle.trim() || !meetingDate) {
      toast.error("Please provide a title and date/time");
      return;
    }

    const targetWid = websiteId || customer?.websiteId?._id || customer?.websiteId;
    if (!targetWid) {
      toast.error("Website ID not found for this customer");
      return;
    }

    setSchedulingMeeting(true);
    try {
      const participantEmails = sendEmailInvite && inviteEmail.trim() ? [inviteEmail.trim()] : [];

      // 1. Create the activity in CRM (backend automatically sends HTML email with join button if participantEmails is passed)
      const activityPayload = {
        websiteId: targetWid,
        type: "meeting",
        meetingType: selectedPlatform,
        title: meetingTitle.trim(),
        dueDate: new Date(meetingDate).toISOString(),
        description: meetingAgenda.trim() || `Scheduled via CRM for ${customer?.name || "Client"}.`,
        participantEmails,
        customerId: customer?._id,
        meetingRoomId: scheduledRoomId,
        meetingLink: activeScheduledLink
      };

      await api("/api/crm/activities", {
        method: "POST",
        body: JSON.stringify(activityPayload)
      });

      // 2. Also log a note on the customer's timeline for full audit visibility
      if (customer?._id) {
        await api(`/api/crm/${customer._id}/notes`, {
          method: "POST",
          body: JSON.stringify({
            type: "meeting",
            text: `📅 Scheduled Video Meeting: "${meetingTitle}" for ${new Date(meetingDate).toLocaleString()}.\nPlatform: ${selectedPlatform.toUpperCase()}\nJoin Link: ${activeScheduledLink}${participantEmails.length ? `\nInvitation sent to: ${participantEmails.join(", ")}` : ""}`
          })
        }).catch(() => {});
      }

      toast.success(
        participantEmails.length > 0
          ? `Meeting scheduled! Invitation email sent to ${participantEmails[0]}`
          : "Meeting scheduled and added to calendar!"
      );

      // Generate a new room ID for the next meeting
      const nextRandom = Math.random().toString(36).substring(2, 7) + Math.random().toString(36).substring(2, 7);
      setScheduledRoomId(`jts-${nextRandom}`);
      setMeetingAgenda("");

      if (onRefreshCustomer) onRefreshCustomer();
    } catch (err) {
      toast.error(err.message || "Failed to schedule meeting");
    } finally {
      setSchedulingMeeting(false);
    }
  };

  // Handle instant meeting email dispatch
  const handleSendInstantEmail = async () => {
    const targetEmail = inviteEmail.trim() || customer?.email;
    if (!targetEmail) {
      toast.error("Please enter customer's email address");
      return;
    }

    setSendingInstantEmail(true);
    try {
      const targetWid = websiteId || customer?.websiteId?._id || customer?.websiteId;
      await api("/api/crm/activities", {
        method: "POST",
        body: JSON.stringify({
          websiteId: targetWid,
          type: "meeting",
          meetingType: "jts_meet",
          title: `Instant Video Call with ${customer?.name || "Customer"}`,
          dueDate: new Date().toISOString(),
          description: `Instant meeting link dispatched to ${targetEmail}`,
          participantEmails: [targetEmail],
          customerId: customer?._id,
          meetingRoomId: instantRoomId,
          meetingLink: activeInstantLink
        })
      });

      if (customer?._id) {
        await api(`/api/crm/${customer._id}/notes`, {
          method: "POST",
          body: JSON.stringify({
            type: "meeting",
            text: `⚡ Instant JTS Meet started. Link emailed to ${targetEmail}:\n${activeInstantLink}`
          })
        }).catch(() => {});
      }

      toast.success(`Instant meeting invite sent to ${targetEmail}!`);
      if (onRefreshCustomer) onRefreshCustomer();
    } catch (err) {
      toast.error(err.message || "Failed to send instant meeting email");
    } finally {
      setSendingInstantEmail(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setInstantCopied(true);
    toast.success("Meeting link copied to clipboard!");
    setTimeout(() => setInstantCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Log Interaction / Video Meeting Section ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              interactionType === "meeting"
                ? "bg-indigo-50 border border-indigo-100 text-indigo-600"
                : interactionType === "call"
                  ? "bg-emerald-50 border border-emerald-100 text-emerald-600"
                  : "bg-sky-50 border border-sky-100 text-sky-600"
            }`}>
              {interactionType === "meeting" ? <Video size={18} /> : interactionType === "call" ? <Phone size={18} /> : <Mail size={18} />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                {interactionType === "meeting" ? "Video Meeting & Call Center" : "Log Interaction"}
              </p>
              <p className="text-[9px] font-bold text-slate-400">
                {interactionType === "meeting" ? "Schedule JTS Meet, start instant video call, or record notes" : "Record a phone call, meeting or email"}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Type Selector: Call / Meeting / Email */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
          {[
            { id: "meeting", label: "Meeting (JTS Meet)", icon: Video },
            { id: "call", label: "Phone Call", icon: Phone },
            { id: "manual_email", label: "Email", icon: Mail }
          ].map(t => {
            const Icon = t.icon;
            const active = interactionType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setInteractionType(t.id)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  active ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon size={13} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── WHEN MEETING IS SELECTED: SUB-MODES ── */}
        {interactionType === "meeting" && (
          <div className="space-y-4 pt-1">
            {/* Sub-mode tabs */}
            <div className="flex gap-1.5 p-1 bg-indigo-50/60 border border-indigo-100 rounded-xl">
              <button
                type="button"
                onClick={() => setMeetingMode("schedule")}
                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  meetingMode === "schedule" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600/70 hover:bg-indigo-100/50"
                }`}
              >
                <Calendar size={12} />
                <span>Schedule &amp; Email</span>
              </button>
              <button
                type="button"
                onClick={() => setMeetingMode("instant")}
                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  meetingMode === "instant" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600/70 hover:bg-indigo-100/50"
                }`}
              >
                <Sparkles size={12} />
                <span>Instant JTS Meet</span>
              </button>
              <button
                type="button"
                onClick={() => setMeetingMode("log")}
                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  meetingMode === "log" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600/70 hover:bg-indigo-100/50"
                }`}
              >
                <span>Log Past Notes</span>
              </button>
            </div>

            {/* 1. SCHEDULE & EMAIL INVITATION */}
            {meetingMode === "schedule" && (
              <form onSubmit={handleScheduleMeeting} className="space-y-4 animate-in fade-in duration-200">
                {/* Platform & Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                      Platform
                    </label>
                    <div className="relative">
                      <select
                        value={selectedPlatform}
                        onChange={(e) => setSelectedPlatform(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      >
                        {platforms.length > 0 ? (
                          platforms.map(p => (
                            <option key={p.key} value={p.key}>{p.name}</option>
                          ))
                        ) : (
                          <>
                            <option value="jts_meet">JTS Meet (Recommended)</option>
                            <option value="zoom">Zoom</option>
                            <option value="google_meet">Google Meet</option>
                            <option value="ms_teams">Microsoft Teams</option>
                          </>
                        )}
                      </select>
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        {renderPlatformIcon(platforms.find(p => p.key === selectedPlatform)?.icon || selectedPlatform, "#6366f1", 15)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                      Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Subject / Title */}
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    Meeting Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="e.g. Product Demo & Pricing Review"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Auto-generated Link Preview */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 size={12} /> Auto-Generated Room Link
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeScheduledLink)}
                        className="text-[9px] font-black text-slate-600 hover:text-indigo-600 flex items-center gap-1 uppercase"
                      >
                        <Copy size={11} /> Copy
                      </button>
                      <a
                        href={activeScheduledLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] font-black text-indigo-600 hover:underline flex items-center gap-1 uppercase"
                      >
                        <ExternalLink size={11} /> Test Room
                      </a>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 truncate">
                    {activeScheduledLink}
                  </p>
                </div>

                {/* Customer Email Invitation Box */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3.5 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendEmailInvite}
                      onChange={(e) => setSendEmailInvite(e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-indigo-950">
                      Send official invitation email to customer
                    </span>
                  </label>

                  {sendEmailInvite && (
                    <div className="pt-1">
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Customer Email Address"
                        className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                      <p className="text-[9px] font-bold text-indigo-500 mt-1 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Customer will receive an email with event details and a direct "🎯 Click to Join" button.
                      </p>
                    </div>
                  )}
                </div>

                {/* Agenda / Description */}
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                    Agenda / Notes (Optional)
                  </label>
                  <textarea
                    value={meetingAgenda}
                    onChange={(e) => setMeetingAgenda(e.target.value)}
                    placeholder="Key discussion topics, proposal review, next steps..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={schedulingMeeting}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {schedulingMeeting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{schedulingMeeting ? "Scheduling & Sending..." : "Schedule Meeting & Send Invite"}</span>
                </button>
              </form>
            )}

            {/* 2. INSTANT JTS MEET */}
            {meetingMode === "instant" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Instant Live Video Call</span>
                  </div>
                  <h4 className="text-base font-black">Jump on a video call right now with {customer?.name || "Client"}</h4>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    A unique, encrypted JTS Meet room has been prepared. You can join directly as Host, copy the link, or dispatch it to the customer via Email or WhatsApp.
                  </p>

                  <div className="bg-black/30 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-indigo-300 font-bold truncate">
                      {activeInstantLink}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeInstantLink)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase rounded-lg transition-all"
                    >
                      {instantCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Instant Actions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href={activeInstantLink}
                    target="_blank"
                    rel="noreferrer"
                    className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <Video size={13} />
                    <span>Join Room as Host</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleSendInstantEmail}
                    disabled={sendingInstantEmail}
                    className="py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {sendingInstantEmail ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                    <span>{sendingInstantEmail ? "Sending..." : `Email Link to ${customer?.email ? "Customer" : "Email"}`}</span>
                  </button>
                </div>

                {customer?.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = encodeURIComponent(`Hi ${customer.name || ""}, here is the link to join our instant video meeting: ${activeInstantLink}`);
                      window.open(`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
                    }}
                    className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageSquare size={13} />
                    <span>Send Link via WhatsApp to {customer.phone}</span>
                  </button>
                )}
              </div>
            )}

            {/* 3. LOG PAST NOTES */}
            {meetingMode === "log" && (
              <form onSubmit={onLogInteraction} className="space-y-4 animate-in fade-in duration-200">
                <textarea
                  value={interactionNote}
                  onChange={(e) => setInteractionNote(e.target.value)}
                  placeholder="Record summary notes of a meeting that has already taken place..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={interactionSaving || !interactionNote.trim()}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.22em] hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
                >
                  {interactionSaving ? "Recording..." : "Log Past Meeting Notes"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── WHEN CALL OR EMAIL IS SELECTED: CLASSIC NOTES LOGGING ── */}
        {interactionType !== "meeting" && (
          <form onSubmit={onLogInteraction} className="space-y-4 pt-1 animate-in fade-in duration-200">
            <textarea
              value={interactionNote}
              onChange={(e) => setInteractionNote(e.target.value)}
              placeholder={`What was the outcome of this ${interactionType === "call" ? "phone call" : "email conversation"}?`}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none shadow-sm"
              required
            />
            <button
              type="submit"
              disabled={interactionSaving || !interactionNote.trim()}
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.22em] hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
            >
              {interactionSaving ? "Recording..." : `Log ${interactionType === "call" ? "Phone Call" : "Email"}`}
            </button>
          </form>
        )}
      </div>

      {/* ── Schedule Follow-up Task Section ── */}
      <div className="bg-white rounded-3xl border border-amber-100 p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-amber-50 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Schedule Task</p>
            <p className="text-[9px] font-bold text-slate-400">Plan a follow-up action or deadline for this lead.</p>
          </div>
        </div>
        <form onSubmit={onCreateTask} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Action Description</label>
            <input
              value={taskForm.title}
              onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Discuss proposal breakdown"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-amber-500/5"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</label>
              <select
                value={taskForm.type}
                onChange={(e) => setTaskForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-amber-500/5"
              >
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="task">General</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Due Date</label>
              <input
                type="date"
                value={taskForm.dueAt}
                onChange={(e) => setTaskForm(prev => ({ ...prev, dueAt: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-[11px] text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-amber-500/5"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={taskSaving || !taskForm.title.trim() || !taskForm.dueAt}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.22em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
          >
            {taskSaving ? "Scheduling..." : "Create Action Task"}
          </button>
        </form>
      </div>
    </div>
  );
}
