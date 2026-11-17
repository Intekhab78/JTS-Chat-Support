import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Tag, Search, Layers, Package, DollarSign, Filter, ArrowUpDown, TrendingUp, Download, Printer, Pencil, X } from "lucide-react";
import { api } from "../../api/client.js";
import { useCurrency } from "../../context/CurrencyContext.jsx";
import ConfirmModal from "../ConfirmModal.jsx";
import { exportToCSV, exportToPDF, exportSingleRecordPDF } from "../../utils/exportUtils.js";
import { formatCurrency } from "../../utils/currencyFormatter.js";

const EMPTY_PRODUCT_FORM = {
  sku: "", name: "", type: "product", category: "", price: 0, cost: 0, taxRate: 5, brand: "", unit: "pcs", description: ""
};

export default function CrmProductsView({ websiteId }) {
  const { currencySymbol = "$" } = useCurrency();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [savingProduct, setSavingProduct] = useState(false);

  // Variant State
  const [showAddVariantForm, setShowAddVariantForm] = useState(false);
  const [variantForm, setVariantForm] = useState({
    sku: "",
    variantName: "",
    price: 0,
    costPrice: 0,
    stockQuantity: 0
  });

  const handleAddVariantSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct?._id) return;
    try {
      const updated = await api(`/api/crm/products/${selectedProduct._id}/variants`, {
        method: "POST",
        body: JSON.stringify(variantForm)
      });
      setSelectedProduct(updated);
      setShowAddVariantForm(false);
      setVariantForm({ sku: "", variantName: "", price: 0, costPrice: 0, stockQuantity: 0 });
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to add variant");
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!selectedProduct?._id || !variantId) return;
    try {
      const updated = await api(`/api/crm/products/${selectedProduct._id}/variants/${variantId}`, {
        method: "DELETE"
      });
      setSelectedProduct(updated);
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to delete variant");
    }
  };

  // Confirmation modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qWebsite = (websiteId && websiteId !== "undefined" && websiteId !== "null") ? `websiteId=${websiteId}&` : "";
      const prodRes = await api(`/api/crm/products?${qWebsite}search=${encodeURIComponent(search)}`);
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
      .catch(() => { });
  }, [websiteId]);

  useEffect(() => {
    fetchData();
  }, [websiteId, search]);

  const defaultTaxRate = useMemo(() => {
    if (taxMasters.length > 0) {
      const first = taxMasters[0];
      return first.rate !== undefined ? Number(first.rate) : Number(first.taxRate ?? 0);
    }
    return 5;
  }, [taxMasters]);

  // Computed KPI Metrics for Dashboard
  const metrics = useMemo(() => {
    const totalCount = products.length;
    const totalValuation = products.reduce((acc, p) => acc + Number(p.price || 0), 0);
    const avgPrice = totalCount > 0 ? Math.round(totalValuation / totalCount) : 0;
    const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean)).size;
    const serviceCount = products.filter(p => p.type === "service").length;
    const productCount = totalCount - serviceCount;
    return { totalCount, totalValuation, avgPrice, uniqueCategories, serviceCount, productCount };
  }, [products]);

  // Unique category list extracted dynamically
  const categoryOptions = useMemo(() => {
    const set = new Set();
    products.forEach(p => { if (p.category) set.add(p.category); });
    categories.forEach(c => { if (c.name) set.add(c.name); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products, categories]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === "all" || (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
      const matchType = selectedType === "all" || ((p.type || "product").toLowerCase() === selectedType.toLowerCase());
      return matchCat && matchType;
    }).sort((a, b) => {
      if (sortBy === "price_low") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price_high") return (b.price || 0) - (a.price || 0);
      if (sortBy === "sku") return (a.sku || "").localeCompare(b.sku || "");
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [products, selectedCategory, selectedType, sortBy]);

  const openCreateForm = () => {
    setEditingProductId(null);
    setProductForm({ ...EMPTY_PRODUCT_FORM, taxRate: defaultTaxRate });
    setShowProductForm(true);
  };

  const openEditForm = (product) => {
    setEditingProductId(product._id);
    setProductForm({
      sku: product.sku || "",
      name: product.name || "",
      type: product.type || "product",
      category: product.category || "",
      price: Number(product.price || 0),
      cost: Number(product.costPrice ?? product.cost ?? 0),
      taxRate: product.taxRate !== undefined ? Number(product.taxRate) : defaultTaxRate,
      brand: product.brand || "",
      unit: product.unit || "pcs",
      description: product.description || ""
    });
    setShowProductForm(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const payload = { ...productForm, costPrice: productForm.cost, websiteId };
      if (editingProductId) {
        const updated = await api(`/api/crm/products/${editingProductId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        if (selectedProduct?._id === editingProductId) {
          setSelectedProduct(updated);
        }
      } else {
        await api(`/api/crm/products`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setShowProductForm(false);
      setEditingProductId(null);
      setProductForm({ ...EMPTY_PRODUCT_FORM, taxRate: defaultTaxRate });
      fetchData();
    } catch (err) {
      alert(err.message || "Failed to save product");
    } finally {
      setSavingProduct(false);
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

  const handleExportProductsCSV = () => {
    const data = filteredProducts.map(p => ({
      "SKU": p.sku || "-",
      "Product / Service Name": p.name || "-",
      "Category": p.category || "General",
      "Type": p.type || "product",
      [`Price (${currencySymbol})`]: p.price || 0,
      [`Cost Price (${currencySymbol})`]: p.costPrice ?? p.cost ?? 0,
      "Tax Rate (%)": p.taxRate ?? defaultTaxRate,
      "Unit": p.unit || "pcs"
    }));
    exportToCSV(data, `Products_Catalog_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportProductsPDF = () => {
    const data = filteredProducts.map(p => ({
      "SKU": p.sku || "-",
      "Name": p.name || "-",
      "Category": p.category || "General",
      "Type": (p.type || "product").toUpperCase(),
      [`Price (${currencySymbol})`]: p.price || 0,
      "Tax (%)": p.taxRate ?? defaultTaxRate
    }));
    exportToPDF(data, `Products_Catalog_${new Date().toISOString().slice(0, 10)}`, "PRODUCTS & SERVICES CATALOG REPORT");
  };

  return (
    <div className="space-y-3">
      {/* Compact KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Package size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Catalog Items</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-extrabold text-slate-900">{metrics.totalCount}</span>
              <span className="text-[9px] font-semibold text-slate-400 truncate">
                {metrics.productCount}P • {metrics.serviceCount}S
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <DollarSign size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Catalog Valuation</span>
            <span className="text-sm font-extrabold text-slate-900">{formatCurrency(metrics.totalValuation)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Avg Item Price</span>
            <span className="text-sm font-extrabold text-slate-900">{formatCurrency(metrics.avgPrice)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 px-3.5 py-2.5 rounded-xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center shrink-0">
            <Layers size={15} />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Active Categories</span>
            <span className="text-sm font-extrabold text-slate-900">{metrics.uniqueCategories} Categories</span>
          </div>
        </div>
      </div>

      {/* Compact Filter & Action Bar */}
      <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl shadow-xs flex flex-col lg:flex-row gap-2 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, name, brand…"
            className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50/60 text-[11px] font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full lg:w-auto flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:flex-initial sm:w-28">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-8 pl-2.5 pr-6 rounded-lg border border-slate-200 bg-slate-50/60 text-[10.5px] font-bold text-slate-700 outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="product">Products</option>
              <option value="service">Services</option>
            </select>
            <Filter size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 sm:flex-initial sm:w-36">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-8 pl-2.5 pr-6 rounded-lg border border-slate-200 bg-slate-50/60 text-[10.5px] font-bold text-slate-700 outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <Filter size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 sm:flex-initial sm:w-32">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-8 pl-2.5 pr-6 rounded-lg border border-slate-200 bg-slate-50/60 text-[10.5px] font-bold text-slate-700 outline-none appearance-none cursor-pointer"
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="price_low">Price (Low-High)</option>
              <option value="price_high">Price (High-Low)</option>
              <option value="sku">SKU Code</option>
            </select>
            <ArrowUpDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={handleExportProductsCSV}
            className="h-8 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[9.5px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
            title="Export Products Catalog to CSV"
          >
            <Download size={12} /> CSV
          </button>
          <button
            onClick={handleExportProductsPDF}
            className="h-8 px-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[9.5px] font-extrabold uppercase tracking-wider rounded-lg flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
            title="Export Products Catalog to PDF"
          >
            <Printer size={12} /> PDF
          </button>

          <button
            onClick={openCreateForm}
            className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-[9.5px] font-extrabold uppercase tracking-wider text-white rounded-lg flex items-center justify-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus size={13} /> Add Item
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-slate-50 border border-slate-200/80 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200/80 rounded-2xl py-12 text-center text-slate-400 font-bold text-[11px] uppercase tracking-wider">
              No products found matching filters.
            </div>
          ) : (
            filteredProducts.map(p => {
              const isService = (p.type || "product").toLowerCase() === "service";
              return (
                <div
                  key={p._id}
                  onClick={() => setSelectedProduct(p)}
                  className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all group"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-1.5">
                      <span className="text-[9px] font-mono font-bold uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 truncate max-w-[130px]">
                        {p.sku}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {p.hasVariants && (
                          <span className="text-[8px] font-extrabold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            {p.variantItems?.length || 0} Var
                          </span>
                        )}
                        <span className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${isService
                          ? "text-violet-700 bg-violet-50 border-violet-200"
                          : "text-sky-700 bg-sky-50 border-sky-200"
                          }`}>
                          {p.type || "product"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[11.5px] font-extrabold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors truncate">
                        {p.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50/70 px-1.5 py-0.5 rounded">
                          {p.category || "General"}
                        </span>
                        {p.brand && (
                          <span className="text-[9px] font-semibold text-slate-400 uppercase truncate">
                            • {p.brand}
                          </span>
                        )}
                        {p.taxRate !== undefined && (
                          <span className="text-[8.5px] font-semibold text-slate-400">
                            • {p.taxRate}% VAT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-3 pt-2.5 border-t border-slate-100">
                    <div>
                      <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block">Starting Price</span>
                      <span className="text-xs font-extrabold text-indigo-600 tabular-nums">
                        ${p.price ? Number(p.price).toLocaleString() : 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditForm(p); }}
                        className="w-6 h-6 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit Product"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); confirmDelete(p._id); }}
                        className="w-6 h-6 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Product Details Modal with Variant Manager */}
      {selectedProduct && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setSelectedProduct(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-3 border-slate-100">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-mono font-bold uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">{selectedProduct.sku}</span>
                  <span className="text-[9px] font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{selectedProduct.type || "product"}</span>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${selectedProduct.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{selectedProduct.status || 'Active'}</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 leading-snug pt-0.5">{selectedProduct.name}</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-7 h-7 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Category & Brand info */}
            <div className="grid grid-cols-3 gap-2.5 bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <div>
                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                <span className="text-[11px] font-extrabold text-indigo-600">{selectedProduct.category || "General"}</span>
              </div>
              <div>
                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Brand</span>
                <span className="text-[11px] font-bold text-slate-800">{selectedProduct.brand || "—"}</span>
              </div>
              <div>
                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Unit</span>
                <span className="text-[11px] font-bold text-slate-800 uppercase">{selectedProduct.unit || "pcs"}</span>
              </div>
            </div>

            {/* Price & Tax details */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-center">
                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Base Price</span>
                <span className="text-xs font-extrabold text-indigo-700">{formatCurrency(selectedProduct.price || 0)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Cost Price</span>
                <span className="text-xs font-bold text-slate-700">{formatCurrency(selectedProduct.costPrice ?? selectedProduct.cost ?? 0)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">VAT / Tax</span>
                <span className="text-xs font-bold text-slate-700">{selectedProduct.taxRate !== undefined ? selectedProduct.taxRate : defaultTaxRate}%</span>
              </div>
            </div>

            {/* Variant Section */}
            <div className="space-y-2.5 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-900 tracking-wide flex items-center gap-1.5">
                  <Tag size={12} className="text-indigo-600" />
                  Variants ({selectedProduct.variantItems?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddVariantForm(!showAddVariantForm);
                    setVariantForm({
                      sku: `${selectedProduct.sku}-V${(selectedProduct.variantItems?.length || 0) + 1}`,
                      variantName: "",
                      price: selectedProduct.price || 0,
                      costPrice: selectedProduct.costPrice ?? selectedProduct.cost ?? 0,
                      stockQuantity: 0
                    });
                  }}
                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition-colors border border-indigo-200 cursor-pointer"
                >
                  <Plus size={11} /> Add Variant
                </button>
              </div>

              {showAddVariantForm && (
                <form onSubmit={handleAddVariantSubmit} className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-2.5">
                  <span className="text-[9px] font-extrabold uppercase text-indigo-600 tracking-wider block">Create Variant</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Variant SKU"
                      value={variantForm.sku}
                      onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-bold outline-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Variant Name"
                      value={variantForm.variantName}
                      onChange={(e) => setVariantForm({ ...variantForm, variantName: e.target.value })}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8.5px] font-bold uppercase text-slate-400 mb-0.5">Price ({currencySymbol})</label>
                      <input
                        type="number"
                        required
                        value={variantForm.price}
                        onChange={(e) => setVariantForm({ ...variantForm, price: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8.5px] font-bold uppercase text-slate-400 mb-0.5">Stock Qty</label>
                      <input
                        type="number"
                        value={variantForm.stockQuantity}
                        onChange={(e) => setVariantForm({ ...variantForm, stockQuantity: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowAddVariantForm(false)}
                      className="px-2.5 py-1 text-[9px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 rounded-md cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-extrabold uppercase rounded-md shadow-xs cursor-pointer"
                    >
                      Save Variant
                    </button>
                  </div>
                </form>
              )}

              {(!selectedProduct.variantItems || selectedProduct.variantItems.length === 0) ? (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center text-[10.5px] font-semibold text-slate-400">
                  No variants defined yet.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedProduct.variantItems.map((v) => (
                    <div key={v._id || v.sku} className="px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-center justify-between text-[11px]">
                      <div className="min-w-0">
                        <span className="font-mono text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 mr-2">{v.sku}</span>
                        <span className="font-bold text-slate-900">{v.variantName}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-extrabold text-indigo-600">{formatCurrency(v.price || 0)}</span>
                        {v._id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteVariant(v._id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded cursor-pointer"
                            title="Remove Variant"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => openEditForm(selectedProduct)}
                className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-extrabold uppercase flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                onClick={() => {
                  exportSingleRecordPDF(
                    `PRODUCT SPECIFICATION - ${selectedProduct.name}`,
                    {
                      "Product Name": selectedProduct.name,
                      "SKU Code": selectedProduct.sku || "-",
                      "Category": selectedProduct.category || "General",
                      "Type": (selectedProduct.type || "Product").toUpperCase(),
                      "Price": formatCurrency(selectedProduct.price || 0),
                      "Cost Price": (selectedProduct.costPrice ?? selectedProduct.cost) ? formatCurrency(selectedProduct.costPrice ?? selectedProduct.cost) : "-",
                      "Description": selectedProduct.description || "-",
                      "Total Variants": selectedProduct.variantItems?.length || 0
                    },
                    `Product_Spec_${(selectedProduct.sku || selectedProduct.name || "Record").replace(/\s+/g, '_')}`
                  );
                }}
                className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-extrabold uppercase flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Printer size={12} /> PDF
              </button>
              <button
                onClick={() => confirmDelete(selectedProduct._id)}
                className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-extrabold uppercase flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 size={12} /> Delete
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-extrabold uppercase transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit Product Form Modal */}
      {showProductForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowProductForm(false)} />
          <form onSubmit={handleSaveProduct} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-3 border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2.5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {editingProductId ? "Edit Catalog Item" : "Add Catalog Item"}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">SKU</label>
                <input required placeholder="e.g. SKU-101" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-[11px] font-mono font-bold outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Type</label>
                <select value={productForm.type} onChange={(e) => setProductForm({ ...productForm, type: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-[11px] font-bold outline-none focus:border-indigo-400">
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Name</label>
              <input required placeholder="e.g. Cloud ERP Setup or Dell Monitor" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-[11px] font-bold outline-none focus:border-indigo-400" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                <input list="crm-product-categories" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} placeholder="e.g. Hardware" className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-[11px] font-bold outline-none focus:border-indigo-400" />
                <datalist id="crm-product-categories">
                  {categoryOptions.map(cat => <option key={cat} value={cat} />)}
                </datalist>
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Brand</label>
                <input value={productForm.brand} onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })} placeholder="e.g. Dell" className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-[11px] font-bold outline-none focus:border-indigo-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Base Price ({currencySymbol})</label>
                <input type="number" required value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-[11px] font-bold outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cost Price ({currencySymbol})</label>
                <input type="number" value={productForm.cost} onChange={(e) => setProductForm({ ...productForm, cost: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-[11px] font-bold outline-none focus:border-indigo-400" />
              </div>
            </div>

            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">VAT Rate (%)</label>
              <select
                value={productForm.taxRate !== undefined ? productForm.taxRate : defaultTaxRate}
                onChange={(e) => setProductForm({ ...productForm, taxRate: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-[11px] font-bold outline-none focus:border-indigo-400"
              >
                {taxMasters.length > 0 ? (
                  taxMasters.map(tm => (
                    <option key={tm._id} value={tm.rate !== undefined ? tm.rate : tm.taxRate}>
                      {tm.name} ({tm.rate !== undefined ? tm.rate : tm.taxRate}%)
                    </option>
                  ))
                ) : (
                  <>
                    <option value="5">Standard (5%)</option>
                    <option value="0">Zero / Exempt (0%)</option>
                  </>
                )}
              </select>
            </div>

            <button
              type="submit"
              disabled={savingProduct}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-extrabold uppercase tracking-wider cursor-pointer transition-colors"
            >
              {savingProduct ? "Saving…" : editingProductId ? "Save Changes" : "Create Item"}
            </button>
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
