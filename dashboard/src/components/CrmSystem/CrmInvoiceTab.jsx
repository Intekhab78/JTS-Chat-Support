import React, { useState, useEffect } from "react";
import { Plus, FileText, CheckCircle, X, Save, Trash2, Pencil, Download, Share2, AlertCircle, ReceiptText, RefreshCw } from "lucide-react";
import { api, getApiBase } from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { QuickCreateItemModal, ItemAutocomplete } from "../ItemAutocomplete.jsx";

import { formatCurrency, getCurrencySymbol } from "../../utils/currencyFormatter.js";

function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border-amber-100",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
    void: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${styles[status] || styles.pending}`}>
      {String(status || "pending").toUpperCase()}
    </span>
  );
}

const BLANK_ITEM = { description: "", quantity: 1, price: 0, total: 0 };

function InvoiceForm({ initial, onSubmit, onCancel, submitting, websiteId, customer, title }) {
  const [form, setForm] = useState(initial || {
    items: [{ ...BLANK_ITEM }],
    notes: "",
    status: "pending"
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
    <div className="bg-white rounded-[32px] border border-slate-200/60 p-6 shadow-sm animate-in fade-in slide-in-from-top-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</p>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-900"><X size={16} /></button>
      </div>

      <form id="invoiceForm" onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Qty"
                />
              </div>
              <div className="col-span-3">
                <input type="number" min="0" value={item.price}
                  onChange={e => updateItem(idx, { price: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder={`Price (${getCurrencySymbol()})`}
                />
              </div>
              <div className="col-span-1 flex items-center justify-center pt-2">
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

        {/* Notes & Status */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <label className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes</span>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              placeholder="Optional notes..."
            />
          </label>
          <label className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
            </select>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-lg font-black text-slate-900">Total: {formatCurrency(totalAmount)}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel}
              className="px-4 py-2 text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors"
            >Cancel</button>
            <button type="submit" form="invoiceForm" disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow disabled:opacity-50"
            >
              <Save size={13} />
              {submitting ? "Saving…" : "Save Invoice"}
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

export default function CRMInvoiceTab({ customer, websiteId, initialInvoices = [], onRefreshRequested }) {
  const { user } = useAuth();
  const isManager = ["admin", "client", "manager", "purchase"].includes(user?.role);

  const [invoices, setInvoices] = useState(initialInvoices);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [error, setError] = useState("");
  const [generatingPdfId, setGeneratingPdfId] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");

  // Sync internal state with props if provided
  useEffect(() => {
    if (initialInvoices.length > 0) {
      setInvoices(initialInvoices);
    } else {
      fetchInvoices();
    }
  }, [initialInvoices, customer?._id]);

  useEffect(() => {
    getApiBase().then(setApiBaseUrl);
  }, []);

  const fetchInvoices = async () => {
    if (!customer?._id) return;
    setLoading(true);
    try {
      const data = await api(`/api/crm/${customer._id}/invoices`);
      setInvoices(Array.isArray(data) ? data : []);
      if (onRefreshRequested) onRefreshRequested();
    } catch (err) {
      console.error("Failed to fetch invoices", err);
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
      await api("/api/crm/invoices", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer._id,
          websiteId: websiteId || customer.websiteId,
          ...formData
        })
      });
      setShowCreate(false);
      fetchInvoices();
    } catch (err) {
      setError(err.message || "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  // UPDATE
  const handleUpdate = async (formData) => {
    if (!editingInvoice || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await api(`/api/crm/invoices/${editingInvoice._id}`, {
        method: "PUT",
        body: JSON.stringify(formData)
      });
      setEditingInvoice(null);
      fetchInvoices();
    } catch (err) {
      setError(err.message || "Failed to update invoice");
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    setDeletingId(id);
    setError("");
    try {
      await api(`/api/crm/invoices/${id}`, { method: "DELETE" });
      setConfirmDeleteId("");
      fetchInvoices();
    } catch (err) {
      setError(err.message || "Failed to delete invoice");
    } finally {
      setDeletingId("");
    }
  };

  // GENERATE PDF
  const handleGeneratePdf = async (id) => {
    setGeneratingPdfId(id);
    setError("");
    try {
      await api(`/api/crm/invoices/${id}/pdf`, { method: "POST" });
      fetchInvoices();
    } catch (err) {
      setError(err.message || "Failed to generate PDF");
    } finally {
      setGeneratingPdfId("");
    }
  };

  // SHARE
  const handleShare = (invoice) => {
    if (!invoice.pdfUrl) {
      setError("Please generate a PDF first before sharing.");
      return;
    }
    const fullUrl = `${apiBaseUrl}${invoice.pdfUrl}`;
    if (navigator.share) {
      navigator.share({
        title: `Invoice ${invoice.invoiceId}`,
        text: `Here is the link to invoice ${invoice.invoiceId}`,
        url: fullUrl,
      }).catch((error) => console.log('Error sharing', error));
    } else {
      navigator.clipboard.writeText(fullUrl);
      alert("Invoice PDF link copied to clipboard!");
    }
  };

  if (!customer) {
    return (
      <div className="premium-card p-10 bg-white rounded-[36px] border-2 border-dashed border-slate-200 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Select a purchase account first</p>
      </div>
    );
  }

  return (
    <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Invoice Ledger</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {`Invoices for ${customer.name || customer.companyName}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchInvoices}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-200"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          {!showCreate && !editingInvoice && isManager && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-black"
            >
              <Plus size={14} />
              New Invoice
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[10px] font-black text-rose-600 uppercase tracking-widest">
          <AlertCircle size={14} />
          {error}
          <button onClick={() => setError("")} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <InvoiceForm
          title="Create New Invoice"
          websiteId={websiteId}
          customer={customer}
          submitting={submitting}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Edit Form */}
      {editingInvoice && (
        <InvoiceForm
          title={`Editing ${editingInvoice.invoiceId}`}
          websiteId={websiteId}
          customer={customer}
          submitting={submitting}
          initial={{
            items: editingInvoice.items || [{ ...BLANK_ITEM }],
            notes: editingInvoice.notes || "",
            status: editingInvoice.status || "pending"
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingInvoice(null)}
        />
      )}

      {loading && invoices.length === 0 ? (
        <div className="premium-card p-10 bg-white rounded-[36px] border border-slate-200/60 shadow-sm text-center text-[10px] font-black uppercase tracking-widest text-slate-300 animate-pulse">
          Loading invoice ledger...
        </div>
      ) : invoices.length === 0 && !showCreate && !editingInvoice ? (
        <div className="premium-card p-10 bg-white rounded-[36px] border-2 border-dashed border-slate-200 text-center space-y-3">
          <ReceiptText size={32} className="mx-auto text-slate-200" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">No invoices found for this account</p>
          {isManager && (
            <button onClick={() => setShowCreate(true)}
              className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 transition-colors"
            >+ Create First Invoice</button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <article key={invoice._id} className="premium-card rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-sm hover:border-indigo-200 transition-colors group">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-slate-900 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white">
                      {invoice.invoiceId || "Invoice"}
                    </span>
                    {invoice.quotationId && (
                      <span className="rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
                        Quote: {invoice.quotationId}
                      </span>
                    )}
                    <StatusBadge status={invoice.status} />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 truncate">
                    {invoice.quotationId ? `Linked to ${invoice.quotationId}` : "Standalone invoice"}
                  </h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Issued {formatDate(invoice.issuedAt || invoice.createdAt)}
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    {invoice.items?.length || 0} line items
                  </p>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
                  <p className="text-2xl font-black tracking-tight text-slate-900">
                    {formatCurrency(invoice.total, invoice.currency || "INR")}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Admin/Manager Actions */}
                    {isManager && !editingInvoice && !showCreate && (
                      <>
                        <button onClick={() => { setEditingInvoice(invoice); setShowCreate(false); }}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                        ><Pencil size={12} /> Edit</button>

                        {confirmDeleteId === invoice._id ? (
                          <div className="flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-xl">
                            <span className="text-[9px] font-black text-rose-500 uppercase px-2">Delete?</span>
                            <button
                              onClick={() => handleDelete(invoice._id)}
                              disabled={deletingId === invoice._id}
                              className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[9px] font-black uppercase hover:bg-rose-700 transition-all disabled:opacity-50"
                            >{deletingId === invoice._id ? "..." : "Yes"}</button>
                            <button onClick={() => setConfirmDeleteId("")}
                              className="px-3 py-1 rounded-lg bg-white text-slate-500 text-[9px] font-black uppercase hover:bg-slate-100 transition-all"
                            >No</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(invoice._id)}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-100 bg-rose-50 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all"
                          ><Trash2 size={12} /></button>
                        )}
                      </>
                    )}

                    {/* PDF / Share Actions */}
                    {invoice.pdfUrl ? (
                      <>
                        <a
                          href={`${apiBaseUrl}${invoice.pdfUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 transition-all hover:bg-emerald-100"
                        >
                          <Download size={14} /> Download PDF
                        </a>
                        <button onClick={() => handleShare(invoice)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition-all hover:bg-emerald-100"
                        >
                          <Share2 size={14} />
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => handleGeneratePdf(invoice._id)}
                        disabled={generatingPdfId === invoice._id}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                      >
                        <FileText size={14} /> 
                        {generatingPdfId === invoice._id ? "Generating..." : "Generate PDF"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
