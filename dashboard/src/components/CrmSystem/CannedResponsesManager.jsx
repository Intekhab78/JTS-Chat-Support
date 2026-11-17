import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Check,
  Trash2,
  Search,
  BookOpen,
  Copy,
  Pencil,
  RefreshCw,
  Download,
  X,
  Globe,
  Lock
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";
import { exportToCSV } from "../../utils/exportUtils.js";

const EMPTY_FORM = {
  shortcut: "",
  title: "",
  text: "",
  category: "general",
  visibility: "shared",
  tagsInput: ""
};

export default function CannedResponsesManager({ websiteId }) {
  const toast = useToast();
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchReplies = async () => {
    setLoading(true);
    try {
      const qs = websiteId && websiteId !== "all" ? `?websiteId=${websiteId}` : "";
      const res = await api(`/api/crm/canned-responses${qs}`);
      setReplies(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.error(err.message || "Failed to load canned replies");
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [websiteId]);

  const categories = useMemo(() => {
    const counts = new Map();
    replies.forEach((r) => {
      const cat = (r.category || "general").trim().toLowerCase();
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [replies]);

  const filteredReplies = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return replies.filter((r) => {
      const cat = (r.category || "general").trim().toLowerCase();
      if (selectedCategory !== "all" && cat !== selectedCategory) return false;
      if (visibilityFilter !== "all" && (r.visibility || "shared") !== visibilityFilter) return false;
      if (!q) return true;
      const body = (r.text || r.content || "").toLowerCase();
      const title = (r.title || "").toLowerCase();
      const shortcut = (r.shortcut || "").toLowerCase();
      const tagsMatch = (r.tags || []).some((t) => String(t).toLowerCase().includes(q));
      return shortcut.includes(q) || title.includes(q) || body.includes(q) || tagsMatch;
    });
  }, [replies, searchTerm, selectedCategory, visibilityFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditModal = (reply) => {
    setEditingId(reply._id);
    setForm({
      shortcut: reply.shortcut || "",
      title: reply.title || "",
      text: reply.text || reply.content || "",
      category: reply.category || "general",
      visibility: reply.visibility || "shared",
      tagsInput: Array.isArray(reply.tags) ? reply.tags.join(", ") : ""
    });
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanShortcut = form.shortcut.trim().replace(/^\/+/, "");
    const cleanText = form.text.trim();
    if (!cleanShortcut || !cleanText) {
      toast.error("Shortcut and template text are required");
      return;
    }

    setSaving(true);
    try {
      const tags = form.tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      const payload = {
        shortcut: cleanShortcut,
        title: form.title.trim(),
        text: cleanText,
        content: cleanText,
        category: (form.category || "general").trim().toLowerCase(),
        visibility: form.visibility || "shared",
        tags,
        ...(websiteId && websiteId !== "all" ? { websiteId } : {})
      };

      if (editingId) {
        await api(`/api/crm/canned-responses/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        toast.success("Template updated");
      } else {
        await api(`/api/crm/canned-responses`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("Template created");
      }

      closeModal();
      fetchReplies();
    } catch (err) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api(`/api/crm/canned-responses/${id}`, { method: "DELETE" });
      setConfirmDeleteId(null);
      toast.success("Template deleted");
      fetchReplies();
    } catch (err) {
      toast.error(err.message || "Failed to delete template");
    }
  };

  const handleCopy = async (reply) => {
    const body = reply.text || reply.content || "";
    try {
      await navigator.clipboard.writeText(body);
      setCopiedId(reply._id);
      toast.success(`Copied /${reply.shortcut}`);
      setTimeout(() => setCopiedId((prev) => (prev === reply._id ? null : prev)), 1600);
    } catch {
      toast.error("Clipboard copy failed");
    }
  };

  const handleExport = () => {
    if (filteredReplies.length === 0) {
      toast.info("No templates to export");
      return;
    }
    const rows = filteredReplies.map((r) => ({
      Shortcut: `/${r.shortcut}`,
      Title: r.title || "",
      Category: r.category || "general",
      Visibility: r.visibility || "shared",
      Text: r.text || r.content || "",
      Tags: (r.tags || []).join(", ")
    }));
    exportToCSV(rows, `Canned_Replies_${new Date().toISOString().slice(0, 10)}`);
    toast.success("Exported CSV");
  };

  return (
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen size={14} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-wider leading-tight">
                Canned Replies Manager
              </h3>
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-black">
                {replies.length}
              </span>
            </div>
            <p className="text-[9.5px] font-semibold text-slate-400 leading-tight">
              Type <span className="text-indigo-600 font-bold">/shortcut</span> in inbox or tickets for instant replies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchReplies}
            title="Refresh"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleExport}
            className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 text-[9.5px] font-black uppercase tracking-wide flex items-center gap-1 transition-colors"
          >
            <Download size={11} /> CSV
          </button>
          <button
            onClick={openCreateModal}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-[9.5px] font-black uppercase tracking-wide text-white rounded-lg flex items-center gap-1 shadow-sm transition-colors"
          >
            <Plus size={12} /> Add Template
          </button>
        </div>
      </div>

      {/* Compact Search & Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl px-3 py-2 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2 text-slate-400" size={12} />
          <input
            type="text"
            placeholder="Search /shortcut, title, text, #tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-7 py-1.5 text-[10.5px] font-semibold text-slate-700 focus:outline-none focus:border-indigo-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide transition-colors ${
              selectedCategory === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            All ({replies.length})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide transition-colors ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {cat} ({count})
            </button>
          ))}
        </div>

        {/* Visibility Filter */}
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="ml-auto bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9.5px] font-bold text-slate-600 uppercase focus:outline-none"
        >
          <option value="all">All Scope</option>
          <option value="shared">Shared</option>
          <option value="personal">Personal</option>
        </select>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-white border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredReplies.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-8 px-4 text-center space-y-1.5">
          <p className="text-slate-500 text-[10.5px] font-black uppercase tracking-wider">
            {replies.length === 0 ? "No canned replies created yet" : "No replies match current filters"}
          </p>
          <p className="text-slate-400 text-[9.5px] font-medium">
            {replies.length === 0
              ? "Click + Add Template to create your first quick-reply shortcut."
              : "Try clearing the search query or switching category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredReplies.map((r) => {
            const body = r.text || r.content || "";
            const isCopied = copiedId === r._id;
            const isConfirmingDelete = confirmDeleteId === r._id;
            return (
              <div
                key={r._id}
                className="bg-white border border-slate-200/80 hover:border-indigo-200 rounded-xl p-3 shadow-sm flex flex-col justify-between gap-2 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9.5px] font-black truncate">
                        /{r.shortcut}
                      </span>
                      <span
                        title={r.visibility === "personal" ? "Personal" : "Shared"}
                        className="text-slate-400 shrink-0"
                      >
                        {r.visibility === "personal" ? <Lock size={10} /> : <Globe size={10} />}
                      </span>
                    </div>
                    <span className="text-[8.5px] font-black uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 shrink-0">
                      {r.category || "general"}
                    </span>
                  </div>

                  {r.title && (
                    <p className="text-[10.5px] font-extrabold text-slate-800 truncate">{r.title}</p>
                  )}
                  <p className="text-[10px] font-medium text-slate-600 leading-snug line-clamp-3">
                    {body}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 border-t pt-2 border-slate-100">
                  <div className="flex flex-wrap gap-1 min-w-0">
                    {(r.tags || []).slice(0, 3).map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[8.5px] font-bold text-indigo-500 bg-indigo-50/80 px-1.5 py-0.5 rounded"
                      >
                        #{t}
                      </span>
                    ))}
                    {(r.tags || []).length > 3 && (
                      <span className="text-[8.5px] font-bold text-slate-400">
                        +{r.tags.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => handleCopy(r)}
                      title="Copy reply text"
                      className={`p-1 rounded-md transition-colors ${
                        isCopied
                          ? "text-emerald-600 bg-emerald-50"
                          : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      }`}
                    >
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={() => openEditModal(r)}
                      title="Edit template"
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[8.5px] font-black uppercase"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[8.5px] font-bold uppercase"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(r._id)}
                        title="Delete template"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={closeModal} />
          <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl space-y-3 border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {editingId ? "Edit Canned Reply" : "Add Canned Reply"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Shortcut (e.g. welcome)
                </label>
                <input
                  required
                  placeholder="welcome"
                  value={form.shortcut}
                  onChange={(e) => setForm({ ...form, shortcut: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Category
                </label>
                <input
                  required
                  placeholder="general"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Title (Optional)
                </label>
                <input
                  placeholder="Greeting message"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Visibility
                </label>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                >
                  <option value="shared">Shared</option>
                  <option value="personal">Personal</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Template Text
              </label>
              <textarea
                required
                placeholder="Write your canned reply message..."
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-800 h-24 resize-none focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Tags (comma separated)
              </label>
              <input
                placeholder="greeting, onboarding, support"
                value={form.tagsInput}
                onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeModal}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-[10px] font-black uppercase"
              >
                {saving ? "Saving..." : editingId ? "Update Template" : "Save Template"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
