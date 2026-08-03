import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Tag, Search, ShoppingBag, Layers, Package, DollarSign, Filter, SlidersHorizontal, ArrowUpDown, TrendingUp, X } from "lucide-react";
import { api } from "../../api/client.js";
import ConfirmModal from "../ConfirmModal.jsx";

export default function CrmProductsView({ websiteId }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({
    sku: "", name: "", type: "product", category: "", price: 0, cost: 0, taxRate: 18, brand: "", unit: "pcs"
  });

  const [categoryForm, setCategoryForm] = useState({ name: "", parentId: "" });

  // Confirmation modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qWebsite = (websiteId && websiteId !== "undefined" && websiteId !== "null") ? `websiteId=${websiteId}&` : "";
      const prodRes = await api(`/api/crm/products?${qWebsite}search=${search}`);
      setProducts(prodRes.products || []);

      const catRes = await api(`/api/crm/products/categories?${qWebsite}`);
      setCategories(catRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [taxMasters, setTaxMasters] = useState([]);

  useEffect(() => {
    if (!websiteId) return;
    api(`/api/inventory/masters/tax?websiteId=${websiteId}`)
      .then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setTaxMasters(res);
        }
      })
      .catch(() => {});
  }, [websiteId]);

  useEffect(() => {
    fetchData();
  }, [websiteId, search]);

  // Computed KPI Metrics for Dashboard
  const metrics = useMemo(() => {
    const totalCount = products.length;
    const totalValuation = products.reduce((acc, p) => acc + (p.price || 0), 0);
    const avgPrice = totalCount > 0 ? Math.round(totalValuation / totalCount) : 0;
    const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean)).size;
    return { totalCount, totalValuation, avgPrice, uniqueCategories };
  }, [products]);

  // Unique category list extracted dynamically
  const categoryOptions = useMemo(() => {
    const set = new Set();
    products.forEach(p => { if (p.category) set.add(p.category); });
    categories.forEach(c => { if (c.name) set.add(c.name); });
    return Array.from(set);
  }, [products, categories]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === "all" || (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
      const matchType = selectedType === "all" || (p.type && p.type.toLowerCase() === selectedType.toLowerCase());
      return matchCat && matchType;
    }).sort((a, b) => {
      if (sortBy === "price_low") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price_high") return (b.price || 0) - (a.price || 0);
      if (sortBy === "sku") return (a.sku || "").localeCompare(b.sku || "");
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [products, selectedCategory, selectedType, sortBy]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/products`, {
        method: "POST",
        body: JSON.stringify({ ...productForm, websiteId })
      });
      setShowProductForm(false);
      setProductForm({ sku: "", name: "", type: "product", category: "", price: 0, cost: 0, taxRate: 18, brand: "", unit: "pcs" });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const confirmDelete = (id) => {
    setDeletingProductId(id);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!deletingProductId) return;
    setDeleting(true);
    try {
      await api(`/api/crm/products/${deletingProductId}`, { method: "DELETE" });
      if (selectedProduct?._id === deletingProductId) {
        setSelectedProduct(null);
      }
      fetchData();
      setShowDeleteConfirm(false);
      setDeletingProductId(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Product Analytics Dashboard KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-[24px] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Package size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Total Catalog Items</span>
            <span className="text-lg font-black text-slate-900">{metrics.totalCount} Products</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-[24px] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Catalog Valuation</span>
            <span className="text-lg font-black text-slate-900">${metrics.totalValuation.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-[24px] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Avg Product Price</span>
            <span className="text-lg font-black text-slate-900">${metrics.avgPrice.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-[24px] shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Layers size={20} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Active Categories</span>
            <span className="text-lg font-black text-slate-900">{metrics.uniqueCategories} Categories</span>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-[28px] shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by SKU or name…"
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
        </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-44">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Sort By */}
            <div className="relative flex-1 lg:w-40">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer"
              >
                <option value="name_asc">Name (A-Z)</option>
                <option value="price_low">Price (Low-High)</option>
                <option value="price_high">Price (High-Low)</option>
                <option value="sku">SKU Code</option>
              </select>
              <ArrowUpDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Add Product Button */}
            <button
              onClick={() => setShowProductForm(true)}
              className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase text-white rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 transition-all shrink-0"
            >
              <Plus size={14} /> Add Product
            </button>
          </div>
        </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-44 bg-slate-50 border rounded-[28px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200/80 rounded-[30px] py-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
              No products found matching filters.
            </div>
          ) : (
            filteredProducts.map(p => (
              <div
                key={p._id}
                onClick={() => setSelectedProduct(p)}
                className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded tracking-wide border border-indigo-100">{p.sku}</span>
                    <span className="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded capitalize">{p.type || "product"}</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">{p.name}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] font-black text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-full">{p.category || "General"}</span>
                      {p.brand && <span className="text-[9px] font-bold text-slate-400 uppercase">• {p.brand}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-end mt-6 pt-4 border-t border-slate-100">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Price</span>
                    <span className="text-xs font-black text-indigo-600">${p.price ? p.price.toLocaleString() : 0}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); confirmDelete(p._id); }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-[32px] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto z-10 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4 border-slate-100">
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full tracking-wide">{selectedProduct.sku}</span>
                  <span className="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded capitalize">{selectedProduct.type || "product"}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${selectedProduct.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>{selectedProduct.status || 'Active'}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-tight pt-1">{selectedProduct.name}</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-all shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Category & Brand info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Category</span>
                <span className="text-xs font-black text-indigo-600">{selectedProduct.category || "General Category"}</span>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Brand / Manufacturer</span>
                <span className="text-xs font-black text-slate-800">{selectedProduct.brand || "Generic"}</span>
              </div>
            </div>

            {/* Price & Tax details */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Base Price</span>
                <span className="text-sm font-black text-indigo-700">${selectedProduct.price ? selectedProduct.price.toLocaleString() : 0}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Cost Price</span>
                <span className="text-xs font-bold text-slate-700">${selectedProduct.cost ? selectedProduct.cost.toLocaleString() : 0}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">VAT / Tax Rate</span>
                <span className="text-xs font-bold text-slate-700">{selectedProduct.taxRate !== undefined ? selectedProduct.taxRate : 5}% VAT</span>
              </div>
            </div>

            {/* Additional specifications */}
            <div className="space-y-3 text-xs font-bold text-slate-600 border-t border-slate-100 pt-4">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Unit of Measure:</span>
                <span className="font-black text-slate-800 uppercase">{selectedProduct.unit || "pcs"}</span>
              </div>
              {selectedProduct.hsnSacCode && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">HSN / SAC Code:</span>
                  <span className="font-black text-slate-800">{selectedProduct.hsnSacCode}</span>
                </div>
              )}
              {selectedProduct.barcode && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Barcode / Serial:</span>
                  <span className="font-black text-slate-800">{selectedProduct.barcode}</span>
                </div>
              )}
            </div>

            {/* Description */}
            {(selectedProduct.description || selectedProduct.shortDescription) && (
              <div className="space-y-1 border-t border-slate-100 pt-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Description & Specs</span>
                <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedProduct.description || selectedProduct.shortDescription}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => confirmDelete(selectedProduct._id)}
                className="py-3 px-5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-black uppercase flex items-center gap-1.5 transition-all"
              >
                <Trash2 size={14} /> Delete Product
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Product Form Modal */}
      {showProductForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowProductForm(false)} />
          <form onSubmit={handleCreateProduct} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl space-y-6 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-4 border-slate-100">
              <h3 className="text-base font-black text-slate-900">Add Product</h3>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-all shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SKU</label>
                <input required value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Name</label>
                <input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Base Price</label>
                <input type="number" required value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">VAT Rate (%)</label>
                <select
                  value={productForm.taxRate !== undefined ? productForm.taxRate : 5}
                  onChange={(e) => setProductForm({ ...productForm, taxRate: Number(e.target.value) })}
                  className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold outline-none"
                >
                  {taxMasters.length > 0 ? (
                    taxMasters.map(tm => (
                      <option key={tm._id} value={tm.rate !== undefined ? tm.rate : tm.taxRate}>
                        {tm.name} ({tm.rate !== undefined ? tm.rate : tm.taxRate}%)
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="5">Standard Rate (5% VAT)</option>
                      <option value="0">Zero Rated (0% VAT)</option>
                      <option value="0">Exempt (0% VAT)</option>
                      <option value="9">Corporate Tax (9%)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-indigo-100 transition-all">Create Product</button>
          </form>
        </div>,
        document.body
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Product"
        message="Are you sure you want to delete this product permanently? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={executeDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeletingProductId(null); }}
      />
    </div>
  );
}
