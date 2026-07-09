import React, { useState, useEffect } from "react";
import { Headphones, ShieldAlert, Award, Inbox, Settings, Plus, RefreshCw, Calendar, FileText } from "lucide-react";
import { api } from "../../api/client.js";

export default function CrmHelpdeskView({ websiteId }) {
  const [tickets, setTickets] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetForm, setAssetForm] = useState({
    customerId: "", name: "", serialNumber: "", value: 0, durationMonths: 12
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Query tickets via the existing tickets endpoints (scoped by websiteId)
      const ticketRes = await api(`/api/tickets?websiteId=${websiteId}`);
      setTickets((ticketRes && ticketRes.tickets) || []);

      const feedbackRes = await api(`/api/crm/feedback?websiteId=${websiteId}`);
      setFeedback(feedbackRes || []);

      const assetRes = await api(`/api/crm/assets?websiteId=${websiteId}`);
      setAssets(assetRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const handleEscalateSla = async () => {
    try {
      const res = await api(`/api/crm/helpdesk/escalate-cron`, { method: "POST" });
      alert(res.message || "SLA Audit complete.");
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + Number(assetForm.durationMonths));
      
      await api(`/api/crm/assets`, {
        method: "POST",
        body: JSON.stringify({
          ...assetForm,
          websiteId,
          warrantyExpiry: expiry
        })
      });
      setShowAssetForm(false);
      setAssetForm({ customerId: "", name: "", serialNumber: "", value: 0, durationMonths: 12 });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAssetForm(true)}
            className="flex-1 sm:flex-initial py-3 px-5 border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase text-slate-700 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
          >
            Register Asset
          </button>
        </div>
        <button
          onClick={handleEscalateSla}
          className="w-full sm:w-auto py-3 px-5 bg-slate-900 hover:bg-slate-800 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 transition-all"
        >
          <RefreshCw size={14} /> Run SLA Audit Escalations
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-50 border rounded-[28px] animate-pulse" />
          <div className="h-64 bg-slate-50 border rounded-[28px] animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Support Tickets overview */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100 flex items-center gap-1.5"><Inbox size={14} className="text-indigo-500" /> Active SLA Tickets</h4>
            {tickets.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No active tickets.</p>
            ) : (
              <div className="space-y-3">
                {tickets.slice(0, 10).map(t => (
                  <div key={t._id} className="p-4 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-black text-slate-800">{t.subject} ({t.ticketId})</h5>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Priority: {t.priority} • Escalation Level: {t.escalationLevel || 0} • Status: {t.status}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.status === "open" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-600"}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feedback & Asset List */}
          <div className="space-y-6">
            {/* NPS Surveys */}
            <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100 flex items-center gap-1.5"><Award size={14} className="text-indigo-500" /> CSAT & NPS Feedback</h4>
              {feedback.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-6">No feedback surveys yet.</p>
              ) : (
                <div className="space-y-3">
                  {feedback.slice(0, 3).map(f => (
                    <div key={f._id} className="p-3 bg-slate-50/50 border rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-slate-800">{f.customerId?.name || "Customer"}</p>
                        <p className="text-[9px] text-slate-400 italic">"{f.comment}"</p>
                      </div>
                      <span className="text-xs font-black text-indigo-600">Score: {f.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assets */}
            <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100 flex items-center gap-1.5"><FileText size={14} className="text-indigo-500" /> Customer Assets</h4>
              {assets.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-6">No assets registered.</p>
              ) : (
                <div className="space-y-3">
                  {assets.map(a => (
                    <div key={a._id} className="p-3 border rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-slate-800">{a.name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">S/N: {a.serialNumber}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase text-indigo-500">${a.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Asset Form Modal */}
      {showAssetForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowAssetForm(false)} />
          <form onSubmit={handleCreateAsset} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Register Asset</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer ID (ObjectId)</label>
              <input required value={assetForm.customerId} onChange={(e) => setAssetForm({ ...assetForm, customerId: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Asset Name</label>
              <input required value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Serial Number</label>
              <input required value={assetForm.serialNumber} onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Value ($)</label>
                <input type="number" required value={assetForm.value} onChange={(e) => setAssetForm({ ...assetForm, value: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Warranty (Months)</label>
                <input type="number" required value={assetForm.durationMonths} onChange={(e) => setAssetForm({ ...assetForm, durationMonths: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Save Asset</button>
          </form>
        </div>
      )}
    </div>
  );
}
