import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getCurrencySymbol } from "../../utils/currencyFormatter.js";

export default function CrmLeadModal({
  show,
  onClose,
  editLeadId,
  form,
  setForm,
  onSubmit,
  creating,
  canAssignOwners,
  teamMembers,
  websites = []
}) {
  if (!show) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-99 animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-full md:w-170 bg-white border-l border-slate-200 z-100 shadow-[0_0_60px_rgba(0,0,0,0.2)] flex flex-col animate-in slide-in-from-right duration-500">
        <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.25em] text-slate-900">{editLeadId ? "Refine Lead" : "Inject Lead"}</h3>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">Populate the pipeline with high-fidelity customer intelligence.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-3 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
          {/* Section 1: Basic Information */}
          <div className="space-y-5">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-2">
              Section 1 • Basic Information
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Company / Organization Name</label>
                <input
                  value={form.companyName || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="e.g. Al Reza Global LLC"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Owner / Contact Name</label>
                <input
                  value={form.name || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Sheikh Mohammed"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@alreza.ae"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 disabled:opacity-50"
                  disabled={!!editLeadId}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                <input
                  value={form.phone || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+971 50 123 4567"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Compliance Information */}
          <div className="space-y-5 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-2">
              Section 2 • Compliance Information
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TRN (15-digit Tax No)</label>
                <input
                  value={form.trn || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, trn: e.target.value }))}
                  placeholder="100023456700003"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trade License Number</label>
                <input
                  value={form.tradeLicenseNumber || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, tradeLicenseNumber: e.target.value }))}
                  placeholder="CN-1049281"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trade License Expiry</label>
                <input
                  type="date"
                  value={form.tradeLicenseExpiryDate ? String(form.tradeLicenseExpiryDate).split("T")[0] : ""}
                  onChange={(e) => setForm(prev => ({ ...prev, tradeLicenseExpiryDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Services & Consultant */}
          <div className="space-y-5 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-2">
              Section 3 • Services & Consultant
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Service Type</label>
                <select
                  value={form.serviceType || "Corporate Tax Registration"}
                  onChange={(e) => setForm(prev => ({ ...prev, serviceType: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                >
                  <option value="Corporate Tax Registration">Corporate Tax Registration</option>
                  <option value="Corporate Tax Filing">Corporate Tax Filing</option>
                  <option value="VAT Registration">VAT Registration</option>
                  <option value="VAT Filing">VAT Filing</option>
                  <option value="Trade License Renewal">Trade License Renewal</option>
                  <option value="PRO Services">PRO Services</option>
                  <option value="Other Services">Other Services</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned Consultant</label>
                <select
                  value={form.ownerId || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, ownerId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 disabled:opacity-50"
                  disabled={!canAssignOwners}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(m => (
                    <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Status */}
          <div className="space-y-5 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-2">
              Section 4 • Work & Payment Status
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Work Status</label>
                <select
                  value={form.workStatus || "Pending"}
                  onChange={(e) => setForm(prev => ({ ...prev, workStatus: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Status</label>
                <select
                  value={form.paymentStatus || "Pending"}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                >
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Compliance Dates */}
          <div className="space-y-5 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-2">
              Section 5 • Compliance & Follow-up Schedule
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VAT Due Date</label>
                <input
                  type="date"
                  value={form.vatFilingDueDate ? String(form.vatFilingDueDate).split("T")[0] : ""}
                  onChange={(e) => setForm(prev => ({ ...prev, vatFilingDueDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Corporate Tax Due Date</label>
                <input
                  type="date"
                  value={form.corporateTaxDueDate ? String(form.corporateTaxDueDate).split("T")[0] : ""}
                  onChange={(e) => setForm(prev => ({ ...prev, corporateTaxDueDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Follow-up Date</label>
                <input
                  type="date"
                  value={form.nextFollowUpAt ? String(form.nextFollowUpAt).split("T")[0] : ""}
                  onChange={(e) => setForm(prev => ({ ...prev, nextFollowUpAt: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
            </div>
          </div>

          {/* Qualification Section */}
          <div className="space-y-5">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-2">Qualification</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Source</label>
                <select
                  value={form.leadSource}
                  onChange={(e) => setForm(prev => ({ ...prev, leadSource: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                >
                  <option value="">Select source...</option>
                  <option value="website">Website</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="facebook">Facebook Ads</option>
                  <option value="google">Google Ads</option>
                  <option value="referral">Referral</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Timeline</label>
                <select
                  value={form.timeline}
                  onChange={(e) => setForm(prev => ({ ...prev, timeline: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                >
                  <option value="">Select timeline...</option>
                  <option value="immediate">Immediate</option>
                  <option value="1_month">1 Month</option>
                  <option value="3_months">3 Months</option>
                  <option value="6_months">6 Months</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Requirement</label>
                <textarea
                  value={form.requirement}
                  onChange={(e) => setForm(prev => ({ ...prev, requirement: e.target.value }))}
                  placeholder="Describe what the customer is looking for..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Interest Level</label>
                <select
                  value={form.interestLevel}
                  onChange={(e) => setForm(prev => ({ ...prev, interestLevel: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                >
                  <option value="cold">Cold</option>
                  <option value="warm">Warm</option>
                  <option value="hot">Hot</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pipeline Stage</label>
                <select
                  value={form.pipelineStage}
                  onChange={(e) => setForm(prev => ({ ...prev, pipelineStage: e.target.value, status: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                >
                  <option value="new">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              {form.pipelineStage === "lost" && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Lost Reason</label>
                  <select
                    value={form.lostReason}
                    onChange={(e) => setForm(prev => ({ ...prev, lostReason: e.target.value }))}
                    className="w-full bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-rose-500/5 text-rose-700"
                  >
                    <option value="">Select reason...</option>
                    <option value="price">Price too high</option>
                    <option value="competitor">Lost to Competitor</option>
                    <option value="feature">Missing Feature</option>
                    <option value="timeline">Timeline too long</option>
                    <option value="unresponsive">Unresponsive / Ghosted</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Decision Maker</label>
                <input
                  value={form.decisionMaker}
                  onChange={(e) => setForm(prev => ({ ...prev, decisionMaker: e.target.value }))}
                  placeholder="e.g. CEO, Head of Procurement"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Expected Close Date</label>
                <input
                  type="date"
                  value={form.expectedCloseDate}
                  onChange={(e) => setForm(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
            </div>
          </div>

          {/* Revenue & Assignment */}
          <div className="space-y-5">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-2">Financial Weight & Ownership</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Est. Value ({getCurrencySymbol()})</label>
                <input
                  type="number"
                  value={form.leadValue}
                  onChange={(e) => setForm(prev => ({ ...prev, leadValue: e.target.value }))}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Budget ({getCurrencySymbol()})</label>
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Probability %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.probability}
                  onChange={(e) => setForm(prev => ({ ...prev, probability: e.target.value }))}
                  placeholder="Auto"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              {canAssignOwners && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assign Lead To</label>
                  <select
                    value={form.ownerId}
                    onChange={(e) => setForm(prev => ({ ...prev, ownerId: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 appearance-none"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.filter(m => ["sales", "manager", "tax_consultant"].includes(m.role)).map(m => (
                      <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* UAE Compliance & Licensing Section */}
          <div className="space-y-5">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-2">
              UAE Compliance & Licensing Details
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TRN (Tax Registration Number)</label>
                <input
                  value={form.trn || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, trn: e.target.value }))}
                  placeholder="e.g. 100023456700003"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trade License Number</label>
                <input
                  value={form.tradeLicenseNumber || ""}
                  onChange={(e) => setForm(prev => ({ ...prev, tradeLicenseNumber: e.target.value }))}
                  placeholder="e.g. CN-1049281"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trade License Expiry Date</label>
                <input
                  type="date"
                  value={form.tradeLicenseExpiryDate ? String(form.tradeLicenseExpiryDate).split("T")[0] : ""}
                  onChange={(e) => setForm(prev => ({ ...prev, tradeLicenseExpiryDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Service Type</label>
                <select
                  value={form.serviceType || "Corporate Tax Registration"}
                  onChange={(e) => setForm(prev => ({ ...prev, serviceType: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                >
                  <option value="Corporate Tax Registration">Corporate Tax Registration</option>
                  <option value="Corporate Tax Filing">Corporate Tax Filing</option>
                  <option value="VAT Registration">VAT Registration</option>
                  <option value="VAT Filing">VAT Filing</option>
                  <option value="Trade License Renewal">Trade License Renewal</option>
                  <option value="PRO Services">PRO Services</option>
                  <option value="Other Services">Other Services</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Work Status</label>
                <select
                  value={form.workStatus || "Pending"}
                  onChange={(e) => setForm(prev => ({ ...prev, workStatus: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Status</label>
                <select
                  value={form.paymentStatus || "Pending"}
                  onChange={(e) => setForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                >
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VAT Filing Due Date</label>
                <input
                  type="date"
                  value={form.vatFilingDueDate ? String(form.vatFilingDueDate).split("T")[0] : ""}
                  onChange={(e) => setForm(prev => ({ ...prev, vatFilingDueDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Corporate Tax Due Date</label>
                <input
                  type="date"
                  value={form.corporateTaxDueDate ? String(form.corporateTaxDueDate).split("T")[0] : ""}
                  onChange={(e) => setForm(prev => ({ ...prev, corporateTaxDueDate: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Insight / Requirements</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              placeholder="Record strategic context or requirements..."
              className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-5 text-xs font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none shadow-sm"
            />
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-50 transition-all"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-2 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {creating ? (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (editLeadId ? "Update Lead" : "Deploy Lead")}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}
