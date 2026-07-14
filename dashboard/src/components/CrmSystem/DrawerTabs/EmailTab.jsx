import React, { useState, useEffect } from "react";
import { Mail, Send, MessageSquare, Copy, ExternalLink, ArrowRight, Check } from "lucide-react";
import { useAuth } from "../../../context/AuthContext.jsx";

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
  customer
}) {
  const { user } = useAuth();
  
  const [selectedEmailTpl, setSelectedEmailTpl] = useState("");
  const [selectedWaTpl, setSelectedWaTpl] = useState("");
  const [waText, setWaText] = useState("");
  const [copied, setCopied] = useState(false);

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
      setWaText("");
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

  const handleOpenWhatsApp = () => {
    if (!customer?.phone) {
      alert("This customer doesn't have a registered phone number.");
      return;
    }
    const cleanPhone = customer.phone.replace(/[+\s-]/g, "");
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Direct Sales Email Panel */}
      <div className="bg-white rounded-2xl border border-indigo-100 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Mail size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Direct Sales Email</p>
            <p className="text-[8px] font-bold text-slate-400">Send prefilled templates directly to the lead.</p>
          </div>
        </div>

        {/* Email Template Select */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Select Email Template</label>
          <select
            value={selectedEmailTpl}
            onChange={handleEmailTemplateChange}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none"
          >
            <option value="">-- Choose Email Template --</option>
            {emailTemplates.map((tpl, idx) => (
              <option key={tpl.name} value={idx}>{tpl.name}</option>
            ))}
          </select>
        </div>

        <form onSubmit={onSendEmail} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Subject Line</label>
            <input
              value={emailDraft.subject}
              onChange={(e) => setEmailDraft(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="e.g. Follow-up regarding your inquiry"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-bold outline-none focus:bg-white transition-all"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email Body</label>
            <textarea
              value={emailDraft.body}
              onChange={(e) => setEmailDraft(prev => ({ ...prev, body: e.target.value }))}
              rows={7}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] font-medium outline-none focus:bg-white transition-all resize-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={sendingEmail || !emailDraft.subject.trim() || !emailDraft.body.trim()}
            className="w-full py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.25em] hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sendingEmail ? (
              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={12} /> Deploy Email
              </>
            )}
          </button>
        </form>
      </div>

      {/* WhatsApp Quick Follow-up Panel */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <MessageSquare size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">WhatsApp Follow-up</p>
            <p className="text-[8px] font-bold text-slate-400">Reach prospects directly on WhatsApp Web.</p>
          </div>
        </div>

        {/* WhatsApp Template Select */}
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Select WhatsApp Template</label>
          <select
            value={selectedWaTpl}
            onChange={handleWhatsAppTemplateChange}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 outline-none"
          >
            <option value="">-- Choose WhatsApp Template --</option>
            {whatsappTemplates.map((tpl, idx) => (
              <option key={tpl.name} value={idx}>{tpl.name}</option>
            ))}
          </select>
        </div>

        {selectedWaTpl && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Message Body</label>
              <textarea
                value={waText}
                onChange={(e) => setWaText(e.target.value)}
                rows={6}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] font-medium outline-none focus:bg-white transition-all resize-none"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy Msg"}
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
              >
                <ExternalLink size={12} /> WhatsApp Web
              </button>
            </div>
          </div>
        )}

        {!selectedWaTpl && (
          <div className="h-[180px] border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-center p-4">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Select a WhatsApp Template to launch quick follow-up.</p>
          </div>
        )}
      </div>
    </div>
  );
}
