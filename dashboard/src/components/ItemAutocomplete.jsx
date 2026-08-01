import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, CheckCircle, Package, Search, AlertCircle, X } from "lucide-react";
import { api } from "../api/client.js";
import { getCurrencySymbol, formatCurrency } from "../utils/currencyFormatter.js";

export function QuickCreateItemModal({ initialName, websiteId, onCreated, onClose }) {
  const [form, setForm] = useState({ name: initialName || "", sku: "", unitCost: "", unit: "pcs", category: "", quantity: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await api.post("/api/inventory/items", {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        unitCost: Number(form.unitCost) || 0,
        unit: form.unit || "pcs",
        category: form.category.trim(),
        quantity: Number(form.quantity) || 0,
        websiteId,
      });
      onCreated(created);
    } catch (err) {
      setError(err.message || "Failed to create item.");
    } finally {
      setSaving(false);
    }
  };

  const inp = "w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Inventory</p>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">Quick Add Item</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Item Name *</label>
              <input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Wireless Mouse" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">SKU *</label>
              <input className={inp} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} required placeholder="e.g. WM-001" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Unit</label>
              <select className={inp} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {["pcs","kg","ltr","box","set","m","hr"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Unit Cost ({getCurrencySymbol()})</label>
              <input className={inp} type="number" min="0" value={form.unitCost} onChange={e => setForm(f => ({ ...f, unitCost: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Opening Stock</label>
              <input className={inp} type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Category</label>
              <input className={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Electronics" />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              <AlertCircle size={12} className="text-rose-500 flex-shrink-0" />
              <p className="text-[10px] font-bold text-rose-600">{error}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-60">
              {saving ? "Saving…" : "Create & Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ItemAutocomplete({ value, onChange, onSelect, websiteId, placeholder, onCreateNew }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Sync external value changes (e.g. template buttons)
  useEffect(() => { setQuery(value || ""); }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback(async (q) => {
    setLoading(true);
    setSearched(false);
    try {
      const params = new URLSearchParams();
      if (q && q.trim().length > 0) params.append("q", q.trim());
      if (websiteId) params.append("websiteId", websiteId);
      const results = await api.get(`/api/inventory/search?${params}`);
      setSuggestions(Array.isArray(results) ? results : []);
      setOpen(true);
      setHighlighted(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [websiteId]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 200);
  };

  const handleSelect = (item) => {
    setQuery(item.name);
    setSuggestions([]);
    setOpen(false);
    setSearched(false);
    onSelect(item);
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); handleSelect(suggestions[highlighted]); }
    if (e.key === "Escape") { setOpen(false); }
  };

  // Show dropdown when open and not loading
  const hasResults = suggestions.length > 0;
  const showDropdown = open && !loading;

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold outline-none focus:border-indigo-400 transition-colors cursor-pointer"
        placeholder={placeholder || "Click to select or search items..."}
        value={query}
        onChange={handleChange}
        onFocus={() => { search(query); }}
        onClick={() => { if (!open) search(query); }}
        onKeyDown={handleKeyDown}
        required
      />
      {loading && <div className="absolute right-3 top-2.5"><div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div></div>}

      {showDropdown && (
        <ul className="absolute z-[9999] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-left max-h-60 overflow-y-auto">
          {hasResults ? (
            suggestions.map((item, i) => (
              <li
                key={item._id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlighted(i)}
                className={`px-4 py-3 cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${i === highlighted ? "bg-indigo-50" : "hover:bg-slate-50"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-[11px] font-black ${i === highlighted ? "text-indigo-900" : "text-slate-900"}`}>{item.name}</p>
                      {item.variantName && (
                        <span className="text-[8px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {item.variantName}
                        </span>
                      )}
                    </div>
                    {item.sku && <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{item.sku}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-slate-700">{formatCurrency(item.unitCost || 0)}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Stock: {item.quantity || 0} {item.unit || "pcs"}</p>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="p-4 text-center">
              <p className="text-[11px] font-bold text-slate-500 mb-3">You don't have any records yet. Create your first item to get started..</p>
              {onCreateNew && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onCreateNew(query);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                >
                  <Plus size={12} /> Create "{query}"
                </button>
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
