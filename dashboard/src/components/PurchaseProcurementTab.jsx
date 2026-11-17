import React, { useState, useEffect, useMemo } from "react";
import { Plus, CheckCircle, Search, Download, FileText, Clock3, Phone, Zap, X, AlertCircle } from "lucide-react";
import { api, apiUrl } from "../api/client.js";
import { ItemAutocomplete, QuickCreateItemModal } from "./ItemAutocomplete.jsx";
import ProcurementAnalytics from "./ProcurementAnalytics.jsx";
import { formatCurrency } from "../utils/currencyFormatter.js";
import { useAuth } from "../context/AuthContext.jsx";
import { hasPermission } from "../utils/permissions.js";
import { PERMISSIONS } from "../constants/domain.js";

export default function PurchaseProcurementTab({ websiteId }) {
  const { user } = useAuth();
  const canCreatePO = !user || hasPermission(user, PERMISSIONS.PURCHASE_CREATE);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wonDeals, setWonDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [noticeMsg, setNoticeMsg] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [submittingPO, setSubmittingPO] = useState(false);
  const [submittingSupplier, setSubmittingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    taxId: "",
    address: "",
    password: ""
  });
  const [form, setForm] = useState({
    supplierId: "",
    items: [{ itemId: "", description: "", quantity: 1, unitPrice: 0, total: 0 }],
    expectedDeliveryDate: "",
    notes: "",
    crmCustomerId: ""
  });
  const [quickCreateQuery, setQuickCreateQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const showTempNotice = (msg) => {
    setNoticeMsg(msg);
    setTimeout(() => setNoticeMsg(""), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [suppRes, ordRes, dealsRes] = await Promise.all([
        api.get("/api/procurement/suppliers"),
        api.get(`/api/procurement/orders${websiteId ? `?websiteId=${websiteId}` : ""}`),
        api.get(`/api/crm?pipelineStage=won${websiteId ? `&websiteId=${websiteId}` : ""}&limit=100`).catch(() => [])
      ]);
      setSuppliers(Array.isArray(suppRes) ? suppRes : suppRes?.suppliers || []);
      setOrders(Array.isArray(ordRes) ? ordRes : ordRes?.orders || []);
      setWonDeals(Array.isArray(dealsRes) ? dealsRes : dealsRes?.customers || []);
    } catch (err) {
      setErrorMsg(err?.message || "Failed to load procurement data");
    } finally {
      setLoading(false);
    }
  };

  const approveDraft = async (orderId) => {
    setErrorMsg("");
    try {
      await api.patch(`/api/procurement/orders/${orderId}`, { status: "sent" });
      await fetchData();
      showTempNotice("Order approved and sent to supplier");
    } catch (err) {
      setErrorMsg(err?.message || "Failed to approve order");
    }
  };

  const updateItem = (idx, patch) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], ...patch };
    newItems[idx].total = (Number(newItems[idx].quantity) || 0) * (Number(newItems[idx].unitPrice) || 0);
    setForm({ ...form, items: newItems });
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!websiteId) {
      setErrorMsg("Please select a website scope from the top bar first.");
      return;
    }
    setSubmittingPO(true);
    setErrorMsg("");
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
        notes: "",
        crmCustomerId: ""
      });
      await fetchData();
      showTempNotice("Purchase order drafted");
    } catch (err) {
      setErrorMsg(err?.message || "Failed to create PO");
    } finally {
      setSubmittingPO(false);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    setSubmittingSupplier(true);
    setErrorMsg("");
    try {
      await api.post("/api/procurement/suppliers", supplierForm);
      setShowAddSupplier(false);
      setSupplierForm({ companyName: "", contactPerson: "", email: "", phone: "", taxId: "", address: "", password: "" });
      await fetchData();
      showTempNotice("Supplier and user account created");
    } catch (err) {
      setErrorMsg(err?.message || "Failed to create supplier");
    } finally {
      setSubmittingSupplier(false);
    }
  };

  const downloadPO = async (orderId) => {
    setErrorMsg("");
    try {
      const token = localStorage.getItem("dashboard_token");
      const res = await fetch(await apiUrl(`/api/procurement/orders/${orderId}/pdf`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setErrorMsg(err?.message || "Failed to download PO PDF");
    }
  };

  const drafts = useMemo(() => orders.filter((o) => o.status === "draft"), [orders]);
  const activeOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders
      .filter((o) => o.status !== "draft")
      .filter((o) => orderStatusFilter === "all" || o.status === orderStatusFilter)
      .filter((o) => {
        if (!q) return true;
        return `${o.poNumber || ""} ${o.supplierId?.companyName || ""} ${o.status || ""}`.toLowerCase().includes(q);
      });
  }, [orders, orderSearch, orderStatusFilter]);

  const unlinkedWonDeals = useMemo(
    () => wonDeals.filter((deal) => !orders.some((o) => o.crmCustomerId === deal._id)),
    [wonDeals, orders]
  );

  if (loading) {
    return (
      <div className="py-8 text-center animate-pulse text-[10px] font-black uppercase tracking-wider text-slate-400">
        Loading procurement data...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
          <span className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            {errorMsg}
          </span>
          <button type="button" onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-800">
            <X size={14} />
          </button>
        </div>
      )}

      {noticeMsg && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700">
          <span className="flex items-center gap-2">
            <CheckCircle size={14} className="shrink-0" />
            {noticeMsg}
          </span>
          <button type="button" onClick={() => setNoticeMsg("")} className="text-emerald-500 hover:text-emerald-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Draft Orders Banner */}
      {drafts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
              <Clock3 size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">
                Auto-Replenishment Drafts ({drafts.length})
              </h4>
              <p className="text-[10px] font-bold text-amber-700/80 uppercase tracking-wider">
                Review and approve system-generated draft purchase orders
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {drafts.map((draft) => (
              <div key={draft._id} className="bg-white border border-amber-100 p-3.5 rounded-xl shadow-sm space-y-2.5">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{draft.poNumber}</p>
                    <p className="text-xs font-black text-slate-800 truncate">{draft.supplierId?.companyName || "Unknown Supplier"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900">{formatCurrency(draft.total || 0)}</p>
                    <p className="text-[9px] font-black uppercase text-amber-600">{draft.items?.length || 0} Items</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {(draft.items || []).slice(0, 2).map((item, i) => (
                    <div key={i} className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span className="truncate mr-2">{item.description}</span>
                      <span className="shrink-0">x{item.quantity}</span>
                    </div>
                  ))}
                  {(draft.items?.length || 0) > 2 && (
                    <p className="text-[9px] font-bold text-slate-400 italic">+{draft.items.length - 2} more items</p>
                  )}
                </div>
                <button
                  onClick={() => approveDraft(draft._id)}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={13} />
                  Approve & Send
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProcurementAnalytics websiteId={websiteId} />

      {/* Won CRM Deals section */}
      {unlinkedWonDeals.length > 0 && (
        <div className="space-y-2.5 bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-indigo-600" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Won Deals Awaiting Supplier PO ({unlinkedWonDeals.length})
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unlinkedWonDeals.map((deal) => (
              <div key={deal._id} className="bg-white p-3.5 rounded-xl border border-indigo-100 hover:border-indigo-300 transition flex flex-col justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">CRM Won Handoff</span>
                    <span className="text-xs font-black text-slate-800">{formatCurrency(deal.leadValue || 0)}</span>
                  </div>
                  <h5 className="text-xs font-black text-slate-900 truncate">{deal.companyName || deal.name}</h5>
                  <p className="text-[10px] text-slate-500 font-medium truncate">Requirement: {deal.requirement || "Not specified"}</p>
                  {deal.phone && (
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                      <Phone size={10} /> {deal.phone}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setForm({
                      supplierId: "",
                      notes: `Procurement for: ${deal.companyName || deal.name} — Requirement: ${deal.requirement || "Not specified"} — Code: ${deal.generatedCode || ""}`,
                      items: [{ itemId: "new", description: deal.requirement || "Service/Product Delivery", quantity: 1, unitPrice: deal.leadValue || 0, total: deal.leadValue || 0 }],
                      expectedDeliveryDate: "",
                      crmCustomerId: deal._id
                    });
                    setShowCreate(true);
                  }}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition"
                >
                  + Create PO
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Management Header & Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Vendor Management & Purchase Orders</h3>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Draft purchase orders and manage active suppliers</p>
          </div>
          {canCreatePO && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddSupplier((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition"
              >
                <Plus size={13} /> Add Supplier
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-black transition shadow-sm"
              >
                <Plus size={13} /> Create PO
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              placeholder="Search PO number or supplier..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-700 outline-none"
          >
            <option value="all">All Statuses ({activeOrders.length})</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {showAddSupplier && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-4 shadow-sm">
          <form onSubmit={handleCreateSupplier} className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">New Supplier Registration</h4>
              <button type="button" onClick={() => setShowAddSupplier(false)} className="text-slate-400 hover:text-slate-700">
                <X size={15} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Company Name *</label>
                <input required value={supplierForm.companyName} onChange={(e) => setSupplierForm({ ...supplierForm, companyName: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Contact Person</label>
                <input value={supplierForm.contactPerson} onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Login Email *</label>
                <input type="email" required value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Login Password *</label>
                <input type="password" required value={supplierForm.password} onChange={(e) => setSupplierForm({ ...supplierForm, password: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Phone</label>
                <input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Tax ID / Registration</label>
                <input value={supplierForm.taxId} onChange={(e) => setSupplierForm({ ...supplierForm, taxId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Address</label>
                <textarea rows="2" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowAddSupplier(false)} className="px-3.5 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider hover:bg-slate-50 rounded-xl">Cancel</button>
              <button type="submit" disabled={submittingSupplier} className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50">
                {submittingSupplier ? "Creating..." : "Create Supplier"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Procurement</p>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Create Supplier Purchase Order</h3>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Supplier *</label>
                  <select
                    required
                    value={form.supplierId}
                    onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.companyName} {s.rating ? `(Rating: ${s.rating}/100)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Expected Delivery *</label>
                  <input
                    type="date"
                    required
                    value={form.expectedDeliveryDate}
                    onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-wider border-b border-indigo-50 pb-1.5">Order Items</p>
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <ItemAutocomplete
                        value={item.description}
                        onChange={(val) => updateItem(idx, { description: val })}
                        onSelect={(selected) =>
                          updateItem(idx, {
                            itemId: selected._id,
                            description: selected.name,
                            unitPrice: selected.unitCost || 0
                          })
                        }
                        websiteId={websiteId}
                        placeholder="Search inventory item..."
                        onCreateNew={(q) => setQuickCreateQuery(q)}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        placeholder="Unit Price"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} className="text-rose-400 hover:text-rose-600 font-black text-base">
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, items: [...form.items, { itemId: "", description: "", quantity: 1, unitPrice: 0, total: 0 }] })}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
                >
                  + Add Item
                </button>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Notes / Details</label>
                <textarea
                  rows="2"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-xs font-black text-slate-900 uppercase">
                  Total: {formatCurrency(form.items.reduce((a, b) => a + (b.total || 0), 0))}
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider hover:bg-slate-50 rounded-xl">
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingPO} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-50">
                    {submittingPO ? "Saving..." : "Draft PO"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {quickCreateQuery && (
        <QuickCreateItemModal
          initialName={quickCreateQuery}
          websiteId={websiteId}
          onCreated={() => setQuickCreateQuery("")}
          onClose={() => setQuickCreateQuery("")}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">PO Number</th>
              <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Supplier</th>
              <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Amount</th>
              <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Reconciliation</th>
              <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {activeOrders.map((order) => (
              <tr key={order._id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-2.5">
                  <span className="font-black text-slate-900">{order.poNumber}</span>
                  <div className="text-[10px] font-semibold text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="px-4 py-2.5 font-bold text-slate-700">
                  {order.supplierId?.companyName || "Unknown"}
                </td>
                <td className="px-4 py-2.5 font-black text-slate-900">
                  {formatCurrency(order.total || 0)}
                </td>
                <td className="px-4 py-2.5">
                  {order.reconciliation?.status === "matched" ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                      <CheckCircle size={10} /> Matched
                    </span>
                  ) : order.reconciliation?.status === "mismatch" ? (
                    <div className="space-y-0.5">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-600">
                        <FileText size={10} /> Mismatch
                      </span>
                      <p className="text-[9px] font-semibold text-rose-500 leading-tight max-w-[140px]">
                        {order.reconciliation.mismatchReason}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pending</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      order.status === "sent" || order.status === "draft"
                        ? "bg-amber-100 text-amber-700"
                        : order.status === "accepted"
                        ? "bg-indigo-100 text-indigo-700"
                        : order.status === "shipped"
                        ? "bg-sky-100 text-sky-700"
                        : order.status === "delivered"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {order.status}
                  </span>
                  {order.invoiceUrl && (
                    <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 underline">
                      View Invoice
                    </a>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => downloadPO(order._id)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="Download PO PDF"
                  >
                    <Download size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {activeOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs font-bold text-slate-400">
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
