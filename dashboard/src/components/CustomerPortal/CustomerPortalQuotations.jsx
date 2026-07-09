import React, { useState, useEffect } from "react";
import { FileText, Download, Check, X, AlertCircle } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function CustomerPortalQuotations() {
  const toast = useToast();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotations = async () => {
    try {
      const res = await api("/api/crm/customer-portal/quotations");
      setQuotations(res || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleUpdateStatus = async (quoteId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this quotation?`)) return;
    try {
      await api(`/api/crm/customer-portal/quotations/${quoteId}/status`, {
        method: "POST",
        body: JSON.stringify({ action })
      });
      toast.success(`Quotation ${action}ed successfully`);
      fetchQuotations();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase">Loading quotations...</p>;

  return (
    <div className="space-y-6">
      <div className="border-b pb-3 border-slate-200">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">My Quotations</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Accept, reject, and review sales quotations</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm">
        {quotations.length === 0 ? (
          <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase tracking-widest">No quotations logged.</p>
        ) : (
          <div className="space-y-4">
            {quotations.map(quote => (
              <div key={quote._id} className="p-5 border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50/50 transition-colors gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800">Quote #{quote.quoteNumber || quote._id.slice(-6).toUpperCase()}</h5>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                      Created: {new Date(quote.createdAt).toLocaleDateString()} • Exp: {quote.expiryDate ? new Date(quote.expiryDate).toLocaleDateString() : "No expiry"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto justify-end">
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-800">₹{quote.totalAmount || quote.total || 0}</p>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${quote.status === "accepted" ? "bg-emerald-50 text-emerald-600" : quote.status === "declined" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}>{quote.status}</span>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    {quote.status === "sent" && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(quote._id, "accept")}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase rounded-xl transition-all flex items-center gap-1"
                        >
                          <Check size={10} /> Accept
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(quote._id, "reject")}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black uppercase rounded-xl transition-all flex items-center gap-1"
                        >
                          <X size={10} /> Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => toast.success("Quote PDF download simulated successfully")}
                      className="p-2 border hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
