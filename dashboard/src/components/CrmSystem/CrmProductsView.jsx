import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Tag, Search, ShoppingBag, FolderOpen, Layers } from "lucide-react";
import { api } from "../../api/client.js";
import ConfirmModal from "../ConfirmModal.jsx";

export default function CrmProductsView({ websiteId }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({
    sku: "", name: "", type: "product", category: "", price: 0, cost: 0, taxRate: 18, brand: "", unit: "pcs"
  });

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", parentId: "" });

  // Confirmation modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const prodRes = await api(`/api/crm/products?websiteId=${websiteId}&search=${search}`);
      setProducts(prodRes.products || []);

      const catRes = await api(`/api/crm/products/categories?websiteId=${websiteId}`);
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

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/crm/products/categories`, {
        method: "POST",
        body: JSON.stringify({ ...categoryForm, websiteId })
      });
      setShowCategoryForm(false);
      setCategoryForm({ name: "", parentId: "" });
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
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by SKU or name…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowCategoryForm(true)}
            className="flex-1 md:flex-initial py-3 px-5 border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase text-slate-700 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
          >
            <FolderOpen size={14} /> Add Category
          </button>
          <button
            onClick={() => setShowProductForm(true)}
            className="flex-1 md:flex-initial py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-100 transition-all"
          >
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-44 bg-slate-50 border rounded-[28px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Hierarchical List */}
          <div className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5 border-b pb-3 border-slate-100">
              <Layers size={14} className="text-indigo-500" /> Categories Tree
            </h4>
            {categories.length === 0 ? (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4">No categories set.</p>
            ) : (
              <div className="space-y-2">
                {categories.map(c => (
                  <div key={c._id} className="text-xs font-bold text-slate-600 pl-2 border-l-2 border-slate-100 hover:text-indigo-600 transition-colors">
                    {c.path}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Products Catalog Display Grid */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {products.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-200/80 rounded-[30px] py-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                No products found matching query.
              </div>
            ) : (
              products.map(p => (
                <div key={p._id} className="bg-white border border-slate-200/80 rounded-[30px] p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded tracking-wide">{p.sku}</span>
                      <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded capitalize">{p.type}</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 leading-snug">{p.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{p.brand || "Generics"}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-6 pt-4 border-t border-slate-100">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Price</span>
                      <span className="text-xs font-black text-indigo-600">${p.price}</span>
                    </div>
                    <button onClick={() => confirmDelete(p._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowProductForm(false)} />
          <form onSubmit={handleCreateProduct} className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Add Product</h3>
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
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Create Product</button>
          </form>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowCategoryForm(false)} />
          <form onSubmit={handleCreateCategory} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Add Category</h3>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category Name</label>
              <input required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Parent Category ID (Optional)</label>
              <input value={categoryForm.parentId} onChange={(e) => setCategoryForm({ ...categoryForm, parentId: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Create Category</button>
          </form>
        </div>
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
