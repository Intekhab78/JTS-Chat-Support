import React, { useState, useEffect } from "react";
import { FileText, Download, Check, X, AlertCircle, ShieldCheck } from "lucide-react";
import { api, API_BASE } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function CustomerPortalQuotations() {
  const toast = useToast();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ show: false, quoteId: null, action: null });

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

  const handleDownloadPdf = async (quoteId) => {
    try {
      const result = await api(`/api/crm/quotations/${quoteId}/pdf`, { method: "POST" });
      const cleanUrl = `${API_BASE}${result.pdfUrl}`;
      
      const response = await fetch(cleanUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", result.pdfUrl.split("/").pop() || `quotation_${quoteId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error(err.message || "Failed to generate PDF");
    }
  };

  const handleUpdateStatus = async () => {
    const { quoteId, action } = confirmModal;
    if (!quoteId || !action) return;

    try {
      await api(`/api/crm/customer-portal/quotations/${quoteId}/status`, {
        method: "POST",
        body: JSON.stringify({ action })
      });
      toast.success(`Quotation ${action}ed successfully`);
      setConfirmModal({ show: false, quoteId: null, action: null });
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
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${quote.status === "accepted" ? "bg-emerald-50 text-emerald-600" : quote.status === "rejected" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}>{quote.status}</span>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    {quote.status === "sent" && (
                      <>
                        <button
                          onClick={() => setConfirmModal({ show: true, quoteId: quote._id, action: "accept" })}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase rounded-xl transition-all flex items-center gap-1"
                        >
                          <Check size={10} /> Accept
                        </button>
                        <button
                          onClick={() => setConfirmModal({ show: true, quoteId: quote._id, action: "reject" })}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black uppercase rounded-xl transition-all flex items-center gap-1"
                        >
                          <X size={10} /> Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDownloadPdf(quote._id)}
                      className="p-2 border hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
                      title="Download PDF"
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

      {/* Custom Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 border border-slate-100 shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setConfirmModal({ show: false, quoteId: null, action: null })}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 ${
                confirmModal.action === "accept" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}>
                {confirmModal.action === "accept" ? <Check size={24} /> : <X size={24} />}
              </div>
              <h3 className="text-base font-black text-slate-950 uppercase tracking-tight">
                {confirmModal.action === "accept" ? "Accept Proposal" : "Reject Proposal"}
              </h3>
              <p className="text-[10px] font-bold text-slate-450 uppercase leading-relaxed text-slate-400">
                Are you sure you want to {confirmModal.action} this quotation? This action will update your proposal commercial status in our database.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, quoteId: null, action: null })}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                className={`flex-1 py-3 text-white font-black text-[10px] uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-[0.98] ${
                  confirmModal.action === "accept" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                Confirm {confirmModal.action === "accept" ? "Accept" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
