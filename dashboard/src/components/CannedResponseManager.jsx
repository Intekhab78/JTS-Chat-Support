import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { Trash2, Plus, MessageSquare, Search, Zap, X, Copy, Check, Lock, Globe, Terminal, ShieldCheck, Sparkles } from "lucide-react";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useDataSync } from "../hooks/useDataSync.js";

export default function CannedResponseManager() {
  const { user } = useAuth();
  const toast = useToast();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all"); // "all" | "personal" | "shared"
  const [isAdding, setIsAdding] = useState(false);
  const [newResponse, setNewResponse] = useState({ shortcut: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [page, setPage] = useState(1);

  const canManageSharedShortcuts = ["admin", "client", "manager"].includes(user?.role);
  const canManagePersonalShortcuts = user?.role === "agent";
  const canManageShortcuts = canManageSharedShortcuts || canManagePersonalShortcuts;

  async function loadResponses() {
    try {
      setLoading(true);
      setError("");
      const data = await api("/api/canned-responses");
      setResponses(Array.isArray(data) ? data : (data?.responses || data?.data || []));
    } catch (err) {
      setError(err.message || "Failed to load shortcuts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResponses();
  }, []);

  useDataSync({
    entities: ["shortcut"],
    onSync: () => loadResponses()
  });

  async function handleCreate(e) {
    e.preventDefault();
    if (!canManageShortcuts) return;
    if (!newResponse.shortcut || !newResponse.content) return;
    setSaving(true);
    try {
      await api("/api/canned-responses", {
        method: "POST",
        body: JSON.stringify(newResponse)
      });
      toast.success(`Shortcut '/${newResponse.shortcut}' created successfully!`);
      setNewResponse({ shortcut: "", content: "" });
      setIsAdding(false);
      loadResponses();
    } catch (err) {
      setError(err.message || "Failed to save shortcut.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!canManageShortcuts) return;
    if (!confirm("Are you sure you want to delete this shortcut?")) return;
    try {
      await api(`/api/canned-responses/${id}`, { method: "DELETE" });
      toast.success("Shortcut deleted.");
      loadResponses();
    } catch (err) {
      setError(err.message || "Failed to delete shortcut.");
    }
  }

  async function handleToggleActive(res) {
    const nextActive = res.isActive === false;
    try {
      const updated = await api(`/api/canned-responses/${res._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextActive })
      });
      setResponses((prev) => prev.map((item) => (item._id === res._id ? { ...item, ...updated, isActive: nextActive } : item)));
      toast.success(nextActive ? "Shortcut enabled." : "Shortcut disabled.");
    } catch (err) {
      setError(err.message || "Failed to update shortcut status.");
    }
  }

  function handleCopyShortcut(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied '${text}' to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = responses.filter(r => {
    const matchesSearch = 
      (r.shortcut || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.content || r.text || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (scopeFilter === "personal") return r.visibility === "personal";
    if (scopeFilter === "shared") return r.visibility !== "personal";
    return true;
  });

  const paginatedResponses = getPaginationMeta(filtered, page);

  const totalCount = responses.length;
  const personalCount = responses.filter(r => r.visibility === "personal").length;
  const sharedCount = responses.filter(r => r.visibility !== "personal").length;

  useEffect(() => {
    setPage(1);
  }, [searchQuery, scopeFilter, responses.length]);

  return (
    <div className="space-y-3.5 animate-in fade-in duration-500">
      
      {/* ── Compact Executive Hero Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white px-4 py-3.5 sm:px-5 sm:py-4 text-slate-900 border border-slate-200/80 shadow-xs">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-wider rounded-md border border-indigo-200/70 inline-flex items-center gap-1">
                <Terminal size={11} className="text-indigo-500" /> Protocol Quick Replies
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
              Protocol Shortcuts & Quick Replies
            </h2>
            <p className="text-[11px] text-slate-500 font-medium leading-normal">
              Type <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[10px] font-bold">/shortcut</code> in any chat to instantly deploy customer response templates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Metrics */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none mb-0.5">Total</span>
                <span className="text-xs font-black text-slate-900">{totalCount}</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block leading-none mb-0.5">Team</span>
                <span className="text-xs font-black text-slate-900">{sharedCount}</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="px-1.5 py-0.5 text-center">
                <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block leading-none mb-0.5">Private</span>
                <span className="text-xs font-black text-slate-900">{personalCount}</span>
              </div>
            </div>

            {canManageShortcuts ? (
              <button
                onClick={() => setIsAdding(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus size={14} />
                <span>{canManagePersonalShortcuts && !canManageSharedShortcuts ? "New Private Shortcut" : "Create Shortcut"}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/30 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 animate-in fade-in">
          ⚠️ {error}
        </div>
      )}

      {/* ── Search & Filter Controls Bar ── */}
      <div className="bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-center justify-between gap-2.5">
        
        {/* Search input */}
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by shortcut name or text content..."
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto shrink-0 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setScopeFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
              scopeFilter === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setScopeFilter("shared")}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              scopeFilter === "shared"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <Globe size={11} /> Team Shared ({sharedCount})
          </button>
          <button
            onClick={() => setScopeFilter("personal")}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              scopeFilter === "personal"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <Lock size={11} /> Private ({personalCount})
          </button>
        </div>

      </div>

      {/* ── Shortcuts Grid View ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-6 h-52 animate-pulse border border-slate-100 dark:border-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedResponses.pageItems.map(res => {
            const isPersonal = res.visibility === "personal";
            const isEnabled = res.isActive !== false;
            const canEditThis = canManageSharedShortcuts || (canManagePersonalShortcuts && res.isOwnedByCurrentUser);
            const cleanCode = String(res.shortcut || "").replace(/^\/+/, "");
            const shortcutCode = `/${cleanCode}`;
            const isCopied = copiedId === res._id;
            const contentText = res.content || res.text || "";

            return (
              <div 
                key={res._id} 
                className={`group bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all duration-200 flex flex-col justify-between ${
                  isEnabled ? "" : "opacity-65 bg-slate-50/70 dark:bg-slate-900/60"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Code Pill + Scope Badge + Toggle + Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <button
                        type="button"
                        onClick={() => handleCopyShortcut(shortcutCode, res._id)}
                        className="inline-flex items-center gap-1.5 bg-slate-900 dark:bg-black text-indigo-300 font-mono text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-800 hover:border-indigo-400 transition-colors"
                        title="Click to copy shortcut code"
                      >
                        <Zap size={11} className="text-indigo-400" />
                        <span>{shortcutCode}</span>
                        {isCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={10} className="text-slate-400 opacity-70" />}
                      </button>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        isPersonal
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/70"
                          : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70"
                      }`}>
                        {isPersonal ? <Lock size={9} /> : <Globe size={9} />}
                        {isPersonal ? "Private" : "Shared"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {canEditThis && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isEnabled}
                          onClick={() => handleToggleActive(res)}
                          title={isEnabled ? "Click to disable shortcut" : "Click to enable shortcut"}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                            isEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ${
                              isEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      )}
                      {canManageShortcuts && (
                        <button
                          type="button"
                          onClick={() => handleDelete(res._id)}
                          disabled={canManagePersonalShortcuts && !res.isOwnedByCurrentUser}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Delete shortcut"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body: Expansion Text Payload */}
                  <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                    <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap line-clamp-3">
                      {contentText}
                    </p>
                  </div>
                </div>

                {/* Footer bar */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">Use: {shortcutCode}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      isEnabled
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                      {isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyShortcut(contentText, `${res._id}-text`)}
                    className="hover:text-indigo-600 transition-colors flex items-center gap-1 font-bold uppercase tracking-wider text-[9px]"
                  >
                    <Copy size={11} /> Copy Text
                  </button>
                </div>

              </div>
            );
          })}

          {/* Empty state */}
          {filtered.length === 0 && !loading && (
            <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-2xl text-slate-400">
                ⚡
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">No Shortcuts Found</h4>
                <p className="text-xs text-slate-400 font-bold">No quick reply shortcuts match your current filter or search criteria.</p>
              </div>
              {canManageShortcuts && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all inline-flex items-center gap-2"
                >
                  <Plus size={14} /> Create Shortcut Now
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && filtered.length > 0 && (
        <PaginationControls
          currentPage={paginatedResponses.currentPage}
          totalPages={paginatedResponses.totalPages}
          totalItems={paginatedResponses.totalItems}
          itemLabel="shortcuts"
          onPageChange={setPage}
        />
      )}

      {/* Add Modal */}
      {isAdding && canManageShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md">
          {/* Backdrop overlay */}
          <div className="fixed inset-0" onClick={() => setIsAdding(false)} />

          {/* Form Modal Box */}
          <form 
            onSubmit={handleCreate}
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex justify-between items-center shrink-0 border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">New Shortcut</h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {canManagePersonalShortcuts && !canManageSharedShortcuts
                    ? "Create a private shortcut only you can use."
                    : "Map a sequence to a rapid execution command."}
                </p>
              </div>
              <button type="button" onClick={() => setIsAdding(false)} className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="space-y-3.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Command Vector (Shortcut)</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 font-black text-base italic group-focus-within:animate-pulse">/</span>
                  <input
                    required
                    maxLength={20}
                    value={newResponse.shortcut}
                    onChange={e => setNewResponse({ ...newResponse, shortcut: e.target.value.toLowerCase().replace(/\//g, "").replace(/\s/g, '-') })}
                    placeholder="e.g. welcome-msg"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl pl-8 pr-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Expansion Payload</label>
                <textarea
                  required
                  rows={3}
                  value={newResponse.content}
                  onChange={e => setNewResponse({ ...newResponse, content: e.target.value })}
                  placeholder="The precise data payload that will replace the shortcut code..."
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all resize-none shadow-inner leading-relaxed"
                />
              </div>
            </div>

            {/* Fixed Footer Buttons */}
            <div className="flex gap-3 shrink-0 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                disabled={saving}
                type="submit"
                className="flex-1 bg-slate-950 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Zap size={16} /> Save Shortcut</>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="px-5 border border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
