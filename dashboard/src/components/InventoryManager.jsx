import { useEffect, useMemo, useState } from "react";
import { Boxes, Eye, Edit2, Trash2, Plus, X, Save, ArrowDownToLine, ArrowUpFromLine, RefreshCw, SlidersHorizontal, Package, MoreHorizontal } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import MasterManager from "./MasterManager.jsx";
import { formatCurrency } from "../utils/currencyFormatter.js";

const initialItemForm = {
  name: "",
  sku: "",
  category: "",
  categoryId: "",
  subcategoryId: "",
  sizeId: "",
  colorId: "",
  brand: "",
  description: "",
  unitCost: 0,
  quantity: 0,
  reorderLevel: 0,
  unit: "pcs",
  notes: "",
  preferredSupplierId: "",
  isActive: true
};

const initialMovementForm = {
  itemId: "",
  quantity: "",
  reference: "",
  notes: ""
};

function MovementBadge({ type }) {
  const styles = {
    in: "border-emerald-100 bg-emerald-50 text-emerald-700",
    out: "border-rose-100 bg-rose-50 text-rose-700",
    adjust: "border-amber-100 bg-amber-50 text-amber-700"
  };

  return (
    <span className={`inline-flex rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${styles[type] || "border-slate-200 bg-slate-100 text-slate-500"}`}>
      {type === "in" ? "Stock In" : type === "out" ? "Stock Out" : "Adjustment"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// formatCurrency imported from "../utils/currencyFormatter.js"

function EmptyInventoryState() {
  return (
    <div className="p-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
        <Boxes className="text-slate-300" size={32} />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Select a website to manage inventory</p>
    </div>
  );
}

export default function InventoryManager({ websiteId, activeTab: forcedTab = "master", readOnly = false }) {
  const { user } = useAuth();
  const canEditMaster = ["admin", "client", "purchase"].includes(user?.role);
  const canPostMovements = ["admin", "client", "purchase"].includes(user?.role);

  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [itemForm, setItemForm] = useState(initialItemForm);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [openActionMenuId, setOpenActionMenuId] = useState("");
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [movementForms, setMovementForms] = useState({
    in: initialMovementForm,
    out: initialMovementForm,
    adjust: initialMovementForm
  });
  const [masters, setMasters] = useState({
    categories: [],
    subcategories: [],
    sizes: [],
    colors: [],
    suppliers: []
  });
  const [autoGenSku, setAutoGenSku] = useState(false);
  const [showViewDrawer, setShowViewDrawer] = useState(false);

  const selectedItem = useMemo(() => items.find((item) => item._id === selectedItemId) || null, [items, selectedItemId]);
  const lowStockCount = useMemo(() => items.filter((item) => Number(item.quantity || 0) <= Number(item.reorderLevel || 0)).length, [items]);
  const activeItemCount = useMemo(() => items.filter((item) => item.isActive !== false).length, [items]);
  const inventoryValue = useMemo(() => items.reduce((sum, item) => sum + (Number(item.unitCost || 0) * Number(item.quantity || 0)), 0), [items]);

  async function loadData() {
    if (!websiteId) {
      setItems([]);
      setMovements([]);
      setSelectedItemId("");
      return;
    }

    setLoading(true);
    try {
      const [itemData, movementData, catData, subCatData, sizeData, colorData, supplierData] = await Promise.all([
        api(`/api/inventory/items?websiteId=${websiteId}`),
        api(`/api/inventory/movements?websiteId=${websiteId}`),
        api(`/api/inventory/masters/category?websiteId=${websiteId}`),
        api(`/api/inventory/masters/subcategory?websiteId=${websiteId}`),
        api(`/api/inventory/masters/size?websiteId=${websiteId}`),
        api(`/api/inventory/masters/color?websiteId=${websiteId}`),
        api("/api/procurement/suppliers")
      ]);
      const nextItems = Array.isArray(itemData) ? itemData : [];
      setItems(nextItems);
      setMovements(Array.isArray(movementData) ? movementData : []);
      setMasters({
        categories: Array.isArray(catData) ? catData : [],
        subcategories: Array.isArray(subCatData) ? subCatData : [],
        sizes: Array.isArray(sizeData) ? sizeData : [],
        colors: Array.isArray(colorData) ? colorData : [],
        suppliers: Array.isArray(supplierData) ? supplierData : []
      });
      setSelectedItemId((current) => {
        if (current && nextItems.some((item) => item._id === current)) return current;
        return nextItems[0]?._id || "";
      });
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!autoGenSku || editingId) return;
    const cat = masters.categories.find(c => c._id === itemForm.categoryId)?.name || "GEN";
    const size = masters.sizes.find(s => s._id === itemForm.sizeId)?.name || "NA";
    const color = masters.colors.find(c => c._id === itemForm.colorId)?.name || "NA";
    const namePrefix = itemForm.name.substring(0, 3).toUpperCase() || "ITEM";
    
    const generated = `${cat.substring(0,3).toUpperCase()}-${namePrefix}-${color.substring(0,2).toUpperCase()}-${size.toUpperCase()}`;
    setItemForm(prev => ({ ...prev, sku: generated }));
  }, [itemForm.name, itemForm.categoryId, itemForm.sizeId, itemForm.colorId, autoGenSku, editingId]);

  useEffect(() => {
    loadData();
  }, [websiteId]);

  useEffect(() => {
    if (!selectedItem) return;
    setMovementForms((current) => ({
      in: { ...current.in, itemId: selectedItem._id },
      out: { ...current.out, itemId: selectedItem._id },
      adjust: { ...current.adjust, itemId: selectedItem._id }
    }));
  }, [selectedItemId]);

  useEffect(() => {
    if (!selectedItemId) {
      setViewData(null);
      return;
    }

    loadItemView(selectedItemId);
  }, [selectedItemId]);

  async function loadItemView(itemId) {
    if (!itemId) return;
    setViewLoading(true);
    try {
      setViewData(await api(`/api/inventory/items/${itemId}`));
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load item details.");
    } finally {
      setViewLoading(false);
    }
  }

  function selectItem(itemId) {
    setSelectedItemId(itemId);
    setOpenActionMenuId("");
    setShowViewDrawer(true);
  }

  function resetItemForm() {
    setItemForm(initialItemForm);
    setEditingId("");
    setShowItemForm(false);
  }

  function startEdit(item) {
    setEditingId(item._id);
    setItemForm({
      name: item.name || "",
      sku: item.sku || "",
      category: item.category || "",
      categoryId: item.categoryId?._id || item.categoryId || "",
      subcategoryId: item.subcategoryId?._id || item.subcategoryId || "",
      sizeId: item.sizeId?._id || item.sizeId || "",
      colorId: item.colorId?._id || item.colorId || "",
      brand: item.brand || "",
      description: item.description || "",
      unitCost: item.unitCost || 0,
      quantity: item.quantity || 0,
      reorderLevel: item.reorderLevel || 0,
      unit: item.unit || "pcs",
      notes: item.notes || "",
      preferredSupplierId: item.preferredSupplierId?._id || item.preferredSupplierId || "",
      isActive: item.isActive !== false
    });
    setShowItemForm(true);
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    try {
      setError("");
      setSuccess("");
      const payload = {
        ...itemForm,
        websiteId,
        unitCost: Number(itemForm.unitCost || 0),
        quantity: Number(itemForm.quantity || 0),
        reorderLevel: Number(itemForm.reorderLevel || 0),
        categoryId: itemForm.categoryId || null,
        subcategoryId: itemForm.subcategoryId || null,
        sizeId: itemForm.sizeId || null,
        colorId: itemForm.colorId || null,
        preferredSupplierId: itemForm.preferredSupplierId || null
      };
      if (editingId) {
        await api(`/api/inventory/items/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSuccess("Inventory item updated successfully.");
      } else {
        await api("/api/inventory/items", { method: "POST", body: JSON.stringify(payload) });
        setSuccess("Inventory item created successfully.");
      }
      resetItemForm();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save item.");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this inventory item?")) return;
    try {
      setError("");
      setSuccess("");
      await api(`/api/inventory/items/${id}`, { method: "DELETE" });
      setSuccess("Inventory item deleted successfully.");
      if (selectedItemId === id) {
        setSelectedItemId("");
        setViewData(null);
      }
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete item.");
    }
  }

  function updateMovementForm(type, field, value) {
    setMovementForms((current) => ({
      ...current,
      [type]: { ...current[type], [field]: value }
    }));
  }

  async function submitMovement(type) {
    const form = movementForms[type];
    try {
      setError("");
      setSuccess("");
      await api("/api/inventory/movements", {
        method: "POST",
        body: JSON.stringify({
          itemId: form.itemId,
          type,
          quantity: type === "adjust" ? Number(form.quantity || 0) : Math.abs(Number(form.quantity || 0)),
          reference: form.reference,
          notes: form.notes
        })
      });
      setSuccess(type === "in" ? "Stock in completed successfully." : type === "out" ? "Stock out completed successfully." : "Stock adjustment completed successfully.");
      setMovementForms((current) => ({
        ...current,
        [type]: {
          ...initialMovementForm,
          itemId: selectedItem?._id || ""
        }
      }));
      await loadData();
      if (selectedItemId) await loadItemView(selectedItemId);
    } catch (err) {
      setError(err.message || "Failed to process movement.");
    }
  }

  const filteredHistory = useMemo(() => {
    if (!selectedItemId) return movements;
    return movements.filter((movement) => movement.itemId?._id === selectedItemId);
  }, [movements, selectedItemId]);

  if (!websiteId) return <EmptyInventoryState />;

  return (
    <div className="max-w-full space-y-8 overflow-x-hidden animate-in fade-in duration-700">
      <div className="max-w-full">
        <div className="space-y-6">
          {error ? <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100">{error}</div> : null}
          {success ? <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">{success}</div> : null}
          {forcedTab === "master" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-[28px] border border-indigo-100 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_100%)] px-5 py-5 shadow-[0_24px_60px_-42px_rgba(79,70,229,0.9)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-indigo-500">Inventory Count</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-black tracking-tight text-slate-900">{items.length}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master items</p>
                  </div>
                </div>
                <div className="rounded-[28px] border border-amber-100 bg-[linear-gradient(135deg,#fffbeb_0%,#ffffff_100%)] px-5 py-5 shadow-[0_24px_60px_-42px_rgba(245,158,11,0.8)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-600">Low Stock Alert</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-black tracking-tight text-slate-900">{lowStockCount}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Need restock</p>
                  </div>
                </div>
                <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_100%)] px-5 py-5 shadow-[0_24px_60px_-42px_rgba(16,185,129,0.8)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600">Inventory Value</p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-2xl font-black tracking-tight text-slate-900">{formatCurrency(inventoryValue)}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live estimate</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-500">Item Master</p>
                  <h3 className="text-2xl font-black tracking-tight text-slate-900">Command inventory with a cleaner visual rhythm</h3>
                  <p className="max-w-2xl text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Show all items and manage add, edit, view, and delete from one screen.</p>
                </div>
                  {!readOnly && canEditMaster && (
                    <button
                      type="button"
                      onClick={() => {
                        if (showItemForm && !editingId) {
                          resetItemForm();
                          return;
                        }
                        setEditingId("");
                        setItemForm(initialItemForm);
                        setShowItemForm((current) => !current);
                      }}
                      className="rounded-[24px] bg-[linear-gradient(135deg,#4f46e5_0%,#4338ca_45%,#0f172a_100%)] px-6 py-3 text-white font-black text-[10px] uppercase tracking-[0.22em] shadow-[0_24px_60px_-28px_rgba(79,70,229,0.9)] flex items-center gap-2 transition-all hover:-translate-y-0.5"
                    >
                      {showItemForm ? <X size={14} /> : <Plus size={14} />}
                      {showItemForm ? "Cancel" : "Add Item"}
                    </button>
                  )}
              </div>

              {showItemForm ? (
                <form onSubmit={handleItemSubmit} className="overflow-hidden rounded-[34px] border border-slate-200/70 bg-white shadow-[0_32px_90px_-48px_rgba(15,23,42,0.45)]">
                  <div className="border-b border-indigo-100/70 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_55%,#f8fafc_100%)] px-6 py-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-indigo-500">{editingId ? "Edit Inventory Item" : "New Inventory Item"}</p>
                    <h4 className="mt-2 text-xl font-black tracking-tight text-slate-900">Capture item details with proper structure</h4>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Keep master data clean so stock movement and reporting stay reliable.</p>
                  </div>
                  <div className="space-y-5 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    <label className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Item Name</span>
                      <input value={itemForm.name} onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder="Dell Monitor 24 inch" required />
                    </label>
                    <label className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SKU</span>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="auto-sku" checked={autoGenSku} onChange={(e) => setAutoGenSku(e.target.checked)} />
                          <label htmlFor="auto-sku" className="text-[8px] font-black uppercase tracking-widest text-indigo-500 cursor-pointer">Auto-gen</label>
                        </div>
                      </div>
                      <input value={itemForm.sku} onChange={(event) => setItemForm((current) => ({ ...current, sku: event.target.value.toUpperCase() }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder="MON-24-DELL-001" required disabled={autoGenSku && !editingId} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</span>
                      <select value={itemForm.categoryId} onChange={(event) => setItemForm((current) => ({ ...current, categoryId: event.target.value, subcategoryId: "" }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500">
                        <option value="">Select Category</option>
                        {masters.categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subcategory</span>
                      <select value={itemForm.subcategoryId} onChange={(event) => setItemForm((current) => ({ ...current, subcategoryId: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" disabled={!itemForm.categoryId}>
                        <option value="">Select Subcategory</option>
                        {masters.subcategories.filter(s => s.categoryId === itemForm.categoryId).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Size</span>
                      <select value={itemForm.sizeId} onChange={(event) => setItemForm((current) => ({ ...current, sizeId: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500">
                        <option value="">Select Size</option>
                        {masters.sizes.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Color</span>
                      <select value={itemForm.colorId} onChange={(event) => setItemForm((current) => ({ ...current, colorId: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500">
                        <option value="">Select Color</option>
                        {masters.colors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Brand</span>
                      <input value={itemForm.brand} onChange={(event) => setItemForm((current) => ({ ...current, brand: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder="Dell" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Cost</span>
                      <input type="number" min="0" step="0.01" value={itemForm.unitCost} onChange={(event) => setItemForm((current) => ({ ...current, unitCost: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder="0.00" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opening Quantity</span>
                      <input type="number" min="0" value={itemForm.quantity} onChange={(event) => setItemForm((current) => ({ ...current, quantity: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reorder Level</span>
                      <input type="number" min="0" value={itemForm.reorderLevel} onChange={(event) => setItemForm((current) => ({ ...current, reorderLevel: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit</span>
                      <input value={itemForm.unit} onChange={(event) => setItemForm((current) => ({ ...current, unit: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder="pcs / box / kg / meter" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preferred Supplier</span>
                      <select value={itemForm.preferredSupplierId} onChange={(event) => setItemForm((current) => ({ ...current, preferredSupplierId: event.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500">
                        <option value="">No Automatic PO</option>
                        {masters.suppliers.map(s => <option key={s._id} value={s._id}>{s.companyName}</option>)}
                      </select>
                    </label>
                  </div>

                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</span>
                    <textarea value={itemForm.description} onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 resize-none" placeholder="Short item description, specification, model details, or size information" />
                  </label>

                  <label className="space-y-2 block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes</span>
                    <textarea value={itemForm.notes} onChange={(event) => setItemForm((current) => ({ ...current, notes: event.target.value }))} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 resize-none" placeholder="Supplier note, internal remark, warranty note, or rack info" />
                  </label>

                  <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <input type="checkbox" checked={itemForm.isActive} onChange={(event) => setItemForm((current) => ({ ...current, isActive: event.target.checked }))} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active item</span>
                  </label>

                  <button type="submit" className="w-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3">
                    <Save size={16} />
                    {editingId ? "Update Item" : "Save Item"}
                  </button>
                  </div>
                </form>
              ) : null}


              <div className="grid max-w-full grid-cols-1 gap-6">
                  <div className="space-y-4">
                    {loading ? (
                      <div className="py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 animate-pulse">Loading inventory...</div>
                    ) : items.length === 0 ? (
                      <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[32px] bg-white">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">No inventory items added yet</p>
                      </div>
                    ) : (
                      <div className="flex h-full min-h-0 max-w-full flex-col overflow-hidden rounded-[34px] border border-slate-200/70 bg-white shadow-[0_32px_90px_-48px_rgba(15,23,42,0.45)]">
                        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_60%,#eef2ff_100%)] px-6 py-5">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Inventory Table</p>
                              <h4 className="mt-2 text-xl font-black tracking-tight text-slate-900">Clean item register with quick actions</h4>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              Click a row to preview details
                            </div>
                          </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto">
                          <table className="w-full table-fixed">
                            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                              <tr className="text-left">
                                <th className="w-[29%] px-6 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Item</th>
                                <th className="w-[14%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Category</th>
                                <th className="w-[12%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Stock</th>
                                <th className="w-[10%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Reorder</th>
                                <th className="w-[12%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Unit Cost</th>
                                <th className="w-[12%] px-4 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Value</th>
                                <th className="w-[11%] px-4 py-4 text-right text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {items.map((item) => {
                                const lowStock = Number(item.quantity || 0) <= Number(item.reorderLevel || 0);
                                const selected = selectedItemId === item._id;
                                return (
                                  <tr
                                    key={item._id}
                                    onClick={() => selectItem(item._id)}
                                    className={`cursor-pointer border-t border-slate-100 transition-all hover:bg-indigo-50/40 ${
                                      selected ? "bg-[linear-gradient(90deg,rgba(238,242,255,0.7),rgba(255,255,255,1))]" : lowStock ? "bg-rose-50/40" : "bg-white"
                                    }`}
                                  >
                                    <td className="px-6 py-4">
                                      <div className="flex min-w-0 items-center gap-3">
                                        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${selected ? "border-indigo-100 bg-indigo-600 text-white" : "border-indigo-100 bg-indigo-50 text-indigo-600"}`}>
                                          <Package size={17} />
                                        </div>
                                        <div className="min-w-0 overflow-hidden">
                                          <p className="truncate text-sm font-black uppercase tracking-tight text-slate-900">{item.name}</p>
                                          <p className="truncate text-[10px] font-black uppercase tracking-widest text-slate-400">{item.sku}</p>
                                          <p className="truncate text-[11px] font-bold text-slate-500">{item.brand || "No brand"}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-[11px] font-bold text-slate-600">
                                      <span className="block truncate">{item.categoryId?.name || item.category || "General"}</span>
                                      {item.subcategoryId?.name && <span className="block truncate text-[9px] text-slate-400">{item.subcategoryId.name}</span>}
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="truncate text-sm font-black text-slate-900">{item.quantity} <span className="text-[10px] uppercase tracking-widest text-slate-400">{item.unit}</span></div>
                                    </td>
                                    <td className="px-4 py-4 text-[11px] font-bold text-slate-600">{item.reorderLevel}</td>
                                    <td className="px-4 py-4 text-[11px] font-bold text-slate-600">
                                      <span className="block truncate">{formatCurrency(item.unitCost)}</span>
                                    </td>
                                    <td className="px-4 py-4 text-[11px] font-black text-slate-900">
                                      <span className="block truncate">{formatCurrency(Number(item.unitCost || 0) * Number(item.quantity || 0))}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="relative inline-flex justify-end" onClick={(event) => event.stopPropagation()}>
                                        <button
                                          type="button"
                                          onClick={() => setOpenActionMenuId((current) => current === item._id ? "" : item._id)}
                                          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-200 hover:text-indigo-600"
                                          aria-label={`Open actions for ${item.name}`}
                                        >
                                          <MoreHorizontal size={16} />
                                        </button>

                                        {openActionMenuId === item._id ? (
                                          <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)]">
                                            <button
                                              type="button"
                                              onClick={() => selectItem(item._id)}
                                              className="flex w-full items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                                            >
                                              <Eye size={14} />
                                              View
                                            </button>
                                             {!readOnly && canEditMaster && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setOpenActionMenuId("");
                                                    startEdit(item);
                                                  }}
                                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600"
                                                >
                                                  <Edit2 size={14} />
                                                  Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setOpenActionMenuId("");
                                                    handleDelete(item._id);
                                                  }}
                                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-rose-600 transition-all hover:bg-rose-50"
                                                >
                                                  <Trash2 size={14} />
                                                  Delete
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        ) : null}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Item View Drawer */}
                  {showViewDrawer && (
                    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                      <div 
                        className="absolute inset-0" 
                        onClick={() => setShowViewDrawer(false)}
                      />
                      <div className="relative w-full max-w-xl bg-white shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col h-full">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Inventory Intelligence</p>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">{selectedItem?.name || "Item Details"}</h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => loadItemView(selectedItemId)}
                              className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                            >
                              <RefreshCw size={16} />
                            </button>
                            <button 
                              onClick={() => setShowViewDrawer(false)}
                              className="p-3 rounded-2xl bg-slate-900 text-white hover:bg-black transition-all shadow-lg"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                          {viewLoading ? (
                            <div className="py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 animate-pulse">Loading item view...</div>
                          ) : viewData?.item ? (
                            <div className="space-y-6">
                              <div className="rounded-[32px] border border-indigo-100 bg-[linear-gradient(135deg,#eef2ff_0%,#ffffff_50%,#ecfeff_100%)] p-6 shadow-sm">
                                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500">Identity</p>
                                    <h5 className="text-2xl font-black tracking-tight text-slate-900">{viewData.item.name}</h5>
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{viewData.item.sku}</p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {(viewData.item.categoryId?.name || viewData.item.category) && <span className="px-3 py-1.5 bg-white/80 text-slate-600 text-[10px] font-black rounded-xl border border-white uppercase tracking-widest">{viewData.item.categoryId?.name || viewData.item.category}</span>}
                                      {viewData.item.brand && <span className="px-3 py-1.5 bg-white/80 text-slate-600 text-[10px] font-black rounded-xl border border-white uppercase tracking-widest">{viewData.item.brand}</span>}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 gap-3 sm:min-w-[200px]">
                                    <div className="rounded-2xl border border-white bg-white/50 px-4 py-3 shadow-sm">
                                      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">Available Stock</p>
                                      <p className="mt-1 text-2xl font-black text-slate-900">{viewData.item.quantity} <span className="text-xs text-slate-400">{viewData.item.unit}</span></p>
                                    </div>
                                    <div className="rounded-2xl border border-white bg-white/50 px-4 py-3 shadow-sm">
                                      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">Asset Value</p>
                                      <p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(Number(viewData.item.unitCost || 0) * Number(viewData.item.quantity || 0))}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reorder Level</p>
                                  <p className="mt-2 text-sm font-black text-slate-900">{viewData.item.reorderLevel} {viewData.item.unit}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Unit Cost</p>
                                  <p className="mt-2 text-sm font-black text-slate-900">{formatCurrency(viewData.item.unitCost)}</p>
                                </div>
                              </div>

                              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-4">
                                <div>
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Description</p>
                                  <p className="mt-2 text-xs font-bold text-slate-600 leading-relaxed">{viewData.item.description || "No descriptive data available."}</p>
                                </div>
                                {viewData.item.notes && (
                                  <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Internal Notes</p>
                                    <p className="mt-2 text-xs font-bold text-slate-600 leading-relaxed italic">{viewData.item.notes}</p>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                  <RefreshCw size={12} className="text-indigo-500" />
                                  Recent Movement Audit
                                </p>
                                <div className="space-y-3">
                                  {(viewData.movements || []).slice(0, 10).map((movement) => (
                                    <div key={movement._id} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm hover:border-indigo-100 transition-all">
                                      <div className="flex items-center justify-between gap-3 mb-3">
                                        <MovementBadge type={movement.type} />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{formatDate(movement.createdAt)}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <p className="text-[12px] font-black text-slate-900">Qty {movement.quantity} → {movement.balanceAfter}</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{movement.createdBy?.name || "System"}</p>
                                      </div>
                                      {(movement.notes || movement.reference) && (
                                        <p className="mt-2 text-[10px] font-bold text-slate-500 border-t border-slate-50 pt-2">{movement.notes || movement.reference}</p>
                                      )}
                                    </div>
                                  ))}
                                  {(!viewData.movements || viewData.movements.length === 0) && (
                                    <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">No history records</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="py-20 text-center">
                              <Package className="mx-auto text-slate-200 mb-4" size={48} />
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Failed to load item intelligence</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

          {["in", "out", "adjust"].includes(forcedTab) ? (
            <div className="premium-card p-6 bg-white border border-slate-100 rounded-[32px] space-y-6">
              <div className="space-y-1">
                <h3 className="heading-md">{forcedTab === "in" ? "Stock In" : forcedTab === "out" ? "Stock Out" : "Stock Adjustment"}</h3>
                <p className="small-label">
                  {forcedTab === "in"
                    ? "Receive stock and increase available quantity."
                    : forcedTab === "out"
                      ? "Issue stock and reduce available quantity."
                      : "Adjust stock using a positive or negative quantity."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <label className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Item</span>
                  <select value={movementForms[forcedTab].itemId} onChange={(event) => updateMovementForm(forcedTab, "itemId", event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500">
                    <option value="">Select item</option>
                    {items.map((item) => <option key={item._id} value={item._id}>{item.name} ({item.sku})</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantity</span>
                  <input type="number" value={movementForms[forcedTab].quantity} onChange={(event) => updateMovementForm(forcedTab, "quantity", event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder={forcedTab === "adjust" ? "Use -5 or 10" : "10"} />
                </label>
                <label className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference</span>
                  <input value={movementForms[forcedTab].reference} onChange={(event) => updateMovementForm(forcedTab, "reference", event.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500" placeholder="PO-102 or Issue slip" />
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes</span>
                <textarea value={movementForms[forcedTab].notes} onChange={(event) => updateMovementForm(forcedTab, "notes", event.target.value)} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 resize-none" />
              </label>

              {!readOnly && canPostMovements && (
                <button type="button" onClick={() => submitMovement(forcedTab)} className="w-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3">
                  {forcedTab === "in" ? <ArrowDownToLine size={16} /> : forcedTab === "out" ? <ArrowUpFromLine size={16} /> : <SlidersHorizontal size={16} />}
                  {forcedTab === "in" ? "Post Stock In" : forcedTab === "out" ? "Post Stock Out" : "Post Adjustment"}
                </button>
              )}
            </div>
          ) : null}

          {forcedTab === "history" ? (
            <div className="premium-card p-6 bg-white border border-slate-100 rounded-[32px] space-y-6">
              <div className="space-y-1">
                <h3 className="heading-md">Movement History</h3>
                <p className="small-label">All stock in, stock out, and adjustment records for this website.</p>
              </div>

              <div className="space-y-4">
                {filteredHistory.map((movement) => (
                  <article key={movement._id} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <MovementBadge type={movement.type} />
                          <span className="rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">{movement.itemId?.name || "Item removed"}</span>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-tight text-slate-900">Qty {movement.quantity} | Balance {movement.balanceAfter}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{movement.reference || "No reference"}</p>
                        <p className="text-xs font-bold text-slate-500">{movement.notes || "No notes added."}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">{formatDate(movement.createdAt)}</p>
                        <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{movement.createdBy?.name || "Unknown user"}</p>
                      </div>
                    </div>
                  </article>
                ))}

                {!loading && filteredHistory.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[32px] bg-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">No movement history found</p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {forcedTab === "inventory-category" ? (
            <MasterManager type="category" websiteId={websiteId} title="Inventory Master" label="Category" />
          ) : null}

          {forcedTab === "inventory-subcategory" ? (
            <MasterManager type="subcategory" websiteId={websiteId} title="Inventory Master" label="Subcategory" />
          ) : null}

          {forcedTab === "inventory-size" ? (
            <MasterManager type="size" websiteId={websiteId} title="Inventory Master" label="Size" />
          ) : null}

          {forcedTab === "inventory-color" ? (
            <MasterManager type="color" websiteId={websiteId} title="Inventory Master" label="Color" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
