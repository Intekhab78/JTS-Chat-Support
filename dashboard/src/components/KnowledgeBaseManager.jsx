import React, { useState, useEffect } from "react";
import { Book, Plus, Edit2, Trash2, Check, X, Search, Tag } from "lucide-react";
import { api } from "../api/client.js";

export default function HelpCenterManager({ websiteId }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ title: "", content: "", tags: [], categoryId: "" });
  const [editingId, setEditingId] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchData();
  }, [websiteId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Ensure backend routes for this are actually built! If not, this is a mock representation
      // We will need to build the `/api/knowledge-base` endpoints later.
      const arts = await api(`/api/knowledge-base/articles?websiteId=${websiteId}`).catch(() => []);
      const cats = await api(`/api/knowledge-base/categories?websiteId=${websiteId}`).catch(() => []);
      setArticles(arts);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (article) => {
    setFormData({
      title: article.title || "",
      content: article.content || "",
      tags: article.tags || [],
      categoryId: article.categoryId?._id || article.categoryId || "",
      websiteId: article.websiteId || ""
    });
    setEditingId(article._id);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const method = editingId ? "PUT" : "POST";
      const endpoint = editingId 
        ? `/api/knowledge-base/articles/${editingId}`
        : `/api/knowledge-base/articles`;
      
      const payload = { ...formData, websiteId: websiteId || formData.websiteId };
      const saved = await api(endpoint, { method, body: JSON.stringify(payload) });
      
      if (editingId) {
        setArticles(articles.map(a => a._id === editingId ? saved : a));
      } else {
        setArticles([saved, ...articles]);
      }
      setIsEditing(false);
      setEditingId(null);
    } catch (e) {
      alert("Failed to save article: " + e.message);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-100 dark:border-white/5 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="heading-md dark:text-white">{editingId ? "Edit Article" : "New Article"}</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold text-xs uppercase tracking-widest px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
            >
              <Check size={16} /> Save Article
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="small-label dark:text-slate-400">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none"
                placeholder="How to reset your password"
              />
            </div>
            <div>
              <label className="small-label dark:text-slate-400">Content</label>
              <textarea
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-white outline-none min-h-[300px]"
                placeholder="Write your article content here..."
              />
            </div>
          </div>
          <div className="space-y-4">
             <div>
              <label className="small-label dark:text-slate-400">Category</label>
              <select
                value={formData.categoryId}
                onChange={e => setFormData({...formData, categoryId: e.target.value})}
                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-white outline-none"
              >
                <option value="">Select Category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
              <label className="small-label dark:text-slate-400">Create New Category</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Category Name"
                  id="new-category-input"
                  className="flex-1 bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const el = document.getElementById("new-category-input");
                    const name = el?.value?.trim();
                    if (!name) return alert("Please enter a category name");
                    try {
                      const newCat = await api("/api/categories", {
                        method: "POST",
                        body: JSON.stringify({ name, websiteId, department: "general" })
                      });
                      setCategories([...categories, newCat]);
                      setFormData(prev => ({ ...prev, categoryId: newCat._id }));
                      el.value = "";
                    } catch (err) {
                      alert("Failed to create category: " + err.message);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl transition-all"
                >
                  Create
                </button>
              </div>
            </div>
            <div>
              <label className="small-label dark:text-slate-400">Tags</label>
              <input
                type="text"
                placeholder="Comma separated tags"
                value={formData.tags.join(", ")}
                onChange={e => setFormData({...formData, tags: e.target.value.split(",").map(t => t.trim())})}
                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-white outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm">
        <div>
          <h2 className="heading-xl dark:text-white flex items-center gap-3">
            <Book className="text-indigo-500" />
            Help Center
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">Manage your help articles and documentation</p>
        </div>
        <button
          onClick={() => {
            setFormData({ title: "", content: "", tags: [], categoryId: "" });
            setEditingId(null);
            setIsEditing(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-[0.2em] px-8 py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-3"
        >
          <Plus size={18} /> New Article
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <div key={article._id} className="bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-100 dark:border-white/5 hover:border-indigo-500/30 transition-all group relative">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg pr-8">{article.title}</h3>
            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{article.content}</p>
            <div className="flex flex-wrap gap-2 mt-4">
               {article.tags.map(t => (
                 <span key={t} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-lg">{t}</span>
               ))}
            </div>
            
            <button
              onClick={() => handleEdit(article)}
              className="absolute top-6 right-6 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-indigo-500 transition-all"
            >
              <Edit2 size={16} />
            </button>
          </div>
        ))}
        {articles.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center text-slate-400">
            <Book size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm font-bold">No articles created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
