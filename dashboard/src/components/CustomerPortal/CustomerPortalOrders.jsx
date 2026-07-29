import React, { useState, useEffect } from "react";
import { ShoppingCart, Truck, Clock } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { useCurrency } from "../../context/CurrencyContext.jsx";

function formatAddress(addr) {
  if (!addr) return "Standard Shipping";
  if (typeof addr === "string") return addr;
  if (typeof addr === "object") {
    const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Standard Shipping";
  }
  return "Standard Shipping";
}

export default function CustomerPortalOrders() {
  const toast = useToast();
  const { formatCurrency } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await api("/api/crm/customer-portal/orders");
      setOrders(res || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) return <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase">Loading orders...</p>;

  return (
    <div className="space-y-6">
      <div className="border-b pb-3 border-slate-200">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Sales Orders</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Track your orders, delivery status, and logs</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm">
        {orders.length === 0 ? (
          <p className="text-center py-20 text-slate-400 text-xs font-bold uppercase tracking-widest">No orders logged.</p>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order._id} className="p-5 border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50/50 transition-colors gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800">Order #{order.orderNumber || order._id.slice(-6).toUpperCase()}</h5>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                      Ordered: {new Date(order.createdAt).toLocaleDateString()} • Shipping Address: {formatAddress(order.shippingAddress)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-slate-800">{formatCurrency(order.totalAmount || order.total || 0)}</p>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${order.status === "delivered" ? "bg-emerald-50 text-emerald-600" : order.status === "shipped" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-600"}`}>{order.status}</span>
                  </div>

                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl text-slate-500 text-[10px]">
                    <Truck size={12} className="text-slate-400" />
                    <span>Est: 3-5 days delivery</span>
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
