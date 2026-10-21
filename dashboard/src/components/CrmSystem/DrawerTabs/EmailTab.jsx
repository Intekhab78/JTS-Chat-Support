import React, { useState } from "react";
import { Mail, Send, MessageSquare, Copy, ExternalLink, Check, AlertCircle, CheckCircle2, Smartphone } from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";
import { api } from "../../../api/client.js";

const emailTemplates = [
  {
    name: "Introduction Follow-up",
    subject: "Connecting regarding your inquiry — {{websiteName}}",
    body: "Hi {{customerName}},\n\nThank you for visiting {{websiteName}} and reaching out to us. I am {{salesName}}, your dedicated Account Manager.\n\nI would love to learn more about your current requirements and explore how we can support your business goals.\n\nCould you please let me know a convenient day and time this week for a brief 5 to 10-minute introductory call? Alternatively, you can reply directly to this email with your preferred timing.\n\nBest regards,\n{{salesName}}"
  },
  {
    name: "Proposal & Quotation Shared",
    subject: "Customized Proposal & Pricing — {{websiteName}}",
    body: "Hi {{customerName}},\n\nIt was a pleasure speaking with you recently regarding your project.\n\nBased on our discussion, I have prepared a customized proposal detailing the solutions and pricing structured for your requirements. Please find the details updated in your Client Portal.\n\nWe are highly excited about the opportunity to partner with you and deliver exceptional value. Please review the details and let me know if you would like us to make any adjustments.\n\nBest regards,\n{{salesName}}"
  },
  {
    name: "Schedule Meeting / Demo",
    subject: "Invitation: Brief discussion on your requirements — {{websiteName}}",
    body: "Hi {{customerName}},\n\nI hope you are having a productive week.\n\nTo ensure we address all your queries and showcase the best solutions for your team, we would like to invite you to a short product walk-through / online demo session.\n\nPlease reply with a few slots that work best for your schedule, or let us know if we can connect via Microsoft Teams / Zoom at your convenience.\n\nBest regards,\n{{salesName}}"
  },
  {
    name: "Cold Lead Re-engagement",
    subject: "Following up on your request — {{websiteName}}",
    body: "Hi {{customerName}},\n\nI hope you are doing well.\n\nI am writing to check if you had a chance to review the details we sent earlier regarding your inquiry.\n\nWe understand your timelines might have shifted, but if you are still looking to move forward or need any additional information, please let me know. I am here to help.\n\nBest regards,\n{{salesName}}"
  }
];

const whatsappTemplates = [
  {
    name: "Quick Introduction",
    body: "Hey {{customerName}}, this is {{salesName}} from {{websiteName}}. I saw your inquiry on our website. Are you free for a quick 2-minute call today?"
  },
  {
    name: "Schedule Meeting",
    body: "Hi {{customerName}}! Just wanted to schedule a quick conversation to discuss your requirement. Would today at 4 PM work for you?"
  },
  {
    name: "Special Offer Alert",
    body: "Hi {{customerName}}, {{salesName}} here from {{websiteName}}. We have a special offer for your deal today. Let me know if you want to unlock it!"
  },
  {
    name: "Check-in Ping",
    body: "Hey {{customerName}}, checking in to see if you have any questions about the proposal I sent yesterday. Let me know!"
  }
];

