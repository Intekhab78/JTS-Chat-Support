import React, { useState, useEffect } from "react";
import { ShoppingBag, ChevronRight, CheckCircle2, Truck, RefreshCw, X, ShieldAlert } from "lucide-react";
import { api } from "../../api/client.js";

const STATUS_PROGRESSION = [
  "draft", "confirmed", "processing", "packed", "shipped", "delivered", "completed"
];

export default function CrmSalesOrdersView({ websiteId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/salesorders?websiteId=${websiteId}`);
      setOrders(res || []);
    } catch (err) {
      console.error(err);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Sales Order Pipeline</h3>
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wide">Enterprise Operations</span>
      </div>

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
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-3 border-slate-100">Active Sales Orders</h4>
            {orders.length === 0 ? (
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center py-10">No sales orders active.</p>
            ) : (
              <div className="space-y-3">
                {orders.map(o => (
                  <div
                    key={o._id}
                    onClick={() => setSelectedOrder(o)}
                    className={`p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-colors ${selectedOrder?._id === o._id ? "border-indigo-500 bg-indigo-50/10" : "border-slate-100 hover:bg-slate-50/50"}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{o.orderNumber}</span>
                        <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded capitalize">{o.status}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total Value: ${o.totalAmount} • Payment: <span className="text-indigo-600 font-black">{o.paymentStatus}</span></p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details & Status triggers */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between min-h-[350px]">
            {selectedOrder ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1">{selectedOrder.orderNumber}</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Created on: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Order Items</span>
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>{item.name} x{item.quantity}</span>
                      <span>${item.total}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 pt-3 flex justify-between font-black text-slate-900 text-xs">
                    <span>Order Total:</span>
                    <span className="text-indigo-600">${selectedOrder.totalAmount}</span>
                  </div>
                </div>

                {/* Status Transitions Progression Bar */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Update Pipeline Status</span>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_PROGRESSION.map((st, idx) => {
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
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-10 space-y-2">
                <ShoppingBag size={32} className="text-slate-300" />
                <p className="text-[10px] font-black uppercase tracking-wider">Select a sales order to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
