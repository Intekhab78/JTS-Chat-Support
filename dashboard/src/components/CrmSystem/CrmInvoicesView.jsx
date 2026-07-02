import React, { useState, useEffect } from "react";
import { FileText, Plus, Check, ChevronRight, DollarSign, Clock, AlertCircle } from "lucide-react";
import { api } from "../../api/client.js";

export default function CrmInvoicesView({ websiteId }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0, gateway: "cash", paymentMethod: "cash", referenceNumber: ""
  });

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundForm, setRefundForm] = useState({ reason: "" });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/invoices?websiteId=${websiteId}`);
      setInvoices(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [websiteId]);

  const handleAllocatePayment = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/payments`, {
        method: "POST",
        body: JSON.stringify({
          ...paymentForm,
          invoiceId: selectedInvoice._id,
          customerId: selectedInvoice.customerId?._id || selectedInvoice.customerId
        })
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: 0, gateway: "cash", paymentMethod: "cash", referenceNumber: "" });
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleIssueRefund = async (e) => {
    e.preventDefault();
    try {
      // Find a payment associated with this invoice (or mock a refund request)
      const payments = await api(`/api/crm/payments?customerId=${selectedInvoice.customerId?._id || selectedInvoice.customerId}`);
      const matchingPay = payments.find(p => String(p.invoiceId?._id || p.invoiceId) === String(selectedInvoice._id));
      if (!matchingPay) {
        throw new Error("No payments logged for this invoice to issue a refund against.");
      }
      await api(`/api/crm/payments/refund/${matchingPay._id}`, {
        method: "POST",
        body: JSON.stringify(refundForm)
      });
      setShowRefundForm(false);
      setRefundForm({ reason: "" });
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Invoices & Receivables Ledger</h3>
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wide">Enterprise Finance</span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 bg-slate-50 border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoices List */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">Issued Invoices</h4>
            {invoices.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No invoices logged.</p>
            ) : (
              <div className="space-y-3">
                {invoices.map(i => (
                  <div
                    key={i._id}
                    onClick={() => setSelectedInvoice(i)}
                    className={`p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-colors ${selectedInvoice?._id === i._id ? "border-indigo-500 bg-indigo-50/10" : "border-slate-100 hover:bg-slate-50/50"}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{i.invoiceId}</span>
                        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">{i.status}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Grand Total: ${i.total} • Allocated: <span className="text-indigo-600 font-black">${i.paidAmount || 0}</span></p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details & Payment Allocation Triggers */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
            {selectedInvoice ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">{selectedInvoice.invoiceId}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Issued: {new Date(selectedInvoice.issuedAt || selectedInvoice.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-600">
                  <div className="flex justify-between"><span>Grand Total:</span> <span className="text-slate-900">${selectedInvoice.total}</span></div>
                  <div className="flex justify-between"><span>Paid Amount:</span> <span className="text-emerald-600">${selectedInvoice.paidAmount || 0}</span></div>
                  <div className="flex justify-between border-t pt-2 font-black text-rose-500"><span>Outstanding Due:</span> <span>${selectedInvoice.total - (selectedInvoice.paidAmount || 0)}</span></div>
                </div>

                {selectedInvoice.status !== "paid" && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all"
                  >
                    Allocate Payment
                  </button>
                )}

                {selectedInvoice.status === "paid" && (
                  <button
                    onClick={() => setShowRefundForm(true)}
                    className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-[10px] font-black uppercase transition-all"
                  >
                    Issue Refund
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-10 space-y-2">
                <FileText size={32} className="text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-wider">Select an invoice to view ledger details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Allocation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
          <form onSubmit={handleAllocatePayment} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Allocate Payment</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Payment Amount ($)</label>
              <input type="number" required value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gateway</label>
                <select value={paymentForm.gateway} onChange={(e) => setPaymentForm({ ...paymentForm, gateway: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold">
                  <option value="cash">Cash</option>
                  <option value="stripe">Stripe</option>
                  <option value="razorpay">Razorpay</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Payment Method</label>
                <select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Confirm Payment</button>
          </form>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowRefundForm(false)} />
          <form onSubmit={handleIssueRefund} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Issue Refund / Credit</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Reason for refund</label>
              <input required value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase">Confirm Refund</button>
          </form>
        </div>
      )}
    </div>
  );
}
