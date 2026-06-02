import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { 
  Package, Truck, CheckCircle, Clock, IndianRupee, Download, ExternalLink, 
  ShieldAlert, Building2, MapPin, Mail, Phone, Lock, TrendingUp, BarChart3, 
  Star, ShieldCheck, CreditCard, PieChart as LucidePieChart
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart, Pie 
} from 'recharts';
import { useAuth } from "../context/AuthContext.jsx";
import { api, API_BASE } from "../api/client.js";

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function SupplierPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, ordersRes, inventoryRes, ledgerRes] = await Promise.all([
        api.get("/api/supplier/profile"),
        api.get("/api/supplier/orders"),
        api.get("/api/supplier/inventory"),
        api.get("/api/supplier/ledger")
      ]);
      setProfile(profileRes.data);
      setOrders(ordersRes.data || []);
      setInventoryItems(inventoryRes || []);
      setLedgerData(ledgerRes || null);
    } catch (err) {
      console.error("Failed to load supplier data", err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/api/supplier/orders/${orderId}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error("Failed to update status", err);
      alert(err.message || "Failed to update order");
    }
  };

  const handleUploadInvoice = async (orderId) => {
    const url = prompt("Please enter the URL of the uploaded invoice (PDF or Image link):");
    if (!url || !url.trim()) return;

    const amount = prompt("Please enter the TOTAL AMOUNT on the invoice (for automated reconciliation):");
    if (amount === null) return;
    
    try {
      await api.post(`/api/supplier/orders/${orderId}/invoice`, { 
        invoiceUrl: url.trim(),
        invoiceAmount: Number(amount)
      });
      fetchData();
    } catch (err) {
      console.error("Failed to upload invoice", err);
      alert(err.message || "Failed to upload invoice");
    }
  };

  const downloadPO = async (orderId) => {
    try {
      const token = localStorage.getItem("dashboard_token");
      const res = await fetch(`${API_BASE}/api/supplier/orders/${orderId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to download PDF");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      
      // Clean up the URL object after opening
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("PDF Download Error:", err);
      alert("Failed to download PDF. Please try again.");
    }
  };

  if (loading) {
    return (
      <Layout title="Supplier Portal" subtitle="Loading...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Package size={32} className="text-indigo-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing with Procurement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const pendingOrders = orders.filter(o => o.status === "sent" || o.status === "draft");
  const activeOrders = orders.filter(o => o.status === "accepted" || o.status === "shipped");
  const deliveredOrders = orders.filter(o => o.status === "delivered");
  const totalValue = orders.reduce((acc, o) => acc + (o.total || 0), 0);

  // --- Reports Aggregation ---
  const fulfillmentRate = orders.length > 0 
    ? Math.round((deliveredOrders.length / orders.length) * 100) 
    : 0;

  const itemMap = {};
  orders.forEach(o => {
    o.items?.forEach(i => {
      if (!itemMap[i.description]) itemMap[i.description] = { quantity: 0, revenue: 0 };
      itemMap[i.description].quantity += i.quantity;
      itemMap[i.description].revenue += i.total;
    });
  });
  const topItems = Object.entries(itemMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const monthlyMap = {};
  [...orders].reverse().forEach(o => { // reverse to get chronological
    const d = new Date(o.createdAt);
    const month = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, count: 0 };
    monthlyMap[month].revenue += o.total;
    monthlyMap[month].count += 1;
  });
  const monthlyTrends = Object.entries(monthlyMap).map(([month, data]) => ({ month, ...data })).slice(-6); // last 6 months
  const maxMonthlyRevenue = Math.max(...monthlyTrends.map(m => m.revenue), 1);

  let layoutTitle = "Supplier Portal";
  let layoutSubtitle = profile?.companyName || "Vendor Dashboard";

  if (activeTab === "orders") {
    layoutTitle = "Purchase Orders";
    layoutSubtitle = "Review and fulfill your incoming requests";
  } else if (activeTab === "inventory") {
    layoutTitle = "Item Catalog";
    layoutSubtitle = "Products for which you are the preferred supplier";
  } else if (activeTab === "ledger") {
    layoutTitle = "Financial Ledger";
    layoutSubtitle = "Invoice tracking and payment reconciliation";
  } else if (activeTab === "insights") {
    layoutTitle = "Performance Insights";
    layoutSubtitle = "Delivery SLAs and fulfillment analytics";
  } else if (activeTab === "settings") {
    layoutTitle = "Company Settings";
    layoutSubtitle = "Your registered vendor details";
  }

  return (
    <Layout title={layoutTitle} subtitle={layoutSubtitle}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* TAB: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            
            {/* Banner */}
            <div className="rounded-[32px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Building2 size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-6">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-100">Active Vendor Profile</span>
                  </div>
                  {profile?.rating !== undefined && (
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full mb-4">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-100">Reliability: {profile.rating}/100</span>
                    </div>
                  )}
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-2">{profile?.companyName || "Vendor Portal"}</h1>
                <p className="text-indigo-200 text-sm font-bold max-w-xl">
                  Welcome back, {profile?.contactPerson || user.email}. Your current performance score is based on on-time delivery and fulfillment accuracy.
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="premium-card bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60 hover:border-amber-200 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                    <Clock size={24} />
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Action Required</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{pendingOrders.length} <span className="text-sm text-slate-400 font-bold">Pending</span></h3>
              </div>

              <div className="premium-card bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60 hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                    <Truck size={24} />
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In Fulfillment</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{activeOrders.length} <span className="text-sm text-slate-400 font-bold">Active</span></h3>
              </div>

              <div className="premium-card bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60 hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                    <TrendingUp size={24} />
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fulfillment Rate</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{fulfillmentRate}%</h3>
              </div>

              <div className="premium-card bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60 hover:border-emerald-200 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                    <IndianRupee size={24} />
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lifetime Value</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{formatCurrency(totalValue)}</h3>
              </div>
            </div>

            {/* Reports Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Monthly Trends Chart */}
              <div className="premium-card bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8 flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Revenue Trends</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 6 Months</p>
                  </div>
                </div>
                
                <div className="flex-1 flex items-end gap-2 sm:gap-4 mt-auto pt-4 min-h-[200px]">
                  {monthlyTrends.length > 0 ? monthlyTrends.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full flex flex-col justify-end h-40 bg-slate-50 rounded-xl overflow-hidden relative">
                        <div 
                          className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-xl transition-all duration-500 group-hover:from-indigo-500 group-hover:to-indigo-300"
                          style={{ height: `${(m.revenue / maxMonthlyRevenue) * 100}%`, minHeight: '4px' }}
                        />
                        <div className="absolute inset-0 flex items-start justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-sm rounded-xl p-2 z-10">
                           <span className="text-[9px] font-black text-white">{formatCurrency(m.revenue)}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.month}</span>
                    </div>
                  )) : (
                    <div className="w-full h-full flex items-center justify-center">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Not enough data to display trends.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Supplied Items */}
              <div className="premium-card bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                    <Star size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Top Items Supplied</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">By Revenue Generated</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {topItems.length > 0 ? topItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 tracking-tight uppercase line-clamp-1">{item.name}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.quantity} Units Supplied</p>
                        </div>
                      </div>
                      <div className="text-sm font-black text-emerald-600">
                        {formatCurrency(item.revenue)}
                      </div>
                    </div>
                  )) : (
                    <div className="py-8 text-center">
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No item data available.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Recent Activity */}
            <div className="premium-card bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Recent Purchase Orders</h3>
                <button 
                  onClick={() => window.location.href = "/supplier?tab=orders"}
                  className="text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-4">
                {orders.slice(0, 5).map(order => (
                  <div key={order._id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm text-slate-400 group-hover:text-indigo-500 transition-colors">
                        <Package size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{order.poNumber}</p>
                        <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{formatCurrency(order.total)}</p>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${
                        order.status === 'sent' || order.status === 'draft' ? 'text-amber-500' :
                        order.status === 'accepted' || order.status === 'shipped' ? 'text-blue-500' :
                        order.status === 'delivered' ? 'text-emerald-500' : 'text-slate-500'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No recent orders found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: ORDERS */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {orders.map(order => (
                <div key={order._id} className="premium-card bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-6 hover:border-indigo-200 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        <Package size={20} className="text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">{order.poNumber}</h3>
                          <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                            order.status === 'sent' || order.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                            order.status === 'accepted' ? 'bg-indigo-100 text-indigo-700' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Issued {new Date(order.createdAt).toLocaleDateString()} • {order.items?.length || 0} Line Items
                        </p>
                        {order.reconciliation?.status === 'mismatch' && (
                          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg">
                            <ShieldAlert size={10} className="text-rose-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-rose-600">Payment Flagged: {order.reconciliation.mismatchReason}</span>
                          </div>
                        )}
                        {order.reconciliation?.status === 'matched' && (
                          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
                            <CheckCircle size={10} className="text-emerald-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Invoice Verified & Matched</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col lg:items-end gap-3 shrink-0">
                      <div className="text-2xl font-black text-slate-900 tracking-tight">
                        {formatCurrency(order.total)}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Actions */}
                        {(order.status === "sent" || order.status === "draft") && (
                          <button 
                            onClick={() => updateOrderStatus(order._id, "accepted")}
                            className="text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-200"
                          >
                            Accept Order
                          </button>
                        )}
                        {order.status === "accepted" && (
                          <button 
                            onClick={() => updateOrderStatus(order._id, "shipped")}
                            className="text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-200"
                          >
                            Mark Shipped
                          </button>
                        )}
                        
                        {/* Invoice & PDF Actions */}
                        {(order.status === "shipped" || order.status === "delivered") && (
                          order.invoiceUrl ? (
                            <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-all">
                              View Invoice <ExternalLink size={12} />
                            </a>
                          ) : (
                            <button 
                              onClick={() => handleUploadInvoice(order._id)}
                              className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all"
                            >
                              Upload Invoice
                            </button>
                          )
                        )}
                        
                        <button 
                          onClick={() => downloadPO(order._id)}
                          className="flex items-center justify-center w-10 h-10 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-xl transition-all"
                          title="Download PO PDF"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
              
              {orders.length === 0 && (
                <div className="premium-card bg-white p-16 rounded-[32px] shadow-sm border-2 border-dashed border-slate-200 text-center">
                  <Package size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No purchase orders found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: INVENTORY (CATALOG) */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventoryItems.map(item => {
                const isLowStock = item.reorderLevel > 0 && item.quantity <= item.reorderLevel;
                return (
                  <div key={item._id} className={`premium-card bg-white rounded-[32px] shadow-sm border p-6 flex flex-col group transition-all duration-300 ${isLowStock ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200/60'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isLowStock ? 'bg-rose-100 text-rose-500' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                          <Package size={22} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{item.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.websiteId?.websiteName || "Global Item"}</p>
                        </div>
                      </div>
                      {isLowStock && (
                        <div className="px-3 py-1 bg-rose-600 rounded-full flex items-center gap-1.5 animate-pulse">
                          <AlertCircle size={10} className="text-white" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-white">Low Stock</span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-auto">
                      <div className={`rounded-2xl p-3 border transition-colors ${isLowStock ? 'bg-white border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Stock</p>
                        <p className={`text-lg font-black ${isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>{item.quantity} <span className="text-[10px] text-slate-400">Units</span></p>
                      </div>
                      <div className={`rounded-2xl p-3 border transition-colors ${isLowStock ? 'bg-white border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Unit Cost</p>
                        <p className="text-lg font-black text-slate-900">{formatCurrency(item.unitCost || 0)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {inventoryItems.length === 0 && (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                   <Package size={48} className="mx-auto text-slate-200 mb-4" />
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No assigned items found in your catalog.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: LEDGER */}
        {activeTab === "ledger" && ledgerData && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="premium-card bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Billed</p>
                <h3 className="text-2xl font-black text-slate-900">{formatCurrency(ledgerData.stats.totalBilled)}</h3>
              </div>
              <div className="premium-card bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Verified Amount</p>
                <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(ledgerData.stats.matchedAmount)}</h3>
              </div>
              <div className="premium-card bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60">
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Pending Payment</p>
                <h3 className="text-2xl font-black text-amber-600">{formatCurrency(ledgerData.stats.pendingAmount)}</h3>
              </div>
              <div className="premium-card bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60">
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Price Flags</p>
                <h3 className="text-2xl font-black text-rose-600">{ledgerData.stats.mismatchCount} <span className="text-[10px] text-slate-400 font-bold">Mismatches</span></h3>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Invoice Reference</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Matching</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerData.orders.map(o => (
                    <tr key={o._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-black text-[11px] text-slate-900 uppercase">
                        {o.poNumber}
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5">{new Date(o.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 font-black text-[11px] text-slate-900">{formatCurrency(o.total)}</td>
                      <td className="px-6 py-4">
                        {o.reconciliation?.status === "matched" ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600"><CheckCircle size={10} /> Verified</span>
                        ) : o.reconciliation?.status === "mismatch" ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-rose-600"><ShieldAlert size={10} /> Flagged</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-slate-400">Not Reconciled</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                         <span className="px-2 py-1 bg-slate-100 rounded text-[8px] font-black uppercase text-slate-600">{o.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: INSIGHTS */}
        {activeTab === "insights" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* LEAD TIME CHART */}
              <div className="premium-card bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">Performance Trend</p>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Fulfillment Lead Time</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Clock size={22} />
                  </div>
                </div>
                
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ledgerData?.stats?.monthlyTrend || []}>
                      <defs>
                        <linearGradient id="colorLead" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px -12px rgba(0,0,0,0.15)', padding: '12px' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                      />
                      <Area type="monotone" dataKey="matched" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorLead)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RELIABILITY SCORE CARD */}
              <div className="premium-card bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">Service Level Agreement</p>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Supplier Reliability</h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <ShieldCheck size={22} />
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center py-6">
                  <div className="relative w-48 h-48 mb-6">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                      <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" 
                        strokeDasharray={552.92}
                        strokeDashoffset={552.92 * (1 - (profile?.performanceMetrics?.reliabilityScore || profile?.rating || 100) / 100)}
                        className="text-indigo-600 transition-all duration-1000 ease-out" 
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-slate-900">{Math.round(profile?.performanceMetrics?.reliabilityScore || profile?.rating || 100)}%</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Excellent</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 w-full mt-4">
                    <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Lead Time</p>
                      <p className="text-lg font-black text-slate-900">{Math.round(profile?.performanceMetrics?.avgLeadTimeHours || 0)} <span className="text-[10px] text-slate-400">Hrs</span></p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Orders Fulfilled</p>
                      <p className="text-lg font-black text-slate-900">{orders.filter(o => o.status === 'delivered').length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* BILLING VS MATCHING CHART */}
               <div className="lg:col-span-2 premium-card bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60">
                 <div className="flex items-center justify-between mb-8">
                   <div>
                     <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Financial Reconciliation</p>
                     <h3 className="text-xl font-black text-slate-900 tracking-tight">Billing vs Verified Amount</h3>
                   </div>
                   <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                     <CreditCard size={22} />
                   </div>
                 </div>

                 <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ledgerData?.stats?.monthlyTrend || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} />
                        <Tooltip 
                           contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px -12px rgba(0,0,0,0.15)', padding: '12px' }}
                           cursor={{fill: '#f8fafc'}}
                        />
                        <Bar dataKey="billed" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={20} />
                        <Bar dataKey="matched" fill="#10b981" radius={[8, 8, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
               </div>

               {/* QUALITY SCORE CARD */}
               <div className="premium-card bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-8 rounded-[40px] shadow-xl text-white relative overflow-hidden">
                 <div className="relative z-10">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6">Service Quality</p>
                   <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                        <LucidePieChart size={32} className="text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-black">98.2<span className="text-lg text-indigo-400">%</span></h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quality Pass Rate</p>
                      </div>
                   </div>
                   <div className="space-y-4">
                     <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">On-Time Delivery</span>
                       <span className="text-sm font-black text-emerald-400">96%</span>
                     </div>
                     <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invoice Accuracy</span>
                       <span className="text-sm font-black text-indigo-400">100%</span>
                     </div>
                   </div>
                 </div>
                 {/* Decorative circles */}
                 <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
                 <div className="absolute top-10 -left-10 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl" />
               </div>
            </div>
          </div>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
              <ShieldAlert size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-amber-800 tracking-tight mb-1">Read-Only Profile</p>
                <p className="text-xs font-bold text-amber-700/80">Your vendor profile is locked for compliance. If you need to update your registered address or tax details, please contact the procurement team directly.</p>
              </div>
            </div>

            <div className="premium-card bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8 space-y-8">
              
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                  <Building2 size={16} className="text-slate-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Business Identity</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">Company Name</label>
                    <div className="flex items-center relative">
                      <input type="text" disabled value={profile?.companyName || ""} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 pr-10" />
                      <Lock size={14} className="absolute right-4 text-slate-300" />
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block">Tax ID (GST/VAT)</label>
                    <div className="flex items-center relative">
                      <input type="text" disabled value={profile?.taxId || ""} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 pr-10" />
                      <Lock size={14} className="absolute right-4 text-slate-300" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                  <MapPin size={16} className="text-slate-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Contact & Location</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 flex items-center gap-1"><Mail size={10}/> Email</label>
                    <input type="text" disabled value={profile?.email || user?.email || ""} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" />
                  </div>
                  <div className="relative">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 flex items-center gap-1"><Phone size={10}/> Phone</label>
                    <input type="text" disabled value={profile?.phone || ""} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" />
                  </div>
                  <div className="col-span-1 md:col-span-2 relative">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 flex items-center gap-1"><MapPin size={10}/> Registered Address</label>
                    <textarea disabled value={profile?.address || ""} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 resize-none" />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
