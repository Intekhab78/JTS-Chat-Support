import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { api } from "../../api/client.js";
import { useCurrency } from "../../context/CurrencyContext.jsx";
import SearchableCustomerSelect from "../SearchableCustomerSelect.jsx";

export default function CrmLeadModal({
  show,
  onClose,
  editLeadId,
  form,
  setForm,
  onSubmit,
  creating,
  canAssignOwners,
  teamMembers = [],
  websites = []
}) {
  const { currencySymbol = "$" } = useCurrency();
  const [catalogServices, setCatalogServices] = useState([]);
  const [customServiceMode, setCustomServiceMode] = useState(false);

  useEffect(() => {
    if (!show) return;
    let active = true;
    const loadCatalog = async () => {
      const wsId = form.websiteId && form.websiteId !== "all" ? form.websiteId : "";
      const wsQs = wsId ? `?websiteId=${encodeURIComponent(wsId)}` : "";
      const [prodRes, invRes] = await Promise.allSettled([
        api(`/api/crm/products${wsQs}`),
        api(`/api/inventory/items${wsQs}`)
      ]);
      if (!active) return;

      const names = new Set();
      if (prodRes.status === "fulfilled") {
        const list = Array.isArray(prodRes.value)
          ? prodRes.value
          : prodRes.value?.products || prodRes.value?.items || [];
        list.forEach((p) => {
          const n = String(p?.name || p?.title || "").trim();
          if (n) names.add(n);
        });
      }
      if (invRes.status === "fulfilled") {
        const list = Array.isArray(invRes.value)
          ? invRes.value
          : invRes.value?.items || invRes.value?.data || [];
        list.forEach((i) => {
          const n = String(i?.name || i?.itemName || "").trim();
          if (n) names.add(n);
        });
      }
      setCatalogServices(Array.from(names).sort((a, b) => a.localeCompare(b)));
    };
    loadCatalog();
    return () => {
      active = false;
    };
  }, [show, form.websiteId]);

  const serviceOptions = useMemo(() => {
    const list = [...catalogServices];
    if (form.serviceType && !list.includes(form.serviceType)) {
      list.unshift(form.serviceType);
    }
    return list;
  }, [catalogServices, form.serviceType]);

  const activeTeamMembers = useMemo(
    () =>
      (teamMembers || []).filter(
        (m) => m && m._id && ["sales", "manager", "agent", "admin", "client"].includes(m.role)
      ),
    [teamMembers]
  );

  if (!show) return null;

  const inputCls =
    "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 disabled:opacity-50";
  const labelCls =
    "text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1";
  const sectionCls =
    "text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              {editLeadId ? "Refine Lead" : "Add New Lead"}
            </h3>
            <p className="text-[10px] font-semibold text-slate-400">
              {editLeadId ? "Update lead details, pipeline stage & financials" : "Create a new lead in your CRM pipeline"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Compact Body */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-5 py-3.5 space-y-3.5 overflow-y-auto flex-1">
            {/* 1. Basic & Contact */}
            <div className="space-y-2">
              <p className={sectionCls}>Basic &amp; Contact Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                <SearchableCustomerSelect
                  label="Company / Organization"
                  mode="company"
                  value={form.companyName || ""}
                  websiteId={form.websiteId}
                  placeholder="Company name..."
                  onChange={(val) => setForm((prev) => ({ ...prev, companyName: val }))}
                  onSelectEntity={(item) =>
                    setForm((prev) => ({
                      ...prev,
                      companyName: item.companyName || item.name,
                      name: item.name || prev.name,
                      email: item.email || prev.email,
                      phone: item.phone || prev.phone,
                      trn: item.trn || prev.trn,
                      tradeLicenseNumber: item.tradeLicenseNumber || prev.tradeLicenseNumber
                    }))
                  }
                />
                <SearchableCustomerSelect
                  label="Owner / Contact Name *"
                  mode="customer"
                  value={form.name || ""}
                  websiteId={form.websiteId}
                  placeholder="Contact full name..."
                  onChange={(val) => setForm((prev) => ({ ...prev, name: val }))}
                  onSelectEntity={(item) =>
                    setForm((prev) => ({
                      ...prev,
                      name: item.name || prev.name,
                      companyName: item.companyName || prev.companyName,
                      email: item.email || prev.email,
                      phone: item.phone || prev.phone,
                      trn: item.trn || prev.trn,
                      tradeLicenseNumber: item.tradeLicenseNumber || prev.tradeLicenseNumber
                    }))
                  }
                />
                <div>
                  <label className={labelCls}>Email Address</label>
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="name@company.com"
                    className={inputCls}
                    disabled={!!editLeadId}
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <input
                    value={form.phone || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Service / Product Type</label>
                  {customServiceMode ? (
                    <div className="flex gap-1.5">
                      <input
                        value={form.serviceType || ""}
                        onChange={(e) => setForm((prev) => ({ ...prev, serviceType: e.target.value }))}
                        placeholder="Enter custom service..."
                        className={inputCls}
                      />
                      <button
                        type="button"
                        onClick={() => setCustomServiceMode(false)}
                        className="px-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0"
                      >
                        List
                      </button>
                    </div>
                  ) : (
                    <select
                      value={form.serviceType || ""}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setCustomServiceMode(true);
                          setForm((prev) => ({ ...prev, serviceType: "" }));
                        } else {
                          setForm((prev) => ({ ...prev, serviceType: e.target.value }));
                        }
                      }}
                      className={inputCls}
                    >
                      <option value="">Select service / product...</option>
                      {serviceOptions.map((srv) => (
                        <option key={srv} value={srv}>
                          {srv}
                        </option>
                      ))}
                      <option value="__custom__">+ Custom Service...</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Assigned Consultant</label>
                  <select
                    value={form.ownerId || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, ownerId: e.target.value }))}
                    className={inputCls}
                    disabled={!canAssignOwners}
                  >
                    <option value="">Unassigned</option>
                    {activeTeamMembers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Pipeline & Qualification */}
            <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <p className={sectionCls}>Pipeline, Status &amp; Qualification</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className={labelCls}>Pipeline Stage</label>
                  <select
                    value={form.pipelineStage || "new"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        pipelineStage: e.target.value,
                        status: e.target.value
                      }))
                    }
                    className={inputCls}
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
                <div>
                  <label className={labelCls}>Work Status</label>
                  <select
                    value={form.workStatus || "Pending"}
                    onChange={(e) => setForm((prev) => ({ ...prev, workStatus: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Payment Status</label>
                  <select
                    value={form.paymentStatus || "Pending"}
                    onChange={(e) => setForm((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priority</label>
                  <select
                    value={form.priority || "medium"}
                    onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Interest Level</label>
                  <select
                    value={form.interestLevel || "warm"}
                    onChange={(e) => setForm((prev) => ({ ...prev, interestLevel: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="cold">Cold</option>
                    <option value="warm">Warm</option>
                    <option value="hot">Hot</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Lead Source</label>
                  <select
                    value={form.leadSource || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, leadSource: e.target.value }))}
                    className={inputCls}
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
                <div>
                  <label className={labelCls}>Timeline</label>
                  <select
                    value={form.timeline || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, timeline: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select timeline...</option>
                    <option value="immediate">Immediate</option>
                    <option value="1_month">1 Month</option>
                    <option value="3_months">3 Months</option>
                    <option value="6_months">6 Months</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Next Follow-up</label>
                  <input
                    type="date"
                    value={form.nextFollowUpAt ? String(form.nextFollowUpAt).split("T")[0] : ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, nextFollowUpAt: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              {form.pipelineStage === "lost" && (
                <div>
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-wider block mb-1">
                    Lost Reason
                  </label>
                  <select
                    value={form.lostReason || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, lostReason: e.target.value }))}
                    className="w-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 outline-none"
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
            </div>

            {/* 3. Financials & Notes */}
            <div className="space-y-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <p className={sectionCls}>Financials &amp; Notes</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className={labelCls}>Est. Value ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    value={form.leadValue || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, leadValue: e.target.value }))}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Budget ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    value={form.budget || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, budget: e.target.value }))}
                    placeholder="0.00"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Probability %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.probability || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, probability: e.target.value }))}
                    placeholder="Auto"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Decision Maker</label>
                  <input
                    value={form.decisionMaker || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, decisionMaker: e.target.value }))}
                    placeholder="e.g. CEO / Head"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Expected Close</label>
                  <input
                    type="date"
                    value={form.expectedCloseDate ? String(form.expectedCloseDate).split("T")[0] : ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, expectedCloseDate: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={labelCls}>Requirement Summary</label>
                  <textarea
                    value={form.requirement || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, requirement: e.target.value }))}
                    placeholder="What is the customer looking for..."
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Internal Notes</label>
                  <textarea
                    value={form.notes || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    placeholder="Strategic context or remarks..."
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/60 dark:bg-slate-900 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider shadow-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {creating ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              {creating ? "Saving..." : editLeadId ? "Update Lead" : "Save Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
