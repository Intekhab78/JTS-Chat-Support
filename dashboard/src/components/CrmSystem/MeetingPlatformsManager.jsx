import React, { useState, useEffect } from "react";
import { Video, Plus, ToggleLeft, ToggleRight, Trash2, Edit2, Check, X, Link2, Star, Loader2 } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

const EMOJI_OPTIONS = ["🎯","📹","🟢","🟣","📞","🤝","💻","🎥","📡","🔵","🔴","🟡"];

export default function MeetingPlatformsManager({ websiteId }) {
  const toast = useToast();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { name: "", icon: "🎥", color: "#6366f1", urlTemplate: "", description: "", isDefault: false };
  const [form, setForm] = useState(emptyForm);

  const fetchPlatforms = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/crm/meeting-platforms/all?websiteId=${websiteId}`).catch(() => ({}));
      setPlatforms(res.platforms || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (websiteId) fetchPlatforms(); }, [websiteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api(`/api/crm/meeting-platforms/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({ ...form, websiteId })
        });
        toast.success("Platform updated!");
      } else {
        await api(`/api/crm/meeting-platforms`, {
          method: "POST",
          body: JSON.stringify({ ...form, websiteId })
        });
        toast.success("Platform created!");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchPlatforms();
    } catch (err) {
      toast.error(err.message || "Failed to save platform");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p) => {
    setForm({ name: p.name, icon: p.icon, color: p.color, urlTemplate: p.urlTemplate, description: p.description, isDefault: p.isDefault });
    setEditingId(p._id);
    setShowForm(true);
  };

  const handleToggle = async (p) => {
    try {
      await api(`/api/crm/meeting-platforms/${p._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !p.isActive })
      });
      toast.success(`${p.name} ${!p.isActive ? "activated" : "deactivated"}`);
      fetchPlatforms();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSetDefault = async (p) => {
    try {
      await api(`/api/crm/meeting-platforms/${p._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDefault: true })
      });
      toast.success(`${p.name} set as default`);
      fetchPlatforms();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api(`/api/crm/meeting-platforms/${p._id}`, { method: "DELETE" });
      toast.success("Platform deleted");
      fetchPlatforms();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Video size={16} className="text-indigo-500" /> Meeting Platforms
          </h3>
          <p className="text-[11px] font-bold text-slate-400 mt-1">
            Configure video call & meeting platforms. JTS-Meet auto-generates unique room links.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-1.5 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-2xl transition-all shadow-sm shadow-indigo-200 uppercase"
        >
          <Plus size={12} /> Add Platform
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-indigo-50/40 border border-indigo-100 rounded-[24px] p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
            {editingId ? "✏️ Edit Platform" : "➕ New Platform"}
          </h4>

          {/* Emoji picker + Name */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1.5">Icon</label>
              <div className="flex flex-wrap gap-1 bg-white border rounded-xl p-2">
                {EMOJI_OPTIONS.map(em => (
                  <button key={em} type="button"
                    onClick={() => setForm({ ...form, icon: em })}
                    className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all ${form.icon === em ? "bg-indigo-100 ring-2 ring-indigo-400" : "hover:bg-slate-100"}`}
                  >{em}</button>
                ))}
                <input value={form.icon} onChange={e => setForm({...form, icon: e.target.value})}
                  className="w-7 h-7 text-center bg-slate-50 border rounded-lg text-sm outline-none" maxLength={2}
                  placeholder="✏️" title="Custom emoji" />
              </div>
            </div>
            <div className="col-span-3">
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1.5">Platform Name *</label>
              <input
                required value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="e.g. JTS Meet, Microsoft Teams..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>

          {/* Color + Description */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1.5">Brand Color</label>
              <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2">
                <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})}
                  className="w-6 h-6 border-0 bg-transparent cursor-pointer" />
                <span className="text-[10px] font-mono text-slate-500">{form.color}</span>
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1.5">Short Description</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="e.g. JTS built-in video meetings"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
            </div>
          </div>

          {/* URL Template */}
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1.5">
              Join URL Template <span className="normal-case font-bold text-slate-400">(optional — for auto room link generation)</span>
            </label>
            <div className="relative">
              <Link2 size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={form.urlTemplate} onChange={e => setForm({...form, urlTemplate: e.target.value})}
                placeholder="https://meet.jts.com/{roomId}"
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-mono focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
            </div>
            <p className="text-[9px] font-bold text-slate-400 mt-1.5">
              Use <code className="bg-white border px-1 py-0.5 rounded font-mono text-indigo-600">{'{roomId}'}</code> — replaced with a unique ID when meeting is created.
              {form.urlTemplate.includes("{roomId}") && (
                <span className="text-emerald-600 ml-2">✅ Room ID placeholder detected</span>
              )}
            </p>
          </div>

          {/* Set as Default */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm({...form, isDefault: e.target.checked})}
              className="w-4 h-4 rounded accent-indigo-600" />
            <span className="text-xs font-bold text-slate-600">Set as default platform</span>
          </label>

          {/* Preview */}
          {form.name && (
            <div className="flex items-center gap-3 bg-white border rounded-2xl px-4 py-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: form.color + "22" }}>
                {form.icon}
              </div>
              <div>
                <p className="text-xs font-black text-slate-800">{form.name}</p>
                <p className="text-[10px] font-bold" style={{ color: form.color }}>{form.description || "Meeting Platform"}</p>
              </div>
              {form.isDefault && <span className="ml-auto text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg">Default</span>}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-2xl transition-all">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {saving ? "Saving..." : editingId ? "Update Platform" : "Create Platform"}
            </button>
            <button type="button"
              onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-2xl transition-all">
              <X size={12} />
            </button>
          </div>
        </form>
      )}

      {/* Platform Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {platforms.map(p => (
            <div key={p._id}
              className={`relative group bg-white border rounded-[24px] p-5 space-y-3 transition-all hover:shadow-md ${
                p.isActive ? "border-slate-200/80 shadow-sm" : "border-slate-100 opacity-50"
              }`}
            >
              {/* Top: icon + name + badges */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${p.color}22 0%, ${p.color}11 100%)`, border: `1px solid ${p.color}33` }}>
                    {p.icon}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400">{p.description || "Meeting Platform"}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {p.isDefault && (
                    <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                      <Star size={8} fill="currentColor" /> Default
                    </span>
                  )}
                  {!p.isActive && (
                    <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg uppercase">Inactive</span>
                  )}
                </div>
              </div>

              {/* URL Template */}
              {p.urlTemplate ? (
                <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2">
                  <p className="text-[9px] font-black text-indigo-500 uppercase mb-0.5">Auto Room Link</p>
                  <p className="text-[10px] font-mono text-indigo-700 truncate">{p.urlTemplate}</p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                  <p className="text-[9px] font-bold text-slate-400">No URL template — manual link entry</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-50">
                {/* Edit */}
                <button onClick={() => handleEdit(p)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-black text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all uppercase">
                  <Edit2 size={10} /> Edit
                </button>

                {/* Toggle active */}
                <button onClick={() => handleToggle(p)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-black rounded-xl transition-all uppercase ${
                    p.isActive
                      ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                      : "text-slate-500 bg-slate-100 hover:bg-slate-200"
                  }`}>
                  {p.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                  {p.isActive ? "Active" : "Inactive"}
                </button>

                {/* Set default */}
                {!p.isDefault && (
                  <button onClick={() => handleSetDefault(p)}
                    className="flex items-center justify-center gap-1 py-2 px-3 text-[9px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all"
                    title="Set as default">
                    <Star size={10} />
                  </button>
                )}

                {/* Delete */}
                <button onClick={() => handleDelete(p)}
                  className="flex items-center justify-center py-2 px-3 text-[9px] font-black text-red-400 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                  title="Delete platform">
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}

          {/* Add new card */}
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-[24px] p-8 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-all">
              <Plus size={20} className="group-hover:text-indigo-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">Add Platform</span>
          </button>

          {platforms.length === 0 && !loading && (
            <div className="col-span-full text-center py-12">
              <p className="text-[11px] font-bold text-slate-400">No platforms configured yet</p>
              <p className="text-[10px] text-slate-400 mt-1">Defaults will be seeded when you click "Add Platform"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