export default function EmailTab({ 
  emailDraft, 
  setEmailDraft, 
  onSendEmail, 
  sendingEmail,
  customer,
  onSendWhatsApp,
  sendingWhatsApp
}) {
  const { user } = useAuth();
  
  const [selectedEmailTpl, setSelectedEmailTpl] = useState("");
  const [selectedWaTpl, setSelectedWaTpl] = useState("");
  const [waText, setWaText] = useState("");
  const [copied, setCopied] = useState(false);
  const [localSendingWa, setLocalSendingWa] = useState(false);
  const [emailNotice, setEmailNotice] = useState(null);
  const [waNotice, setWaNotice] = useState(null);

  const isSendingWa = sendingWhatsApp || localSendingWa;

  const getInterpolatedText = (templateBody) => {
    const customerName = customer?.name || "there";
    const salesName = user?.name || "Sales Team";
    const websiteName = (typeof customer?.websiteId === 'object' ? customer?.websiteId?.websiteName : "our team") || "our team";
    
    return templateBody
      .replaceAll("{{customerName}}", customerName)
      .replaceAll("{{salesName}}", salesName)
      .replaceAll("{{websiteName}}", websiteName);
  };

  const handleEmailTemplateChange = (e) => {
    const idx = e.target.value;
    setSelectedEmailTpl(idx);
    if (idx === "") return;
    
    const tpl = emailTemplates[idx];
    const customerName = customer?.name || "there";
    const salesName = user?.name || "Sales Team";
    const websiteName = (typeof customer?.websiteId === 'object' ? customer?.websiteId?.websiteName : "our team") || "our team";
    
    const subject = tpl.subject
      .replaceAll("{{customerName}}", customerName)
      .replaceAll("{{salesName}}", salesName)
      .replaceAll("{{websiteName}}", websiteName);
      
    const body = tpl.body
      .replaceAll("{{customerName}}", customerName)
      .replaceAll("{{salesName}}", salesName)
      .replaceAll("{{websiteName}}", websiteName);
      
    setEmailDraft({ subject, body });
  };

  const handleWhatsAppTemplateChange = (e) => {
    const idx = e.target.value;
    setSelectedWaTpl(idx);
    if (idx === "") {
      return;
    }
    const tpl = whatsappTemplates[idx];
    setWaText(getInterpolatedText(tpl.body));
  };

  const handleCopyWhatsApp = () => {
    if (!waText) return;
    navigator.clipboard.writeText(waText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Direct In-Page WhatsApp Dispatch (Zero navigation away)
  const handleSendDirectWhatsApp = async () => {
    if (!customer?.phone) {
      setWaNotice({ type: "error", message: "This lead does not have a registered phone number." });
      return;
    }
    if (!waText || !waText.trim()) {
      setWaNotice({ type: "error", message: "Please compose or select a WhatsApp message body first." });
      return;
    }

    setWaNotice(null);
    setLocalSendingWa(true);
    try {
      if (onSendWhatsApp) {
        await onSendWhatsApp({
          to: customer.phone,
          message: waText.trim(),
          customerId: customer._id
        });
      } else {
        await api.post("/api/crm/communication/send-whatsapp", {
          to: customer.phone,
          message: waText.trim(),
          customerId: customer._id
        });
      }
      setWaNotice({
        type: "success",
        message: `WhatsApp message dispatched directly to ${customer.phone}!`
      });
      setTimeout(() => setWaNotice(null), 5000);
    } catch (err) {
      setWaNotice({
        type: "error",
        message: err.message || "Failed to dispatch WhatsApp message directly."
      });
    } finally {
      setLocalSendingWa(false);
    }
  };

  // Fallback: Open WhatsApp Web externally
  const handleOpenWhatsAppWeb = () => {
    if (!customer?.phone) {
      alert("This customer doesn't have a registered phone number.");
      return;
    }
    const cleanPhone = customer.phone.replace(/[+\s-]/g, "");
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`;
    window.open(url, "_blank");
  };

  const handleEmailFormSubmit = async (e) => {
    e.preventDefault();
    setEmailNotice(null);
    try {
      await onSendEmail(e);
      setEmailNotice({
        type: "success",
        message: `Direct email dispatched successfully to ${customer?.email || "customer"}!`
      });
      setTimeout(() => setEmailNotice(null), 5000);
    } catch (err) {
      setEmailNotice({
        type: "error",
        message: err.message || "Email dispatch failed. Please check SMTP settings."
      });
    }
  };

  const customerPhoneClean = customer?.phone ? customer.phone.trim() : "";
  const hasPhone = Boolean(customerPhoneClean);
  const hasEmail = Boolean(customer?.email?.trim());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ──────────────── Direct Sales Email Panel ──────────────── */}
      <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Mail size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Direct Sales Email</p>
              <p className="text-[8px] font-bold text-slate-400">Direct SMTP dispatch to prospect mailbox.</p>
            </div>
          </div>

          <div className="text-right">
            {hasEmail ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                {customer.email}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-bold">
                <AlertCircle size={10} />
                No Email
              </span>
            )}
          </div>
        </div>

        {/* Email Template Select */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Select Email Template</label>
          <select
            value={selectedEmailTpl}
            onChange={handleEmailTemplateChange}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-300 transition-all cursor-pointer"
          >
            <option value="">-- Choose Email Template --</option>
            {emailTemplates.map((tpl, idx) => (
              <option key={tpl.name} value={idx}>{tpl.name}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleEmailFormSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Subject Line</label>
            <input
              value={emailDraft.subject}
              onChange={(e) => setEmailDraft(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="e.g. Follow-up regarding your inquiry"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-bold outline-none focus:bg-white focus:border-indigo-300 transition-all"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email Body</label>
            <textarea
              value={emailDraft.body}
              onChange={(e) => setEmailDraft(prev => ({ ...prev, body: e.target.value }))}
              rows={7}
              placeholder="Type message directly to customer..."
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] font-medium outline-none focus:bg-white focus:border-indigo-300 transition-all resize-none"
              required
            />
          </div>

          {/* Email Inline Feedback Banner */}
          {emailNotice && (
            <div className={`p-3 rounded-xl border text-[10px] font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
              emailNotice.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                : "bg-red-50 border-red-200 text-red-600"
            }`}>
              {emailNotice.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{emailNotice.message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={sendingEmail || !emailDraft.subject.trim() || !emailDraft.body.trim() || !hasEmail}
            className="w-full py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.25em] hover:bg-slate-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {sendingEmail ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Dispatching Direct Email...</span>
              </>
            ) : (
              <>
                <Send size={12} /> Deploy Direct Email
              </>
            )}
          </button>
        </form>
      </div>

      {/* ──────────────── WhatsApp Direct Follow-up Panel ──────────────── */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <MessageSquare size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Direct WhatsApp</p>
              <p className="text-[8px] font-bold text-slate-400">Direct outbound delivery without page navigation.</p>
            </div>
          </div>

          <div className="text-right">
            {hasPhone ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-bold">
                <Smartphone size={10} />
                {customer.phone}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-bold">
                <AlertCircle size={10} />
                No Phone
              </span>
            )}
          </div>
        </div>

        {/* WhatsApp Template Select */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Select WhatsApp Template (Optional)</label>
          <select
            value={selectedWaTpl}
            onChange={handleWhatsAppTemplateChange}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:bg-white focus:border-emerald-300 transition-all cursor-pointer"
          >
            <option value="">-- Choose WhatsApp Template (Optional) --</option>
            {whatsappTemplates.map((tpl, idx) => (
              <option key={tpl.name} value={idx}>{tpl.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Message Body</label>
              <span className="text-[8px] font-bold text-slate-400">{waText.length} chars</span>
            </div>
            <textarea
              value={waText}
              onChange={(e) => setWaText(e.target.value)}
              rows={7}
              placeholder="Type message directly or choose a template above..."
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] font-medium outline-none focus:bg-white focus:border-emerald-300 transition-all resize-none"
            />
          </div>

          {/* WhatsApp Inline Feedback Banner */}
          {waNotice && (
            <div className={`p-3 rounded-xl border text-[10px] font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
              waNotice.type === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                : "bg-red-50 border-red-200 text-red-600"
            }`}>
              {waNotice.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{waNotice.message}</span>
            </div>
          )}

          {/* Direct WhatsApp Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* Primary Direct Send Button (No Navigation) */}
            <button
              type="button"
              onClick={handleSendDirectWhatsApp}
              disabled={isSendingWa || !waText.trim() || !hasPhone}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSendingWa ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Dispatching Direct WhatsApp...</span>
                </>
              ) : (
                <>
                  <Send size={13} /> Send WhatsApp Direct
                </>
              )}
            </button>

            {/* Secondary Actions: Copy Msg & WhatsApp Web Fallback */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                disabled={!waText.trim()}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy Msg"}
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsAppWeb}
                disabled={!hasPhone}
                title="Open manually in WhatsApp Web (external tab fallback)"
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-[9px] font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <ExternalLink size={12} /> WhatsApp Web
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
