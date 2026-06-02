import React from "react";
import { Mail, Send } from "lucide-react";

export default function EmailTab({ 
  emailDraft, 
  setEmailDraft, 
  onSendEmail, 
  sendingEmail 
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Mail size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Direct Sales Email</p>
            <p className="text-[9px] font-bold text-slate-400">Send high-intent follow-up directly to lead.</p>
          </div>
        </div>

        <form onSubmit={onSendEmail} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subject Line</label>
            <input
              value={emailDraft.subject}
              onChange={(e) => setEmailDraft(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="e.g. Follow-up regarding your inquiry"
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Intelligence Body</label>
            <textarea
              value={emailDraft.body}
              onChange={(e) => setEmailDraft(prev => ({ ...prev, body: e.target.value }))}
              rows={8}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none shadow-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={sendingEmail || !emailDraft.subject.trim() || !emailDraft.body.trim()}
            className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.25em] hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {sendingEmail ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={14} /> Deploy Email
              </>
            )}
          </button>
        </form>
      </div>
      
      <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sent emails will appear in the customer's timeline history.</p>
      </div>
    </div>
  );
}
