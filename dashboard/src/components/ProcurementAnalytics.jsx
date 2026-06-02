import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Clock
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip 
} from "recharts";
import { api } from "../api/client.js";

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-indigo-200 transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trendValue}
        </div>
      )}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
  </div>
);

export default function ProcurementAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/api/procurement/stats");
      setStats(res);
    } catch (err) {
      console.error("Failed to load procurement stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) return (
    <div className="grid grid-cols-4 gap-6 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
      ))}
    </div>
  );

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-8 mb-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard 
          title="Total Spend" 
          value={formatCurrency(stats.totalSpend)} 
          icon={IndianRupee} 
          color="indigo" 
          trend="up" 
          trendValue="+12%" 
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
          title="Total Orders" 
          value={stats.statusDistribution.reduce((acc, s) => acc + s.count, 0)} 
          icon={BarChart3} 
          color="emerald" 
        />
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Top Suppliers List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <Users size={18} className="text-slate-400" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Top Suppliers by Value</h3>
          </div>
          <div className="space-y-4">
            {stats.topSuppliers.map((s, idx) => (
              <div key={s._id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                    0{idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{s.supplier.companyName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.orderCount} Orders</p>
                  </div>
                </div>
                <p className="text-sm font-black text-slate-900">{formatCurrency(s.totalValue)}</p>
              </div>
            ))}
            {stats.topSuppliers.length === 0 && (
              <p className="text-center py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">No data available</p>
            )}
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Low Stock Watchlist</h3>
          </div>
          <div className="space-y-4">
            {stats.lowStockItems.map((item) => (
              <div key={item._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all">
                <div>
                  <p className="text-xs font-bold text-slate-700">{item.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{item.quantity} / {item.reorderLevel} {item.unit}</p>
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
              <p className="text-center py-8 text-[10px] font-black text-emerald-500 uppercase tracking-widest">All stock levels healthy</p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Supplier Scorecard */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Supplier Reliability Scorecard</h3>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance Index</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {stats.topSuppliers.map((s) => (
              <div key={s._id} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all group">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xs font-black text-slate-900 truncate max-w-[140px]">{s.supplier.companyName}</p>
                  <div className="px-2 py-1 rounded bg-white border border-slate-100 text-[10px] font-black text-emerald-600">
                    {s.supplier.rating}% Reliability
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      <span>Fulfillment Rate</span>
                      <span>{s.supplier.performanceMetrics?.fulfillmentRate || 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.supplier.performanceMetrics?.fulfillmentRate || 0}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      <Clock size={10} />
                      Avg. Lead Time: {s.supplier.performanceMetrics?.avgLeadTimeHours || 0}h
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      <Zap size={10} />
                      {s.orderCount} Orders
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bidding Monitor (RFQ) */}
        <div className="bg-slate-950 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
             <Zap size={100} />
           </div>
           <div className="relative z-10 space-y-6">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Strategic Bidding</p>
              <h4 className="text-xl font-black tracking-tight">Competitive Monitoring</h4>
              <div className="space-y-4 pt-4">
                 {[
                   { title: "Direct Sourcing (RFQ-012)", price: "₹24,500", bids: 3, status: "Active" },
                   { title: "Raw Material Batch (RFQ-011)", price: "₹18,900", bids: 5, status: "Closing" }
                 ].map((rfq, i) => (
                   <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-black uppercase tracking-tight">{rfq.title}</p>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded bg-indigo-500 text-white uppercase tracking-widest animate-pulse">{rfq.status}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Best Quote</p>
                          <p className="text-sm font-black italic">{rfq.price}</p>
                        </div>
                        <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">{rfq.bids} Bids Submitted</p>
                      </div>
                   </div>
                 ))}
              </div>
              <button className="w-full py-4 bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-700 transition-all mt-4">
                 Initiate New RFQ
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
