import React, { useState, useEffect } from "react";
import { Receipt, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function CustomerPortalInvoices() {
  const toast = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    try {
      const res = await api("/api/crm/customer-portal/invoices");
      setInvoices(res || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  if (loading) return <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase">Loading invoices...</p>;

  return (
    <div className="space-y-6">
      <div className="border-b pb-3 border-slate-200">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Invoices & Payments</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">View your billing history, payments, and outstanding balances</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm">
        {invoices.length === 0 ? (
          <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase tracking-widest">No invoices logged.</p>
        ) : (
          <div className="space-y-4">
            {invoices.map(invoice => (
              <div key={invoice._id} className="p-5 border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50/50 transition-colors gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800">Invoice #{invoice.invoiceNumber || invoice._id.slice(-6).toUpperCase()}</h5>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                      Issued: {new Date(invoice.issuedDate || invoice.createdAt).toLocaleDateString()} • Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-800">₹{invoice.totalAmount || invoice.total || 0}</p>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${invoice.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{invoice.paymentStatus}</span>
                  </div>

                  <button
                    onClick={() => toast.success("Invoice PDF download simulated successfully")}
                    className="p-2 border hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
