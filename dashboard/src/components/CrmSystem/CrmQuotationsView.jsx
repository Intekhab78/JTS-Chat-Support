import React, { useState, useEffect } from "react";
import { Plus, Check, X, FileText, ChevronRight, Eye, RefreshCw, Send, HelpCircle, Download } from "lucide-react";
import { api, API_BASE } from "../../api/client.js";

const getCurrencySymbol = (code) => {
  const symbols = {
    USD: "$",
    EUR: "€",
    INR: "Rs. ",
    AED: "AED ",
    GBP: "£",
  };
  return symbols[String(code || "INR").toUpperCase()] || `${code} `;
};

export default function CrmQuotationsView({ websiteId }) {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [comments, setComments] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerId: "", quotationNumber: "", discountAmount: 0, shippingCharges: 0, itemsJson: "[]"
  });

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      // Find customer quotes (using standard scoped fetch or fallbacks)
      const res = await api(`/api/crm/quotations/reports?websiteId=${websiteId}`); // using analytics path or custom route if needed
      // If reports path is for analytics, let's fetch all website level quotations from the backend
      const quotesRes = await api(`/api/crm/quotations?websiteId=${websiteId}`); // custom fallback
      setQuotations(Array.isArray(quotesRes) ? quotesRes : (quotesRes.quotations || []));
    } catch (err) {
      // Fallback
      try {
        const quotesRes = await api(`/api/crm/quotations?websiteId=${websiteId}`);
        setQuotations(quotesRes.quotations || quotesRes || []);
      } catch (e) {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [websiteId]);

  const handleApprove = async (id) => {
    try {
      await api(`/api/crm/quotations/approve/${id}`, {
        method: "POST",
        body: JSON.stringify({ comments })
      });
      setComments("");
      setSelectedQuote(null);
      fetchQuotations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await api(`/api/crm/quotations/deny/${id}`, {
        method: "POST",
        body: JSON.stringify({ comments })
      });
      setComments("");
      setSelectedQuote(null);
      fetchQuotations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateQuotation = async (e) => {
    e.preventDefault();
    try {
      const parsedItems = JSON.parse(createForm.itemsJson || "[]");
      await api(`/api/crm/quotations`, {
        method: "POST",
        body: JSON.stringify({
          ...createForm,
          websiteId,
          items: parsedItems
        })
      });
      setShowCreateModal(false);
      setCreateForm({ customerId: "", quotationNumber: "", discountAmount: 0, shippingCharges: 0, itemsJson: "[]" });
      fetchQuotations();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConvertToOrder = async (quoteId) => {
    try {
      await api(`/api/crm/salesorders/convert/${quoteId}`, { method: "POST" });
      alert("Converted to Sales Order successfully! Sales notified and inventory reserved.");
      fetchQuotations();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Quotations & Revisions</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-100 transition-all"
        >
          <Plus size={14} /> Create Quotation
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 bg-slate-50 border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quotes list */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">Registered Quotations</h4>
            {quotations.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No quotes registered.</p>
            ) : (
              <div className="space-y-3">
                {quotations.map(q => (
                  <div
                    key={q._id}
                    onClick={() => setSelectedQuote(q)}
                    className={`p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-colors ${selectedQuote?._id === q._id ? "border-indigo-500 bg-indigo-50/10" : "border-slate-100 hover:bg-slate-50/50"}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{q.quotationId}</span>
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">V{q.version}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Val: {getCurrencySymbol(q.currency)}{q.total.toLocaleString()} • Status: <span className="text-indigo-600 font-extrabold">{q.status}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${q.approvalStatus === "approved" ? "bg-emerald-50 text-emerald-600" : q.approvalStatus === "rejected" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>{q.approvalStatus}</span>
                      <ChevronRight size={14} className="text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details & Approval actions */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
            {selectedQuote ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">{selectedQuote.quotationId}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date created: {new Date(selectedQuote.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="space-y-2 text-xs font-bold text-slate-600 border-t border-slate-100 pt-4">
                  <div className="flex justify-between"><span>Subtotal:</span> <span>{getCurrencySymbol(selectedQuote.currency)}{selectedQuote.subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Discount:</span> <span className="text-rose-500">-{getCurrencySymbol(selectedQuote.currency)}{selectedQuote.discountAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Tax (GST):</span> <span>+{getCurrencySymbol(selectedQuote.currency)}{selectedQuote.tax.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t pt-2 font-black text-slate-900"><span>Grand Total:</span> <span className="text-indigo-600">{getCurrencySymbol(selectedQuote.currency)}{selectedQuote.total.toLocaleString()}</span></div>
                </div>

                <div className="space-y-2.5 pt-2">
                  {/* Download PDF */}
                  <button
                    onClick={async () => {
                      try {
                        const result = await api(`/api/crm/quotations/${selectedQuote._id}/pdf`, { method: "POST" });
                        const cleanUrl = `${API_BASE}${result.pdfUrl}`;
                        window.open(cleanUrl, "_blank");
                      } catch (err) {
                        alert(err.message || "Failed to generate PDF");
                      }
                    }}
                    className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Download size={12} /> Download PDF
                  </button>

                  {/* Convert to Sales Order */}
                  {selectedQuote.status !== "converted" && (
                    <button
                      onClick={() => handleConvertToOrder(selectedQuote._id)}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-sm"
                    >
                      Convert to Sales Order
                    </button>
                  )}
                </div>

                {/* Manager/Director Approvals Segment */}
                {selectedQuote.status === "pending_approval" && (
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Approval Comments</span>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Add authorization remarks…"
                      className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold outline-none h-16 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleReject(selectedQuote._id)} className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-all"><X size={12} /> Reject</button>
                      <button onClick={() => handleApprove(selectedQuote._id)} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-all"><Check size={12} /> Approve</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-10 space-y-2">
                <FileText size={32} className="text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-wider">Select a quote to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Quotation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <form onSubmit={handleCreateQuotation} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Create Quotation</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer ID (ObjectId)</label>
              <input required value={createForm.customerId} onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Quotation Number (Leave blank to generate new)</label>
              <input value={createForm.quotationNumber} onChange={(e) => setCreateForm({ ...createForm, quotationNumber: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Order Level Discount ($)</label>
                <input type="number" required value={createForm.discountAmount} onChange={(e) => setCreateForm({ ...createForm, discountAmount: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Shipping Charges ($)</label>
                <input type="number" required value={createForm.shippingCharges} onChange={(e) => setCreateForm({ ...createForm, shippingCharges: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Items JSON List</label>
              <textarea placeholder='[{"description":"Gaming Laptop","quantity":1,"price":1200,"taxRate":18}]' value={createForm.itemsJson} onChange={(e) => setCreateForm({ ...createForm, itemsJson: e.target.value })} className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold h-24 outline-none resize-none font-mono" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Save Quotation</button>
          </form>
        </div>
      )}
    </div>
  );
}
