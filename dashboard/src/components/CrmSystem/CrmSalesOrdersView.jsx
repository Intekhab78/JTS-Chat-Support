import React, { useState, useEffect, useMemo } from "react";
import { ShoppingBag, ChevronRight, CheckCircle2, Truck, RefreshCw, Search, Filter, ArrowUpDown, DollarSign, Clock, PackageCheck, AlertCircle } from "lucide-react";
import { api } from "../../api/client.js";

const STATUS_PROGRESSION = [
  "draft", "confirmed", "processing", "packed", "shipped", "delivered", "completed"
];

export default function CrmSalesOrdersView({ websiteId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Filters & Search State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const qWebsite = (websiteId && websiteId !== "undefined" && websiteId !== "null") ? websiteId : "";
      const res = await api(`/api/crm/salesorders?websiteId=${qWebsite}`);
      const list = Array.isArray(res) ? res : (res?.salesOrders || res?.orders || res?.data || []);
      setOrders(list);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [websiteId]);

  const handleStatusTransition = async (id, nextStatus) => {
    try {
      const updated = await api(`/api/crm/salesorders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      setSelectedOrder(updated);
      fetchOrders();
    } catch (err) {
      alert(err.message);
    }
  };

  // KPI Analytics Metrics
  const metrics = useMemo(() => {
    const totalCount = orders.length;
    const totalPipelineValue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const paidCount = orders.filter(o => o.paymentStatus?.toLowerCase() === "paid").length;
    const pendingCount = orders.filter(o => o.paymentStatus?.toLowerCase() !== "paid").length;

    return { totalCount, totalPipelineValue, paidCount, pendingCount };
  }, [orders]);

  // Filtered & Sorted Sales Orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter(o => {
        const clientName = o.customerId?.companyName || o.customerId?.name || o.customerName || o.clientName || "";
        const orderNum = o.orderNumber || "";
        const matchesSearch = search.trim() === "" ||
          orderNum.toLowerCase().includes(search.toLowerCase()) ||
          clientName.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === "all" || o.status?.toLowerCase() === statusFilter.toLowerCase();
        const matchesPayment = paymentFilter === "all" ||
          (paymentFilter === "paid" && o.paymentStatus?.toLowerCase() === "paid") ||
          (paymentFilter === "pending" && o.paymentStatus?.toLowerCase() !== "paid");

        return matchesSearch && matchesStatus && matchesPayment;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (sortBy === "oldest") return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        if (sortBy === "amount_high") return (b.totalAmount || 0) - (a.totalAmount || 0);
        if (sortBy === "amount_low") return (a.totalAmount || 0) - (b.totalAmount || 0);
        return 0;
      });
  }, [orders, search, statusFilter, paymentFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Sales Order Pipeline</h3>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Manage customer orders, fulfillment statuses, and payment ledgers</p>
        </div>
        <button
          onClick={fetchOrders}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
          title="Refresh orders"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* KPI Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShoppingBag size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Total Active Orders</span>
            <span className="text-lg font-black text-slate-900">{metrics.totalCount} Orders</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Pipeline Order Value</span>
            <span className="text-lg font-black text-emerald-700">${metrics.totalPipelineValue.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <PackageCheck size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Paid Orders</span>
            <span className="text-lg font-black text-blue-700">{metrics.paidCount} Orders</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-[24px] shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Pending Payment</span>
            <span className="text-lg font-black text-amber-700">{metrics.pendingCount} Orders</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Action Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-[28px] shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sales orders by number or client name…"
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Status Filter */}
          <div className="relative flex-1 lg:w-36">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Payment Status Filter */}
          <div className="relative flex-1 lg:w-36">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
            <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex-1 lg:w-36">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_high">Amount (High-Low)</option>
              <option value="amount_low">Amount (Low-High)</option>
            </select>
            <ArrowUpDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 bg-slate-50 border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders list */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Active Sales Orders ({filteredOrders.length})
              </h4>
              <span className="text-[10px] font-bold text-slate-400">Click any order to view details</span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <AlertCircle size={32} className="mx-auto text-slate-300" />
                <p className="font-bold text-xs uppercase tracking-widest">No sales orders found matching filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(o => {
                  const clientName = o.customerId?.companyName || o.customerId?.name || o.customerName || o.clientName || "General Client";
                  const isPaid = o.paymentStatus?.toLowerCase() === "paid";
                  return (
                    <div
                      key={o._id}
                      onClick={() => setSelectedOrder(o)}
                      className={`p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-all ${selectedOrder?._id === o._id ? "border-indigo-500 bg-indigo-50/20 shadow-sm" : "border-slate-100 hover:bg-slate-50/50"}`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900 tracking-wide">{o.orderNumber}</span>
                          <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 capitalize">{o.status}</span>
                          <span className="text-[10px] font-black text-indigo-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">{clientName}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Total Value: <span className="text-slate-900 font-extrabold">${o.totalAmount ? o.totalAmount.toLocaleString() : 0}</span> • Payment: <span className={`font-black px-1.5 py-0.5 rounded ${isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{o.paymentStatus || 'Pending'}</span>
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details & Status triggers */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between min-h-[420px]">
            {selectedOrder ? (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* Header */}
                <div className="border-b border-slate-100 pb-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{selectedOrder.orderNumber}</h4>
                    <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{selectedOrder.status}</span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    Created on: {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString() : "—"}
                  </p>
                </div>

                {/* Customer Details Box */}
                <div className="bg-slate-50/80 border border-slate-200/60 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Client Profile</span>
                  <p className="text-xs font-black text-slate-900">{selectedOrder.customerId?.companyName || selectedOrder.customerId?.name || selectedOrder.customerName || selectedOrder.clientName || "General Client"}</p>
                  {selectedOrder.customerId?.email && <p className="text-[10px] font-medium text-slate-500">{selectedOrder.customerId.email}</p>}
                  {selectedOrder.customerId?.phone && <p className="text-[10px] font-medium text-slate-500">{selectedOrder.customerId.phone}</p>}
                  {selectedOrder.customerId?.trn && <p className="text-[10px] font-bold text-slate-600">TRN: {selectedOrder.customerId.trn}</p>}
                </div>

                {/* Order Items Table */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Order Items ({selectedOrder.items.length})</span>
                    <div className="border border-slate-100 rounded-xl overflow-hidden text-[10px]">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100/70 text-slate-500 uppercase font-black">
                          <tr>
                            <th className="p-2">Item</th>
                            <th className="p-2 text-center">Qty</th>
                            <th className="p-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                          {selectedOrder.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="p-2 line-clamp-1">{item.name || item.description || `Item ${idx + 1}`}</td>
                              <td className="p-2 text-center">{item.quantity || 1}</td>
                              <td className="p-2 text-right font-black text-slate-900">${item.total ? item.total.toLocaleString() : ((item.quantity || 1) * (item.price || 0)).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Total & Payment Summary */}
                <div className="space-y-2 text-xs font-bold text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <span>Payment Status:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${selectedOrder.paymentStatus?.toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {selectedOrder.paymentStatus || 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-black text-slate-900 text-sm">
                    <span>Order Total:</span>
                    <span className="text-indigo-600">${selectedOrder.totalAmount ? selectedOrder.totalAmount.toLocaleString() : 0}</span>
                  </div>
                </div>

                {/* Status Transitions Progression Bar */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Update Pipeline Status</span>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_PROGRESSION.map((st) => {
                      const isActive = selectedOrder.status === st;
                      return (
                        <button
                          key={st}
                          disabled={selectedOrder.status === "cancelled"}
                          onClick={() => handleStatusTransition(selectedOrder._id, st)}
                          className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${isActive ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                        >
                          {st}
                        </button>
                      );
                    })}
                    <button
                      disabled={selectedOrder.status === "completed" || selectedOrder.status === "cancelled"}
                      onClick={() => handleStatusTransition(selectedOrder._id, "cancelled")}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase transition-all"
                    >
                      Cancel Order
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-12 space-y-2">
                <ShoppingBag size={36} className="text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-wider">Select a sales order to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
