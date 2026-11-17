import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  AlertTriangle,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Clock,
  X,
  Plus
} from "lucide-react";
import { api } from "../api/client.js";
import { formatCurrency } from "../utils/currencyFormatter.js";

const COLOR_STYLES = {
  indigo: "bg-indigo-50 text-indigo-600",
  blue: "bg-sky-50 text-sky-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600"
};

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 group hover:border-indigo-200 transition-all duration-200">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-xl ${COLOR_STYLES[color] || COLOR_STYLES.indigo}`}>
        <Icon size={16} />
      </div>
      {trend && trendValue && (
        <div className={`flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend === 'up' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {trendValue}
        </div>
      )}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{title}</p>
    <h3 className="text-xl font-black text-slate-900 tracking-tight">{value}</h3>
  </div>
);

export default function ProcurementAnalytics({ websiteId }) {
  const [stats, setStats] = useState(null);
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [rfqSubmitting, setRfqSubmitting] = useState(false);
  const [rfqError, setRfqError] = useState("");
  const [rfqForm, setRfqForm] = useState({
    title: "",
    itemDescription: "",
    quantity: 1,
    expiryDate: "",
    notes: ""
  });

  useEffect(() => {
    fetchStats();
  }, [websiteId]);

  const fetchStats = async () => {
    try {
      const params = websiteId ? `?websiteId=${websiteId}` : "";
      const [statsRes, rfqRes] = await Promise.all([
        api.get(`/api/procurement/stats${params}`),
        api.get(`/api/procurement/rfqs${params}`).catch(() => [])
      ]);
      setStats(statsRes);
      setRfqs(Array.isArray(rfqRes) ? rfqRes : []);
    } catch (err) {
      console.error("Failed to load procurement stats", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRfq = async (e) => {
    e.preventDefault();
    if (!rfqForm.title.trim()) {
      setRfqError("RFQ title is required.");
      return;
    }
    setRfqSubmitting(true);
    setRfqError("");
    try {
      await api.post("/api/procurement/rfqs", {
        title: rfqForm.title.trim(),
        websiteId: websiteId || undefined,
        items: rfqForm.itemDescription.trim()
          ? [{ description: rfqForm.itemDescription.trim(), quantity: Number(rfqForm.quantity) || 1 }]
          : [],
        expiryDate: rfqForm.expiryDate || undefined,
        notes: rfqForm.notes.trim()
      });
      setShowRfqModal(false);
      setRfqForm({ title: "", itemDescription: "", quantity: 1, expiryDate: "", notes: "" });
      await fetchStats();
    } catch (err) {
      setRfqError(err?.message || "Failed to create RFQ");
    } finally {
      setRfqSubmitting(false);
    }
  };

  if (loading || !stats) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
      ))}
    </div>
  );

  return (
    <div className="space-y-4 mb-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title={stats.totalSpend > 0 ? "Total Purchase Spend" : "CRM Won Revenue"}
          value={formatCurrency(stats.totalSpend > 0 ? stats.totalSpend : (stats.crm?.wonRevenue || 0))}
          icon={DollarSign}
          color="indigo"
          trend="up"
          trendValue={stats.totalSpend > 0 ? `${stats.totalOrders || 0} POs` : stats.crm?.wonDeals > 0 ? `${stats.crm.wonDeals} Deals` : ""}
        />
        <StatCard
          title="Top Suppliers"
          value={stats.topSuppliers.length}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStockCount}
          icon={AlertTriangle}
          color="amber"
          trend={stats.lowStockCount > 0 ? "up" : "down"}
          trendValue={stats.lowStockCount > 0 ? "Critical" : "Good"}
        />
        <StatCard
          title={stats.totalOrders > 0 ? "Purchase Orders" : "Won Deals (CRM)"}
          value={stats.totalOrders > 0 ? stats.totalOrders : (stats.crm?.wonDeals || 0)}
          icon={BarChart3}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Suppliers List */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-slate-400" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Top Suppliers by Value</h3>
          </div>
          <div className="space-y-2.5">
            {stats.topSuppliers.map((s, idx) => (
              <div key={s._id} className="flex items-center justify-between group">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                    0{idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{s.supplier.companyName}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{s.orderCount} Orders</p>
                  </div>
                </div>
                <p className="text-xs font-black text-slate-900">{formatCurrency(s.totalValue)}</p>
              </div>
            ))}
            {stats.topSuppliers.length === 0 && (
              <p className="text-center py-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">No supplier order records yet.</p>
            )}
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-amber-500" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Low Stock Watchlist</h3>
          </div>
          <div className="space-y-2.5">
            {stats.lowStockItems.map((item) => (
              <div key={item._id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all">
                <div>
                  <p className="text-xs font-bold text-slate-700">{item.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">{item.quantity} / {item.reorderLevel} {item.unit}</p>
                  <div className="w-20 h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${Math.min(100, (item.quantity / item.reorderLevel) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {stats.lowStockItems.length === 0 && (
              <p className="text-center py-5 text-[10px] font-black text-emerald-500 uppercase tracking-wider">All stock levels healthy</p>
            )}
          </div>
        </div>
      </div>

      {/* CRM Deal Summary — shown when no traditional PO data */}
      {stats.crm && (stats.crm.wonDeals > 0 || stats.crm.lockedDeals > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5">
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-0.5">Won Deals (CRM)</p>
            <p className="text-xl font-black text-emerald-700">{stats.crm.wonDeals}</p>
            <p className="text-[9px] text-emerald-600 mt-0.5">Total revenue: {formatCurrency(stats.crm.wonRevenue)}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5">
            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider mb-0.5">Locked Deals</p>
            <p className="text-xl font-black text-indigo-700">{stats.crm.lockedDeals}</p>
            <p className="text-[9px] text-indigo-600 mt-0.5">Purchase code generated</p>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-wider mb-0.5">Completed Workflows</p>
            <p className="text-xl font-black text-slate-700">{stats.crm.completedWorkflows}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">Fully processed deals</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Supplier Scorecard */}
        <div className="lg:col-span-2 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Supplier Reliability Scorecard</h3>
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Performance Index</span>
          </div>

          {stats.topSuppliers.length === 0 ? (
            <p className="text-center py-8 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Scorecard will populate once purchase orders are placed with suppliers.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.topSuppliers.map((s) => (
                <div key={s._id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all group">
                  <div className="flex justify-between items-center mb-2.5">
                    <p className="text-xs font-black text-slate-900 truncate max-w-[140px]">{s.supplier.companyName}</p>
                    <div className="px-2 py-0.5 rounded bg-white border border-slate-100 text-[9px] font-black text-emerald-600">
                      {s.supplier.rating}% Reliability
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        <span>Fulfillment Rate</span>
                        <span>{s.supplier.performanceMetrics?.fulfillmentRate || 0}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.supplier.performanceMetrics?.fulfillmentRate || 0}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <Clock size={10} />
                        Lead: {s.supplier.performanceMetrics?.avgLeadTimeHours || 0}h
                      </div>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <Zap size={10} />
                        {s.orderCount} Orders
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bidding Monitor (RFQ) */}
        <div className="bg-white rounded-2xl p-4 text-slate-900 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-3">
           <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Strategic Bidding</p>
                  <h4 className="text-sm font-black tracking-tight text-slate-900">Competitive Monitoring</h4>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-black uppercase">
                  {rfqs.length} RFQs
                </span>
              </div>
              <div className="space-y-2">
                 {rfqs.length === 0 ? (
                   <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-5 text-center">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No active RFQs</p>
                   </div>
                 ) : rfqs.slice(0, 3).map((rfq) => {
                   const lowestBid = rfq.bids?.length > 0
                     ? Math.min(...rfq.bids.map((b) => Number(b.totalAmount || b.amount || 0)).filter((v) => v > 0))
                     : 0;
                   return (
                     <div key={rfq._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-indigo-200 transition-all">
                        <div className="flex justify-between items-center mb-1.5">
                          <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 truncate max-w-[140px]">{rfq.title || rfq.rfqNumber}</p>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                            rfq.status === "awarded" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            rfq.status === "closed" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                            "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}>{rfq.status || "Active"}</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Best Quote</p>
                            <p className="text-xs font-black text-slate-900">{formatCurrency(lowestBid || rfq.bestBid || rfq.estimatedValue || 0)}</p>
                          </div>
                          <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">{(rfq.bids?.length || 0)} Bids</p>
                        </div>
                     </div>
                   );
                 })}
              </div>
              <button
                type="button"
                onClick={() => setShowRfqModal(true)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={13} /> Initiate New RFQ
              </button>
           </div>
        </div>
      </div>

      {/* Create RFQ Modal */}
      {showRfqModal && createPortal(
        <div className="fixed inset-0 z-[9999] p-4 flex items-center justify-center pointer-events-none">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto" onClick={() => setShowRfqModal(false)} />
          <div className="relative z-10 pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Initiate New RFQ</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5">Request supplier quotes for competitive bidding</p>
              </div>
              <button type="button" onClick={() => setShowRfqModal(false)} className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateRfq} className="px-5 py-4 space-y-3">
              {rfqError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-700">{rfqError}</div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">RFQ Title</label>
                <input
                  required
                  placeholder="e.g. Q4 Hardware & Server Replenishment"
                  value={rfqForm.title}
                  onChange={(e) => setRfqForm({ ...rfqForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Primary Item / Scope</label>
                  <input
                    placeholder="Item description"
                    value={rfqForm.itemDescription}
                    onChange={(e) => setRfqForm({ ...rfqForm, itemDescription: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={rfqForm.quantity}
                    onChange={(e) => setRfqForm({ ...rfqForm, quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bid Closing Date</label>
                <input
                  type="date"
                  value={rfqForm.expiryDate}
                  onChange={(e) => setRfqForm({ ...rfqForm, expiryDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Specifications / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Delivery terms, SLA requirements..."
                  value={rfqForm.notes}
                  onChange={(e) => setRfqForm({ ...rfqForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={rfqSubmitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all disabled:opacity-60"
              >
                {rfqSubmitting ? "Publishing RFQ..." : "Publish RFQ"}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
