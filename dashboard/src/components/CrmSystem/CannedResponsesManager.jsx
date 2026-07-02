import React, { useState, useEffect } from "react";
import { Plus, Check, Trash2, Tag, Search, BookOpen } from "lucide-react";
import { api } from "../../api/client.js";

export default function CannedResponsesManager({ websiteId }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    shortcut: "", text: "", category: "general", tagsInput: ""
  });

  const fetchReplies = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/canned-responses?websiteId=${websiteId}`);
      setReplies(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [websiteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tags = form.tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      await api(`/api/crm/canned-responses`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          websiteId,
          tags
        })
      });
      setShowForm(false);
      setForm({ shortcut: "", text: "", category: "general", tagsInput: "" });
      fetchReplies();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this canned response?")) return;
    try {
      await api(`/api/crm/canned-responses/${id}`, { method: "DELETE" });
      fetchReplies();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredReplies = replies.filter(r => 
    r.shortcut.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3 border-slate-100">
        <div className="flex items-center gap-2">
          <BookOpen className="text-indigo-500" size={18} />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Canned Replies Manager</h3>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase text-white rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-100 transition-all"
        >
          <Plus size={14} /> Add Template
        </button>
      </div>

      <div className="max-w-md relative">
        <Search className="absolute left-3 top-3.5 text-slate-400" size={14} />
        <input
          type="text"
          placeholder="Search canned replies by shortcut or text..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-50 border rounded-xl pl-9 pr-4 py-3 text-xs font-bold"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(n => <div key={n} className="h-28 bg-slate-50 rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredReplies.length === 0 ? (
        <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-wider py-10">No replies found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReplies.map(r => (
            <div key={r._id} className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Shortcut: <span className="text-indigo-600 font-black">/{r.shortcut}</span></span>
                  <span className="text-[8px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500">{r.category}</span>
                </div>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">{r.text}</p>
              </div>

              <div className="flex justify-between items-center border-t pt-3 border-slate-100">
                <div className="flex gap-1">
                  {(r.tags || []).map((t, idx) => (
                    <span key={idx} className="text-[8px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">#{t}</span>
                  ))}
                </div>
                <button onClick={() => handleDelete(r._id)} className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50/50">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <form onSubmit={handleSubmit} className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl space-y-6">
            <h3 className="text-base font-black text-slate-900">Add Canned Reply</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Shortcut (e.g. welcome)</label>
                <input required value={form.shortcut} onChange={(e) => setForm({ ...form, shortcut: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category</label>
                <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Template text</label>
              <textarea required value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold h-24" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tags (comma separated)</label>
              <input value={form.tagsInput} onChange={(e) => setForm({ ...form, tagsInput: e.target.value })} className="w-full bg-slate-50 border px-4 py-3 rounded-xl text-xs font-bold" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase">Save Template</button>
          </form>
        </div>
      )}
    </div>
  );
}
