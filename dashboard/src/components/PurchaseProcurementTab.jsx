import React, { useState, useEffect } from "react";
import { Plus, CheckCircle, Package, Search, Download, FileText, Clock3 } from "lucide-react";
import { api, API_BASE } from "../api/client.js";
import { ItemAutocomplete, QuickCreateItemModal } from "./ItemAutocomplete.jsx";
import ProcurementAnalytics from "./ProcurementAnalytics.jsx";

export default function PurchaseProcurementTab({ websiteId }) {
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ companyName: "", contactPerson: "", email: "", phone: "", taxId: "", address: "", password: "" });
  const [form, setForm] = useState({
    supplierId: "",
    items: [{ itemId: "", description: "", quantity: 1, unitPrice: 0, total: 0 }],
    expectedDeliveryDate: "",
    notes: ""
  });
  const [quickCreateQuery, setQuickCreateQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [suppRes, ordRes] = await Promise.all([
        api.get("/api/procurement/suppliers"),
        api.get(`/api/procurement/orders${websiteId ? `?websiteId=${websiteId}` : ""}`)
      ]);
      setSuppliers(suppRes);
      setOrders(ordRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approveDraft = async (orderId) => {
    try {
      await api.patch(`/api/procurement/orders/${orderId}`, { status: "sent" });
      fetchData();
      alert("Order approved and sent to supplier!");
    } catch (err) {
      alert(err.message || "Failed to approve order");
    }
  };

  const updateItem = (idx, patch) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], ...patch };
    newItems[idx].total = newItems[idx].quantity * newItems[idx].unitPrice;
    setForm({ ...form, items: newItems });
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!websiteId) {
      alert("Please select a website scope from the top of the page first.");
      return;
    }
    
    try {
      await api.post("/api/procurement/orders", {
        ...form,
        websiteId
      });
      setShowCreate(false);
      setForm({
        supplierId: "",
        items: [{ itemId: "", description: "", quantity: 1, unitPrice: 0, total: 0 }],
        expectedDeliveryDate: "",
        notes: ""
      });
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to create PO");
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/procurement/suppliers", supplierForm);
      setShowAddSupplier(false);
      setSupplierForm({ companyName: "", contactPerson: "", email: "", phone: "", taxId: "", address: "", password: "" });
      fetchData();
      alert("Supplier and user account created successfully!");
    } catch (err) {
      alert(err.message || "Failed to create Supplier");
    }
  };

  const downloadPO = async (orderId) => {
    try {
      const token = localStorage.getItem("dashboard_token");
      const res = await fetch(`${API_BASE}/api/procurement/orders/${orderId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to download PDF");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("PDF Download Error:", err);
      alert("Failed to download PDF. Please try again.");
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  if (loading) return <div className="py-10 text-center animate-pulse text-[10px] font-black uppercase text-slate-400">Loading procurement data...</div>;

  const drafts = orders.filter(o => o.status === "draft");
  const activeOrders = orders.filter(o => o.status !== "draft");

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
      {/* Draft Orders Banner */}
      {drafts.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-8 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 p-3 rounded-2xl">
                <Clock3 className="text-amber-600" size={24} />
              </div>
              <div>
                <h4 className="text-lg font-black text-amber-900 tracking-tight">Auto-Replenishment Drafts ({drafts.length})</h4>
                <p className="text-xs font-bold text-amber-700/70 uppercase tracking-widest">Action required: Review and approve system-generated orders</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map(draft => (
              <div key={draft._id} className="bg-white border border-amber-100 p-6 rounded-[30px] shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{draft.poNumber}</p>
                    <p className="text-sm font-black text-slate-800">{draft.supplierId?.companyName || "Unknown Supplier"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 italic">₹{draft.total?.toLocaleString()}</p>
                    <p className="text-[9px] font-black uppercase text-amber-600">{draft.items.length} Items</p>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  {draft.items.slice(0, 2).map((item, i) => (
                    <div key={i} className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>{item.description}</span>
                      <span>x{item.quantity}</span>
                    </div>
                  ))}
                  {draft.items.length > 2 && <p className="text-[9px] font-bold text-slate-400 italic">+{draft.items.length - 2} more items</p>}
                </div>
                <button 
                  onClick={() => approveDraft(draft._id)}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={14} />
                  Approve & Send
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProcurementAnalytics />
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Vendor Management</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Draft purchase orders and manage suppliers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddSupplier(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all shadow-sm"
          >
            <Plus size={14} /> Add Supplier
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
          >
            <Plus size={14} /> Create PO
          </button>
        </div>
      </div>

      {showAddSupplier && (
        <div className="bg-white rounded-[32px] border border-indigo-100 p-8 shadow-sm">
          <form onSubmit={handleCreateSupplier} className="space-y-6">
            <h4 className="text-[12px] font-black uppercase tracking-widest text-slate-800 border-b border-slate-100 pb-3">New Supplier Registration</h4>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Company Name *</label>
                <input required value={supplierForm.companyName} onChange={e => setSupplierForm({...supplierForm, companyName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Person</label>
                <input value={supplierForm.contactPerson} onChange={e => setSupplierForm({...supplierForm, contactPerson: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Login Email *</label>
                <input type="email" required value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Login Password *</label>
                <input type="password" required value={supplierForm.password} onChange={e => setSupplierForm({...supplierForm, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone</label>
                <input value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tax ID / GSTIN</label>
                <input value={supplierForm.taxId} onChange={e => setSupplierForm({...supplierForm, taxId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Address</label>
                <textarea rows="2" value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowAddSupplier(false)} className="px-5 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl">Cancel</button>
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100">Create Supplier & User</button>
            </div>
          </form>
        </div>
      )}

      {showCreate && (
        <div className="bg-white rounded-[32px] border border-indigo-100 p-8 shadow-sm">
          <form onSubmit={handleCreatePO} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier</label>
                <select 
                  required
                  value={form.supplierId}
                  onChange={e => setForm({...form, supplierId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.companyName} {s.rating ? `(Rating: ${s.rating}/100)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected Delivery</label>
                <input 
                  type="date"
                  required
                  value={form.expectedDeliveryDate}
                  onChange={e => setForm({...form, expectedDeliveryDate: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest border-b border-indigo-50 pb-2">Order Items</p>
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-6">
                    <ItemAutocomplete
                      value={item.description}
                      onChange={val => updateItem(idx, { description: val })}
                      onSelect={selected => updateItem(idx, { 
                        itemId: selected._id, 
                        description: selected.name, 
                        unitPrice: selected.unitCost || 0 
                      })}
                      websiteId={websiteId}
                      placeholder="Search inventory item..."
                      onCreateNew={(q) => setQuickCreateQuery(q)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="number" min="1" placeholder="Qty"
                      value={item.quantity}
                      onChange={e => updateItem(idx, { quantity: Number(e.target.value) })}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="col-span-3">
                    <input 
                      type="number" min="0" placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={e => updateItem(idx, { unitPrice: Number(e.target.value) })}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => setForm({...form, items: form.items.filter((_, i) => i !== idx)})} className="text-rose-400 hover:text-rose-600 font-black">×</button>
                    )}
                  </div>
                </div>
              ))}
              <button 
                type="button" 
                onClick={() => setForm({...form, items: [...form.items, { itemId: "", description: "", quantity: 1, unitPrice: 0, total: 0 }]})}
                className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 uppercase tracking-widest"
              >
                + Add Item
              </button>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <span className="text-sm font-black text-slate-900 uppercase">Total: {formatCurrency(form.items.reduce((a, b) => a + b.total, 0))}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100">Draft PO</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {quickCreateQuery && (
        <QuickCreateItemModal
          initialName={quickCreateQuery}
          websiteId={websiteId}
          onCreated={(newItem) => {
            setQuickCreateQuery("");
          }}
          onClose={() => setQuickCreateQuery("")}
        />
      )}

      <div className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">PO Number</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Supplier</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Amount</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Reconciliation</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeOrders.map(order => (
              <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-[11px] font-black text-slate-900">{order.poNumber}</span>
                  <div className="text-[9px] font-bold text-slate-400 mt-1">{new Date(order.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[11px] font-bold text-slate-700">{order.supplierId?.companyName || "Unknown"}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[11px] font-black text-slate-900">{formatCurrency(order.total)}</span>
                </td>
                <td className="px-6 py-4">
                  {order.reconciliation?.status === 'matched' ? (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                      <CheckCircle size={10} /> Matched
                    </span>
                  ) : order.reconciliation?.status === 'mismatch' ? (
                    <div className="space-y-1">
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-rose-600">
                        <FileText size={10} /> Mismatch
                      </span>
                      <p className="text-[8px] font-bold text-rose-400 leading-tight max-w-[120px]">{order.reconciliation.mismatchReason}</p>
                    </div>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pending</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                    order.status === 'sent' || order.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                    order.status === 'accepted' ? 'bg-indigo-100 text-indigo-700' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {order.status}
                  </span>
                  {order.invoiceUrl && (
                    <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer" className="block mt-2 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 underline">
                      View Invoice
                    </a>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => downloadPO(order._id)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Download PO PDF"
                  >
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-[11px] font-bold text-slate-400">
                  No purchase orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
