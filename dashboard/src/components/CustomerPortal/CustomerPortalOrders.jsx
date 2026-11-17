import React, { useState, useEffect } from "react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { ShoppingCart, Truck, Eye, Printer, X, CheckCircle2, Clock, Wallet } from "lucide-react";
import { printPortalDocument, formatPortalMoney } from "./portalPrintUtils.js";

const formatAddress = (addr) => {
  if (!addr) return "Not specified";
  if (typeof addr === "string") return addr.trim() || "Not specified";
  if (typeof addr === "object") {
    const parts = [addr.street, addr.city, addr.state, addr.postalCode || addr.zip, addr.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Not specified";
  }
  return String(addr);
};

export default function CustomerPortalOrders({ currency = "USD", currencySettings = null, workspaceName = "Client Portal", customer = null }) {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewOrder, setViewOrder] = useState(null);

  const formatMoney = (amount, curr) => formatPortalMoney(amount, curr || currency, currencySettings);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api("/api/crm/customer-portal/orders");
        setOrders(Array.isArray(res) ? res : []);
      } catch (err) {
        toast.error(err.message || "Failed to load sales orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") setViewOrder(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const getOrderTotal = (o) => Number(o?.totalAmount ?? o?.total ?? 0);
  const getOrderTax = (o) => Number(o?.taxAmount ?? o?.tax ?? 0);

  const handlePrintOrder = (order) => {
    if (!order) return;
    const orderNum = order.orderNumber || order.orderId || order._id.slice(-6).toUpperCase();
    const orderTotal = getOrderTotal(order);
    const opened = printPortalDocument({
      docType: "SALES ORDER",
      docNumber: orderNum,
      status: order.status || "CONFIRMED",
      workspaceName,
      issuedDate: order.createdAt,
      dueDate: order.expectedDeliveryDate || order.deliveryDate,
      dueDateLabel: "Expected Delivery",
      referenceLabel: order.trackingNumber ? "Tracking #" : "",
      referenceValue: order.trackingNumber || "",
      customer: {
        name: customer?.name || "Customer",
        email: customer?.email || "",
        crn: customer?.crn || ""
      },
      billingAddress: order.billingAddress,
      shippingAddress: order.shippingAddress,
      items: order.items || [],
      subtotal: order.subtotal ?? orderTotal,
      discount: order.discountAmount || 0,
      tax: getOrderTax(order),
      shipping: order.shippingCharges || 0,
      total: orderTotal,
      notes: order.notes || "",
      formatMoney: (v) => formatMoney(v, order.currency || currency)
    });
    if (!opened) {
      toast.error("Please allow pop-ups to print this sales order");
    }
  };

  if (loading) {
    return <div className="p-4 bg-white rounded-xl border border-slate-200/80 text-center text-xs text-slate-400">Loading sales orders...</div>;
  }

  const deliveredCount = orders.filter((o) => o.status === "delivered" || o.status === "completed").length;
  const activeCount = orders.length - deliveredCount;
  const totalValue = orders.reduce((sum, o) => sum + getOrderTotal(o), 0);

  const statCards = [
    { label: "Total Orders", value: orders.length, icon: ShoppingCart, color: "text-amber-600 bg-amber-50" },
    { label: "In Progress", value: activeCount, icon: Clock, color: "text-indigo-600 bg-indigo-50" },
    { label: "Delivered", value: deliveredCount, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Order Value", value: formatMoney(totalValue, currency), icon: Wallet, color: "text-slate-700 bg-slate-100" }
  ];

  return (
    <div className="space-y-3">
      {/* Mini Summary Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{card.label}</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5 truncate">{card.value}</p>
              </div>
              <div className={`p-2 rounded-xl shrink-0 ${card.color}`}>
                <Icon size={16} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Sales Orders</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Track order fulfillment, shipping address, and itemized details.</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">No sales orders available yet.</div>
        ) : (
          <div className="space-y-2.5">
            {orders.map((order) => (
              <div key={order._id} className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <ShoppingCart size={16} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900">
                      Order #{order.orderNumber || order.orderId || order._id.slice(-6).toUpperCase()}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      Ordered: {new Date(order.createdAt).toLocaleDateString()} • Shipping: {formatAddress(order.shippingAddress)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="text-right mr-1">
                    <p className="text-xs font-bold text-slate-900">{formatMoney(getOrderTotal(order), order.currency || currency)}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      order.status === "delivered" || order.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      order.status === "shipped" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                      "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {order.status || "confirmed"}
                    </span>
                  </div>

                  {order.trackingNumber && (
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      <Truck size={12} className="text-slate-400" />
                      {order.trackingNumber}
                    </span>
                  )}

                  <button
                    onClick={() => setViewOrder(order)}
                    className="p-1.5 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 rounded-lg transition-colors"
                    title="View Order Details"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => handlePrintOrder(order)}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors"
                    title="Print Order"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Order Modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onClick={() => setViewOrder(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Order #{viewOrder.orderNumber || viewOrder.orderId || viewOrder._id.slice(-6).toUpperCase()}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    {viewOrder.status || "confirmed"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {workspaceName} • Placed {new Date(viewOrder.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setViewOrder(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Customer &amp; Shipping</span>
                  <p className="font-bold text-slate-900">{customer?.name || "Customer"}</p>
                  {customer?.crn && <p className="text-[11px] text-slate-500">CRN: {customer.crn}</p>}
                  <p className="text-[11px] text-slate-700">{formatAddress(viewOrder.shippingAddress)}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Fulfillment Info</span>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Order Date</span>
                    <span className="font-semibold text-slate-800">{new Date(viewOrder.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Payment Status</span>
                    <span className="font-semibold text-slate-800 uppercase">{viewOrder.paymentStatus || "pending"}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Tracking #</span>
                    <span className="font-semibold text-indigo-600">{viewOrder.trackingNumber || "Pending"}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Tax</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewOrder.items || []).map((it, idx) => {
                      const unitPrice = it.unitPrice ?? it.price ?? 0;
                      const lineTotal = it.total ?? (it.quantity || 1) * unitPrice;
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-slate-800">{it.description || it.name || "Item"}</div>
                            {it.sku && <div className="text-[10px] text-slate-400">SKU: {it.sku}</div>}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600">{it.quantity || 1}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{formatMoney(unitPrice, viewOrder.currency || currency)}</td>
                          <td className="px-3 py-2 text-right text-slate-500">
                            {it.taxAmount ? formatMoney(it.taxAmount, viewOrder.currency || currency) : it.taxRate ? `${it.taxRate}%` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatMoney(lineTotal, viewOrder.currency || currency)}</td>
                        </tr>
                      );
                    })}
                    {(!viewOrder.items || viewOrder.items.length === 0) && (
                      <tr><td colSpan="5" className="px-3 py-4 text-center text-slate-400">No itemized breakdown attached.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3">
                {viewOrder.notes ? (
                  <div className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Notes</span>
                    {viewOrder.notes}
                  </div>
                ) : <div className="flex-1" />}

                <div className="sm:w-60 bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-800">{formatMoney(viewOrder.subtotal ?? getOrderTotal(viewOrder), viewOrder.currency || currency)}</span>
                  </div>
                  {Number(viewOrder.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Discount</span>
                      <span className="font-semibold text-emerald-700">-{formatMoney(viewOrder.discountAmount, viewOrder.currency || currency)}</span>
                    </div>
                  )}
                  {getOrderTax(viewOrder) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax</span>
                      <span className="font-semibold text-slate-800">{formatMoney(getOrderTax(viewOrder), viewOrder.currency || currency)}</span>
                    </div>
                  )}
                  {Number(viewOrder.shippingCharges || 0) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Shipping</span>
                      <span className="font-semibold text-slate-800">{formatMoney(viewOrder.shippingCharges, viewOrder.currency || currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1">
                    <span>Grand Total</span>
                    <span>{formatMoney(getOrderTotal(viewOrder), viewOrder.currency || currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end gap-2">
              <button onClick={() => handlePrintOrder(viewOrder)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Printer size={13} /> Print Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
