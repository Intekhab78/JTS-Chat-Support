import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Video, Plus, ToggleLeft, ToggleRight, Trash2, Edit2, Check, X, Link2, Star, Loader2 } from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import ConfirmModal from "../ConfirmModal.jsx";
import { PLATFORM_ICON_OPTIONS, renderPlatformIcon } from "./platformIconHelper.jsx";

export default function MeetingPlatformsManager({ websiteId }) {
  const toast = useToast();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, platform: null, loading: false });

  const emptyForm = { name: "", icon: "Video", color: "#6366f1", urlTemplate: "", description: "", isDefault: false };
  const [form, setForm] = useState(emptyForm);

  const fetchPlatforms = async () => {
    setLoading(true);
    try {
      const qs = websiteId && websiteId !== "all" ? `?websiteId=${encodeURIComponent(websiteId)}` : "";
      const res = await api(`/api/crm/meeting-platforms/all${qs}`).catch(() => ({}));
      setPlatforms(res.platforms || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlatforms(); }, [websiteId]);

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

  const handleDelete = (p) => {
    setConfirmDelete({ open: true, platform: p, loading: false });
  };

  const executeDelete = async () => {
    if (!confirmDelete.platform) return;
    setConfirmDelete((prev) => ({ ...prev, loading: true }));
    try {
      await api(`/api/crm/meeting-platforms/${confirmDelete.platform._id}`, { method: "DELETE" });
      toast.success("Platform deleted");
      setConfirmDelete({ open: false, platform: null, loading: false });
      fetchPlatforms();
    } catch (err) {
      toast.error(err.message);
      setConfirmDelete((prev) => ({ ...prev, loading: false }));
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

      {/* Add / Edit Platform Modal */}
      {showForm &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowForm(false);
                setEditingId(null);
                setForm(emptyForm);
              }
            }}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Video size={14} className="text-indigo-500" />
                  {editingId ? "Edit Meeting Platform" : "New Meeting Platform"}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-5">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                      Platform Icon
                    </label>
                    <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5">
                      {PLATFORM_ICON_OPTIONS.map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setForm({ ...form, icon: id })}
                          title={label}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            form.icon === id
                              ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-700"
                              : "hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <Icon size={13} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-7 space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        Platform Name *
                      </label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. JTS Meet, Microsoft Teams..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-5 gap-2.5">
                      <div className="col-span-2">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                          Brand Color
                        </label>
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                          <input
                            type="color"
                            value={form.color}
                            onChange={(e) => setForm({ ...form, color: e.target.value })}
                            className="w-5 h-5 border-0 bg-transparent cursor-pointer shrink-0"
                          />
                          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 truncate">
                            {form.color}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                          Short Description
                        </label>
                        <input
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder="e.g. Built-in video meetings"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Join URL Template{" "}
                    <span className="normal-case font-semibold text-slate-400">(optional — auto room link)</span>
                  </label>
                  <div className="relative">
                    <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.urlTemplate}
                      onChange={(e) => setForm({ ...form, urlTemplate: e.target.value })}
                      placeholder="https://meet.jts.com/{roomId}"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1">
                    Use <code className="bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 px-1 py-0.5 rounded font-mono text-indigo-600 dark:text-indigo-400">{'{roomId}'}</code> for unique meeting links.
                    {form.urlTemplate.includes("{roomId}") && (
                      <span className="text-emerald-600 dark:text-emerald-400 ml-2">Room ID placeholder detected</span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isDefault}
                      onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Set as default platform
                    </span>
                  </label>

                  {form.name && (
                    <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: form.color + "22" }}
                      >
                        {renderPlatformIcon(form.icon, form.color, 14)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">{form.name}</p>
                        <p className="text-[10px] font-semibold leading-tight" style={{ color: form.color }}>
                          {form.description || "Meeting Platform"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setForm(emptyForm);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-black uppercase rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-xl shadow-sm transition-colors"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {saving ? "Saving..." : editingId ? "Update Platform" : "Create Platform"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
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
                    {renderPlatformIcon(p.icon, p.color, 22)}
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

      <ConfirmModal
        open={confirmDelete.open}
        title="Delete Platform"
        message={`Are you sure you want to delete "${confirmDelete.platform?.name || "this platform"}"? This action cannot be undone.`}
        loading={confirmDelete.loading}
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete({ open: false, platform: null, loading: false })}
      />
    </div>
  );
}
