import React, { useState, useEffect } from "react";
import { Plus, FileText, CheckCircle, Shield, X, Save, Trash2, Pencil, Send, AlertCircle } from "lucide-react";
import { api } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { QuickCreateItemModal, ItemAutocomplete } from "../ItemAutocomplete.jsx";

import { formatCurrency, getCurrencySymbol } from "../../utils/currencyFormatter.js";

function StatusBadge({ status }) {
  const styles = {
    draft: "bg-slate-50 text-slate-600 border-slate-200",
    sent: "bg-indigo-50 text-indigo-700 border-indigo-100",
    viewed: "bg-sky-50 text-sky-700 border-sky-100",
    pending_approval: "bg-amber-50 text-amber-700 border-amber-100",
    accepted: "bg-emerald-50 text-emerald-700 border-emerald-100",
    denied: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return (
    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${styles[status] || styles.draft}`}>
      {String(status || "").replace(/_/g, " ")}
    </span>
  );
}

const BLANK_ITEM = { description: "", quantity: 1, price: 0, total: 0 };
const DEFAULT_VALID_DAYS = 15;

function QuoteForm({ initial, onSubmit, onCancel, submitting, websiteId, customer, title }) {
  const [form, setForm] = useState(initial || {
    items: [{ ...BLANK_ITEM }],
    notes: "",
    validUntil: new Date(Date.now() + DEFAULT_VALID_DAYS * 86400000).toISOString().split("T")[0]
  });
  const [quickCreate, setQuickCreate] = useState(null);

  const updateItem = (idx, patch) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], ...patch };
    items[idx].total = items[idx].quantity * items[idx].price;
    setForm({ ...form, items });
  };

  const totalAmount = form.items.reduce((acc, i) => acc + Number(i.total || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, total: totalAmount, subtotal: totalAmount });
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 shadow-xl animate-in fade-in slide-in-from-top-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{title}</p>
        <div className="flex gap-2">
          {[
            { label: "SaaS", items: [{ description: "Monthly SaaS Subscription", quantity: 1, price: 4999, total: 4999 }, { description: "One-time Setup Fee", quantity: 1, price: 1999, total: 1999 }] },
            { label: "Consulting", items: [{ description: "Hourly Consulting", quantity: 10, price: 1500, total: 15000 }] }
          ].map(t => (
            <button key={t.label} type="button"
              onClick={() => setForm({ ...form, items: t.items })}
              className="px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-[8px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
            >Use {t.label}</button>
          ))}
        </div>
      </div>

      <form id="quoteForm" onSubmit={handleSubmit} className="space-y-3">
        {/* Line Items */}
        <div className="space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Line Items</p>
          {form.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-6">
                <ItemAutocomplete
                  value={item.description}
                  websiteId={websiteId || customer?.websiteId}
                  onChange={(val) => updateItem(idx, { description: val })}
                  onSelect={(inv) => updateItem(idx, { description: inv.name, price: inv.unitCost || 0, total: item.quantity * (inv.unitCost || 0) })}
                  onCreateNew={(name) => setQuickCreate({ name, targetIdx: idx })}
                  placeholder="Item description"
                />
              </div>
              <div className="col-span-2">
                <input type="number" min="1" value={item.quantity}
                  onChange={e => updateItem(idx, { quantity: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Qty"
                />
              </div>
              <div className="col-span-3">
                <input type="number" min="0" value={item.price}
                  onChange={e => updateItem(idx, { price: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder={`Price (${getCurrencySymbol()})`}
                />
              </div>
              <div className="col-span-1 flex items-center justify-center pt-1.5">
                {form.items.length > 1 && (
                  <button type="button"
                    onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}
                    className="text-rose-400 hover:text-rose-600 font-black text-lg transition-colors leading-none"
                  >×</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button type="button"
          onClick={() => setForm({ ...form, items: [...form.items, { ...BLANK_ITEM }] })}
          className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1 transition-colors"
        >+ Add Line Item</button>

        {/* Notes & Validity */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <label className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes</span>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              placeholder="Optional notes..."
            />
          </label>
          <label className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valid Until</span>
            <input type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-[12px] font-black text-slate-900">Total: {formatCurrency(totalAmount)}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors"
            >Cancel</button>
            <button type="submit" form="quoteForm" disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow disabled:opacity-50"
            >
              <Save size={13} />
              {submitting ? "Saving…" : "Save Quote"}
            </button>
          </div>
        </div>
      </form>

      {quickCreate && (
        <QuickCreateItemModal
          initialName={quickCreate.name}
          websiteId={websiteId || customer?.websiteId}
          onClose={() => setQuickCreate(null)}
          onCreated={(newItem) => {
            updateItem(quickCreate.targetIdx, {
              description: newItem.name,
              price: newItem.unitCost || 0,
              total: (form.items[quickCreate.targetIdx]?.quantity || 1) * (newItem.unitCost || 0)
            });
            setQuickCreate(null);
          }}
        />
      )}
    </div>
  );
}

export default function CRMQuotationTab({ customer, websiteId }) {
  const { user } = useAuth();
  const isManager = ["admin", "client", "manager"].includes(user?.role);

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null); // quote object being edited
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { fetchQuotes(); }, [customer?._id]);

  const fetchQuotes = async () => {
    if (!customer?._id) return;
    setLoading(true);
    try {
      const data = await api(`/api/crm/${customer._id}/quotations`);
      setQuotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch quotes", err);
    } finally {
      setLoading(false);
    }
  };

  // CREATE
  const handleCreate = async (formData) => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await api("/api/crm/quotations", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer._id,
          websiteId: websiteId || customer.websiteId,
          ...formData
        })
      });
      setShowCreate(false);
      fetchQuotes();
    } catch (err) {
      setError(err.message || "Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  // UPDATE
  const handleUpdate = async (formData) => {
    if (!editingQuote || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await api(`/api/crm/quotations/${editingQuote._id}`, {
        method: "PUT",
        body: JSON.stringify(formData)
      });
      setEditingQuote(null);
      fetchQuotes();
    } catch (err) {
      setError(err.message || "Failed to update quotation");
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    setDeletingId(id);
    setError("");
    try {
      await api(`/api/crm/quotations/${id}`, { method: "DELETE" });
      setConfirmDeleteId("");
      fetchQuotes();
    } catch (err) {
      setError(err.message || "Failed to delete quotation");
    } finally {
      setDeletingId("");
    }
  };

  const approveQuote = async (id) => {
    try { await api(`/api/crm/quotations/${id}/approve`, { method: "POST", body: JSON.stringify({}) }); fetchQuotes(); }
    catch (err) { console.error(err); }
  };

  const denyQuote = async (id) => {
    try { await api(`/api/crm/quotations/${id}/deny`, { method: "POST", body: JSON.stringify({}) }); fetchQuotes(); }
    catch (err) { console.error(err); }
  };

  const [wonResult, setWonResult] = useState(null);

  const markStatus = async (id, status) => {
    setError("");
    try {
      const result = await api(`/api/crm/quotations/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      if (status === "accepted" && result) {
        setWonResult({
          quotationId: result.quotation?.quotationId || id,
          invoiceId: result.autoInvoice?.invoiceId || null,
          code: result.autoCode || null,
          total: result.autoInvoice?.total || result.quotation?.total || 0
        });
      }
      fetchQuotes();
    } catch (err) {
      setError(err.message || "Failed to update status");
    }
  };

  const canEdit = (q) => ["draft", "sent"].includes(q.status);
  const canDelete = (q) => ["draft", "denied"].includes(q.status);

  if (loading) return <div className="py-10 text-center animate-pulse text-slate-400 text-[10px] font-black uppercase">Syncing financial data…</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Digital Quotations</h3>
        {!showCreate && !editingQuote && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Plus size={12} /> New Quote
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[10px] font-black text-rose-600 uppercase tracking-widest">
          <AlertCircle size={14} />
          {error}
          <button onClick={() => setError("")} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Post-Win Success Banner */}
      {wonResult && (
        <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-indigo-50 p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                <CheckCircle size={24} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 tracking-tight">🎉 Deal Won Successfully!</h4>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  Quotation {wonResult.quotationId} marked as accepted
                </p>
              </div>
            </div>
            <button onClick={() => setWonResult(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-slate-900 transition-all border border-slate-100">
              <X size={14} />
            </button>
          </div>

          <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest">What happened automatically:</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black">1</div>
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Customer Promoted</span>
              </div>
              <p className="text-[10px] font-bold text-slate-500">Pipeline stage set to <span className="font-black text-slate-900">Won</span></p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white p-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black">2</div>
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Code Generated</span>
              </div>
              <p className="text-[10px] font-bold text-slate-500">
                {wonResult.code
                  ? <>Lock code: <span className="font-black text-slate-900 font-mono">{wonResult.code}</span></>
                  : "Customer was already locked"
                }
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-white p-4 space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-black">3</div>
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Invoice Created</span>
              </div>
              <p className="text-[10px] font-bold text-slate-500">
                {wonResult.invoiceId
                  ? <><span className="font-black text-slate-900">{wonResult.invoiceId}</span> — {formatCurrency(wonResult.total)}</>
                  : "Invoice already existed"
                }
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">📋 Next Steps</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-indigo-500">→</span>
                <span className="text-[10px] font-bold text-slate-600">Check <span className="font-black text-slate-900">Invoices</span> tab to view and share the auto-generated invoice</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-indigo-500">→</span>
                <span className="text-[10px] font-bold text-slate-600"><span className="font-black text-slate-900">Purchase team</span> has been notified automatically</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-indigo-500">→</span>
                <span className="text-[10px] font-bold text-slate-600">Track payment status in the <span className="font-black text-slate-900">Invoices</span> tab</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-indigo-500">→</span>
                <span className="text-[10px] font-bold text-slate-600">Customer record is now <span className="font-black text-slate-900">locked</span> from further stage changes</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Create Form */}
      {showCreate && (
        <QuoteForm
          title="New Quote Construction"
          websiteId={websiteId}
          customer={customer}
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Edit Form */}
      {editingQuote && (
        <QuoteForm
          title={`Editing ${editingQuote.quotationId}`}
          websiteId={websiteId}
          customer={customer}
          submitting={submitting}
          initial={{
            items: editingQuote.items || [{ ...BLANK_ITEM }],
            notes: editingQuote.notes || "",
            validUntil: editingQuote.validUntil
              ? new Date(editingQuote.validUntil).toISOString().split("T")[0]
              : new Date(Date.now() + DEFAULT_VALID_DAYS * 86400000).toISOString().split("T")[0]
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingQuote(null)}
        />
      )}

      {/* Quotes List */}
      <div className="space-y-3">
        {quotes.length === 0 ? (
          <div className="py-16 text-center space-y-3 border-2 border-dashed border-slate-100 rounded-2xl">
            <FileText size={32} className="mx-auto text-slate-100" />
            <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">No active quotations</p>
            <button onClick={() => setShowCreate(true)}
              className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors"
            >+ Create First Quote</button>
          </div>
        ) : (
          quotes.map(quote => (
            <div key={quote._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group">
              <div className="p-5 flex items-center justify-between gap-4">
                {/* Left: Icon + Info */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    quote.status === "accepted" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                    quote.status === "pending_approval" ? "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse" :
                    quote.status === "denied" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                    "bg-slate-50 text-slate-400 border border-slate-100"
                  }`}>
                    {quote.status === "accepted" ? <CheckCircle size={18} /> :
                     quote.status === "pending_approval" ? <Shield size={18} /> :
                     <FileText size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{quote.quotationId}</p>
                      <StatusBadge status={quote.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(quote.createdAt).toLocaleDateString()}</span>
                      {quote.validUntil && (
                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">
                          Valid till {new Date(quote.validUntil).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-[9px] font-bold text-slate-300 uppercase">{quote.items?.length || 0} items</span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount + Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-sm font-black text-slate-900">{formatCurrency(quote.total)}</p>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* Edit */}
                    {canEdit(quote) && !editingQuote && !showCreate && (
                      <button onClick={() => { setEditingQuote(quote); setShowCreate(false); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                      ><Pencil size={10} /> Edit</button>
                    )}

                    {/* Status actions */}
                    {quote.status === "draft" && (
                      <button onClick={() => markStatus(quote._id, "sent")}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-sky-100 bg-sky-50 text-sky-600 text-[8px] font-black uppercase tracking-widest hover:bg-sky-100 transition-all"
                      ><Send size={10} /> Send</button>
                    )}
                    {["draft", "sent", "viewed"].includes(quote.status) && (
                      <button onClick={() => markStatus(quote._id, "accepted")}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all"
                      ><CheckCircle size={10} /> Mark Won</button>
                    )}
                    {quote.status === "pending_approval" && isManager && (
                      <>
                        <button onClick={() => approveQuote(quote._id)}
                          className="px-2 py-1 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase hover:bg-emerald-100 transition-all"
                        >Approve</button>
                        <button onClick={() => denyQuote(quote._id)}
                          className="px-2 py-1 rounded-lg border border-rose-100 bg-rose-50 text-rose-600 text-[8px] font-black uppercase hover:bg-rose-100 transition-all"
                        >Deny</button>
                      </>
                    )}
                    {quote.status === "pending_approval" && !isManager && (
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                        <Shield size={8} /> Reviewing…
                      </span>
                    )}

                    {/* Delete */}
                    {canDelete(quote) && (
                      confirmDeleteId === quote._id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-black text-rose-500 uppercase">Delete?</span>
                          <button
                            onClick={() => handleDelete(quote._id)}
                            disabled={deletingId === quote._id}
                            className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[8px] font-black uppercase hover:bg-rose-700 transition-all disabled:opacity-50"
                          >{deletingId === quote._id ? "…" : "Yes"}</button>
                          <button onClick={() => setConfirmDeleteId("")}
                            className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[8px] font-black uppercase hover:bg-slate-200 transition-all"
                          >No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(quote._id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-100 bg-rose-50 text-rose-500 text-[8px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all opacity-0 group-hover:opacity-100"
                        ><Trash2 size={10} /> Delete</button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Accepted label */}
              {quote.status === "accepted" && (
                <div className="px-5 pb-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 italic">✓ Confirmed Won Deal</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
