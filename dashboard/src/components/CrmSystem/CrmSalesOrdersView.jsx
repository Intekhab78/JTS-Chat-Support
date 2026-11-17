import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ShoppingBag,
  DollarSign,
  PackageCheck,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Download,
  Printer,
  AlertCircle,
  X,
  Plus,
  Trash2
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";
import { formatCurrency, getCurrencySymbol } from "../../utils/currencyFormatter.js";

const STATUS_PROGRESSION = [
  "draft",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "completed"
];

const STATUS_BADGE = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  packed: "bg-violet-50 text-violet-700 border-violet-200",
  shipped: "bg-cyan-50 text-cyan-700 border-cyan-200",
  delivered: "bg-teal-50 text-teal-700 border-teal-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200"
};

const getOrderNumber = (o) => o?.orderNumber || o?.soNumber || o?.orderId || (o?._id ? `SO-${String(o._id).slice(-6).toUpperCase()}` : "—");
const getClientName = (o) => o?.customerId?.companyName || o?.customerId?.name || o?.customerName || o?.clientName || "—";
const getOrderTotal = (o) => Number(o?.grandTotal ?? o?.totalAmount ?? o?.total ?? 0) || 0;

export default function CrmSalesOrdersView({ websiteId }) {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Create Sales Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerId: "",
    notes: "",
    items: [{ description: "", sku: "", quantity: 1, price: 0 }]
  });

  // Filters & Search State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const hasValidWebsite =
        websiteId && websiteId !== "all" && websiteId !== "undefined" && websiteId !== "null";
      const qs = hasValidWebsite ? `?websiteId=${encodeURIComponent(websiteId)}` : "";
      const [res, custRes] = await Promise.allSettled([
        api(`/api/crm/salesorders${qs}`),
        api(`/api/crm/customers${qs}`)
      ]);
      const ordersVal = res.status === "fulfilled" ? res.value : [];
      const list = Array.isArray(ordersVal) ? ordersVal : (ordersVal?.salesOrders || ordersVal?.orders || ordersVal?.data || []);
      setOrders(list);

      const custVal = custRes.status === "fulfilled" ? custRes.value : [];
      setCustomers(Array.isArray(custVal) ? custVal : custVal?.customers || []);

      setSelectedOrder((prev) => {
        if (!list.length) return null;
        if (prev?._id) {
          const refreshed = list.find((item) => item._id === prev._id);
          if (refreshed) return refreshed;
        }
        return list[0];
      });
    } catch (err) {
      console.error(err);
      toast?.error?.(err?.message || "Failed to load sales orders");
      setOrders([]);
      setSelectedOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [websiteId]);

  const handleStatusTransition = async (id, nextStatus) => {
    if (!id || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await api(`/api/crm/salesorders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      const updated = res?.salesOrder || res?.order || res?.data || res;
      if (updated && updated._id) {
        setSelectedOrder(updated);
      }
      setConfirmCancelId(null);
      toast?.success?.(`Order status updated to ${nextStatus.toUpperCase()}`);
      await fetchOrders();
    } catch (err) {
      toast?.error?.(err?.message || "Failed to update order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // KPI Analytics Metrics
  const metrics = useMemo(() => {
    const totalCount = orders.length;
    const totalPipelineValue = orders.reduce((sum, o) => sum + getOrderTotal(o), 0);
    const paidCount = orders.filter((o) => o.paymentStatus?.toLowerCase() === "paid").length;
    const pendingCount = orders.filter((o) => o.paymentStatus?.toLowerCase() !== "paid").length;

    return { totalCount, totalPipelineValue, paidCount, pendingCount };
  }, [orders]);

  // Filtered & Sorted Sales Orders
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter((o) => {
        const clientName = getClientName(o).toLowerCase();
        const clientEmail = (o.customerId?.email || o.customerEmail || "").toLowerCase();
        const orderNum = getOrderNumber(o).toLowerCase();

        const matchesSearch =
          q === "" || orderNum.includes(q) || clientName.includes(q) || clientEmail.includes(q);

        const matchesStatus =
          statusFilter === "all" || o.status?.toLowerCase() === statusFilter.toLowerCase();

        const isPaid = o.paymentStatus?.toLowerCase() === "paid";
        const matchesPayment =
          paymentFilter === "all" ||
          (paymentFilter === "paid" && isPaid) ||
          (paymentFilter === "pending" && !isPaid);

        return matchesSearch && matchesStatus && matchesPayment;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (sortBy === "oldest") return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        if (sortBy === "amount_high") return getOrderTotal(b) - getOrderTotal(a);
        if (sortBy === "amount_low") return getOrderTotal(a) - getOrderTotal(b);
        return 0;
      });
  }, [orders, search, statusFilter, paymentFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, paymentFilter, sortBy, websiteId]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const validItems = createForm.items.filter((it) => it.description.trim());
    if (!createForm.customerId || validItems.length === 0) {
      toast?.error?.("Select a customer and add at least one item");
      return;
    }
    setCreating(true);
    try {
      const cust = customers.find((c) => c._id === createForm.customerId);
      const resolvedWebsiteId =
        cust?.websiteId || (websiteId && websiteId !== "all" ? websiteId : undefined);
      await api("/api/crm/salesorders", {
        method: "POST",
        body: JSON.stringify({
          customerId: createForm.customerId,
          notes: createForm.notes.trim() || undefined,
          ...(resolvedWebsiteId ? { websiteId: resolvedWebsiteId } : {}),
          items: validItems.map((it) => ({
            description: it.description.trim(),
            sku: it.sku.trim() || undefined,
            quantity: Math.max(1, Number(it.quantity) || 1),
            price: Number(it.price) || 0
          }))
        })
      });
      toast?.success?.("Sales order created");
      setShowCreateModal(false);
      setCreateForm({
        customerId: "",
        notes: "",
        items: [{ description: "", sku: "", quantity: 1, price: 0 }]
      });
      await fetchOrders();
    } catch (err) {
      toast?.error?.(err?.message || "Failed to create sales order");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!orderId) return;
    if (!window.confirm("Are you sure you want to delete this sales order?")) return;
    try {
      await api(`/api/crm/salesorders/${orderId}`, { method: "DELETE" });
      toast?.success?.("Sales order deleted");
      if (selectedOrder?._id === orderId) setSelectedOrder(null);
      await fetchOrders();
    } catch (err) {
      toast?.error?.(err?.message || "Failed to delete sales order");
    }
  };

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all" || paymentFilter !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setSortBy("newest");
  };

  const handleExportOrdersCSV = () => {
    const sym = getCurrencySymbol();
    const data = filteredOrders.map((o) => ({
      "Order #": getOrderNumber(o),
      "Client / Company": getClientName(o),
      [`Total Value (${sym})`]: getOrderTotal(o),
      "Fulfillment Status": (o.fulfillmentStatus || o.status || "confirmed").toUpperCase(),
      "Payment Status": (o.paymentStatus || "pending").toUpperCase(),
      "Order Date": o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"
    }));
    exportToCSV(data, `Sales_Orders_Report_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportOrdersPDF = () => {
    const sym = getCurrencySymbol();
    const data = filteredOrders.map((o) => ({
      "Order #": getOrderNumber(o),
      Client: getClientName(o),
      [`Total (${sym})`]: formatCurrency(getOrderTotal(o)),
      Fulfillment: (o.fulfillmentStatus || o.status || "confirmed").toUpperCase(),
      Payment: (o.paymentStatus || "pending").toUpperCase()
    }));
    exportToPDF(data, `Sales_Orders_Report_${new Date().toISOString().slice(0, 10)}`, "SALES ORDERS PIPELINE REPORT");
  };

  return (
    <div className="space-y-3 bg-white">
      {/* Compact Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2.5 border-slate-100">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Sales Order Pipeline</h3>
          <p className="text-[10px] font-medium text-slate-500 mt-0.5">
            Manage customer orders, fulfillment statuses, and payment ledgers
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportOrdersCSV}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 border border-emerald-200 text-emerald-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
            title="Export Sales Orders to Excel CSV"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={handleExportOrdersPDF}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 border border-indigo-200 text-indigo-700 text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all"
            title="Export Sales Orders to PDF"
          >
            <Printer size={12} /> Export PDF
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all shadow-xs"
          >
            <Plus size={12} /> Create Order
          </button>
          <button
            onClick={fetchOrders}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
            title="Refresh orders"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Compact KPI Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShoppingBag size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Total Active Orders
            </span>
            <span className="text-sm font-black text-slate-900">{metrics.totalCount} Orders</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Pipeline Order Value
            </span>
            <span className="text-sm font-black text-emerald-700">
              {formatCurrency(metrics.totalPipelineValue)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <PackageCheck size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Paid Orders
            </span>
            <span className="text-sm font-black text-blue-700">{metrics.paidCount} Orders</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-3 rounded-xl shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block truncate">
              Pending Payment
            </span>
            <span className="text-sm font-black text-amber-700">{metrics.pendingCount} Orders</span>
          </div>
        </div>
      </div>

      {/* Compact Filter and Search Action Bar */}
      <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl shadow-xs flex flex-col lg:flex-row gap-2 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sales orders by number, client name, or email…"
            className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-32">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-2.5 pr-7 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-bold text-slate-700 outline-none appearance-none cursor-pointer"
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
            <Filter size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 lg:w-32">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full pl-2.5 pr-7 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-bold text-slate-700 outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
            <Filter size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 lg:w-36">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-2.5 pr-7 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-[10.5px] font-bold text-slate-700 outline-none appearance-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_high">Amount (High-Low)</option>
              <option value="amount_low">Amount (Low-High)</option>
            </select>
            <ArrowUpDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-2 py-1.5 text-[9.5px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-12 bg-slate-50 border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Orders List */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex justify-between items-center border-b pb-2 border-slate-100">
              <h4 className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider">
                Active Sales Orders ({filteredOrders.length})
              </h4>
              <span className="text-[9.5px] font-semibold text-slate-400">
                Click any order to view details
              </span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-1.5">
                <AlertCircle size={24} className="mx-auto text-slate-300" />
                <p className="font-bold text-[10px] uppercase tracking-wider">
                  No sales orders found matching filters
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-0.5">
                {paginatedOrders.map((o) => {
                  const orderNum = getOrderNumber(o);
                  const clientName = getClientName(o);
                  const orderTotal = getOrderTotal(o);
                  const statusKey = (o.status || "confirmed").toLowerCase();
                  const isPaid = o.paymentStatus?.toLowerCase() === "paid";
                  const isSelected = selectedOrder?._id === o._id;

                  return (
                    <div
                      key={o._id}
                      onClick={() => {
                        setSelectedOrder(o);
                        setConfirmCancelId(null);
                      }}
                      className={`p-2.5 border rounded-xl flex justify-between items-center cursor-pointer transition-all ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/20 shadow-xs"
                          : "border-slate-100 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-black text-slate-900 tracking-wide">
                            {orderNum}
                          </span>
                          <span
                            className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              STATUS_BADGE[statusKey] || STATUS_BADGE.confirmed
                            }`}
                          >
                            {o.status || "confirmed"}
                          </span>
                          <span className="text-[9.5px] font-bold text-indigo-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full truncate max-w-[180px]">
                            {clientName}
                          </span>
                        </div>
                        <p className="text-[9.5px] font-semibold text-slate-500">
                          Total:{" "}
                          <span className="text-slate-900 font-extrabold">
                            {formatCurrency(orderTotal)}
                          </span>{" "}
                          • Payment:{" "}
                          <span
                            className={`font-black px-1.5 py-0.5 rounded text-[8.5px] uppercase ${
                              isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {o.paymentStatus || "Pending"}
                          </span>
                          {o.createdAt && (
                            <span className="text-slate-400 ml-2">
                              • {new Date(o.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className={`shrink-0 transition-transform ${
                          isSelected ? "text-indigo-600 translate-x-0.5" : "text-slate-400"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[9.5px] font-bold text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Details & Status Actions */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between min-h-[360px]">
            {selectedOrder ? (
              <div className="space-y-3">
                {/* Order Header */}
                <div className="border-b border-slate-100 pb-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                      {getOrderNumber(selectedOrder)}
                    </h4>
                    <span
                      className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        STATUS_BADGE[(selectedOrder.status || "confirmed").toLowerCase()] ||
                        STATUS_BADGE.confirmed
                      }`}
                    >
                      {selectedOrder.status || "confirmed"}
                    </span>
                  </div>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                    Created:{" "}
                    {selectedOrder.createdAt
                      ? new Date(selectedOrder.createdAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>

                {/* Client Profile */}
                <div className="bg-slate-50/80 border border-slate-200/60 p-2.5 rounded-xl space-y-0.5">
                  <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
                    Client Profile
                  </span>
                  <p className="text-[11px] font-black text-slate-900">{getClientName(selectedOrder)}</p>
                  {selectedOrder.customerId?.email && (
                    <p className="text-[9.5px] font-medium text-slate-500">{selectedOrder.customerId.email}</p>
                  )}
                  {selectedOrder.customerId?.phone && (
                    <p className="text-[9.5px] font-medium text-slate-500">{selectedOrder.customerId.phone}</p>
                  )}
                  {selectedOrder.customerId?.trn && (
                    <p className="text-[9.5px] font-bold text-slate-600">TRN: {selectedOrder.customerId.trn}</p>
                  )}
                </div>

                {/* Order Items Table */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
                      Order Items ({selectedOrder.items.length})
                    </span>
                    <div className="border border-slate-100 rounded-xl overflow-hidden text-[9.5px] max-h-40 overflow-y-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100/80 text-slate-500 uppercase font-black text-[8.5px]">
                          <tr>
                            <th className="px-2 py-1.5">Item</th>
                            <th className="px-2 py-1.5 text-center">Qty</th>
                            <th className="px-2 py-1.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {selectedOrder.items.map((item, idx) => {
                            const lineTotal =
                              item.total ?? (Number(item.quantity || 1) * Number(item.price || item.unitPrice || 0));
                            return (
                              <tr key={idx}>
                                <td className="px-2 py-1.5 truncate max-w-[140px]">
                                  {item.name || item.description || `Item ${idx + 1}`}
                                </td>
                                <td className="px-2 py-1.5 text-center">{item.quantity || 1}</td>
                                <td className="px-2 py-1.5 text-right font-black text-slate-900">
                                  ${Number(lineTotal).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Total & Payment Summary */}
                <div className="space-y-1.5 text-[10.5px] font-bold text-slate-600 border-t border-slate-100 pt-2.5">
                  <div className="flex justify-between items-center">
                    <span>Payment Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase ${
                        selectedOrder.paymentStatus?.toLowerCase() === "paid"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {selectedOrder.paymentStatus || "Pending"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 font-black text-slate-900 text-xs">
                    <span>Order Total:</span>
                    <span className="text-indigo-600">
                      ${getOrderTotal(selectedOrder).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Single Order PDF */}
                <button
                  onClick={() => {
                    const orderNum = getOrderNumber(selectedOrder);
                    exportSingleRecordPDF(
                      `SALES ORDER - ${orderNum}`,
                      {
                        "Order Number": orderNum,
                        "Customer Name": getClientName(selectedOrder),
                        "Order Date": selectedOrder.createdAt
                          ? new Date(selectedOrder.createdAt).toLocaleDateString()
                          : "—",
                        "Pipeline Status": (selectedOrder.status || "confirmed").toUpperCase(),
                        "Payment Status": (selectedOrder.paymentStatus || "pending").toUpperCase(),
                        "Total Items": selectedOrder.items?.length || 0,
                        "Total Amount": formatCurrency(getOrderTotal(selectedOrder))
                      },
                      `Sales_Order_${orderNum.replace(/\s+/g, "_")}`
                    );
                  }}
                  className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  title="Export Single Sales Order PDF"
                >
                  <Printer size={12} /> Export Single Order PDF
                </button>

                <button
                  onClick={() => handleDeleteOrder(selectedOrder._id)}
                  className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash2 size={12} /> Delete Order
                </button>

                {/* Status Transitions */}
                <div className="space-y-1.5 pt-2.5 border-t border-slate-100">
                  <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
                    Update Pipeline Status
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {STATUS_PROGRESSION.map((st) => {
                      const isActive = selectedOrder.status?.toLowerCase() === st;
                      return (
                        <button
                          key={st}
                          disabled={updatingStatus || selectedOrder.status === "cancelled" || isActive}
                          onClick={() => handleStatusTransition(selectedOrder._id, st)}
                          className={`px-2 py-1 rounded-lg text-[8.5px] font-black uppercase transition-all ${
                            isActive
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60 disabled:opacity-50"
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}

                    {selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" && (
                      confirmCancelId === selectedOrder._id ? (
                        <div className="flex items-center gap-1">
                          <button
                            disabled={updatingStatus}
                            onClick={() => handleStatusTransition(selectedOrder._id, "cancelled")}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[8.5px] font-black uppercase transition-all"
                          >
                            Confirm Cancel
                          </button>
                          <button
                            disabled={updatingStatus}
                            onClick={() => setConfirmCancelId(null)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[8.5px] font-black uppercase transition-all"
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={updatingStatus}
                          onClick={() => setConfirmCancelId(selectedOrder._id)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 rounded-lg text-[8.5px] font-black uppercase transition-all"
                        >
                          Cancel Order
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-10 space-y-1.5">
                <ShoppingBag size={28} className="text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-wider">
                  Select a sales order to view details
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Sales Order Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <form
            onSubmit={handleCreateOrder}
            className="relative w-full max-w-lg bg-white rounded-2xl p-5 shadow-2xl space-y-3 border border-slate-100 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Create Sales Order
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Customer
              </label>
              <select
                required
                value={createForm.customerId}
                onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800"
              >
                <option value="">Select Customer...</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName || c.name || c.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Line Items
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCreateForm({
                      ...createForm,
                      items: [...createForm.items, { description: "", sku: "", quantity: 1, price: 0 }]
                    })
                  }
                  className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-0.5 hover:underline"
                >
                  <Plus size={11} /> Add Item
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {createForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                    <input
                      required
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => {
                        const next = [...createForm.items];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setCreateForm({ ...createForm, items: next });
                      }}
                      className="col-span-5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-[10.5px] font-semibold"
                    />
                    <input
                      placeholder="SKU"
                      value={item.sku}
                      onChange={(e) => {
                        const next = [...createForm.items];
                        next[idx] = { ...next[idx], sku: e.target.value };
                        setCreateForm({ ...createForm, items: next });
                      }}
                      className="col-span-2 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-[10.5px] font-semibold"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...createForm.items];
                        next[idx] = { ...next[idx], quantity: e.target.value };
                        setCreateForm({ ...createForm, items: next });
                      }}
                      className="col-span-2 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-[10.5px] font-semibold"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => {
                        const next = [...createForm.items];
                        next[idx] = { ...next[idx], price: e.target.value };
                        setCreateForm({ ...createForm, items: next });
                      }}
                      className="col-span-2 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-[10.5px] font-semibold"
                    />
                    <button
                      type="button"
                      disabled={createForm.items.length === 1}
                      onClick={() =>
                        setCreateForm({
                          ...createForm,
                          items: createForm.items.filter((_, i) => i !== idx)
                        })
                      }
                      className="col-span-1 p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Notes
              </label>
              <textarea
                rows={2}
                placeholder="Order instructions or shipping notes..."
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-semibold resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-[10px] font-black uppercase"
              >
                {creating ? "Creating..." : "Create Order"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
