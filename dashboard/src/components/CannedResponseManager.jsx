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
      setResponses(data || []);
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

  function handleCopyShortcut(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied '${text}' to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = responses.filter(r => {
    const matchesSearch = 
      r.shortcut.toLowerCase().includes(searchQuery.toLowerCase()) || 
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
    <div className="space-y-5 animate-in fade-in duration-500">
      
      {/* ── Executive Hero Header Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-500/30 flex items-center gap-1.5">
                <Terminal size={12} className="text-indigo-400" /> Executive Command Center
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Protocol Shortcuts & Quick Replies
            </h2>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              Type <code className="bg-white/10 px-2 py-0.5 rounded-lg font-mono text-indigo-300 font-bold">/shortcut</code> in any chat session to rapidly deploy pre-formatted customer response templates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Metrics */}
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10">
              <div className="px-3 py-1 text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total</span>
                <span className="text-sm font-black text-white">{totalCount}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="px-3 py-1 text-center">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">Team</span>
                <span className="text-sm font-black text-white">{sharedCount}</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="px-3 py-1 text-center">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">Private</span>
                <span className="text-sm font-black text-white">{personalCount}</span>
              </div>
            </div>

            {canManageShortcuts ? (
              <button
                onClick={() => setIsAdding(true)}
                className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shrink-0"
              >
                <Plus size={16} />
                <span>{canManagePersonalShortcuts && !canManageSharedShortcuts ? "New Private Shortcut" : "Create Shortcut"}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/30 p-3.5 text-xs font-bold text-rose-700 dark:text-rose-300 animate-in fade-in">
          ⚠️ {error}
        </div>
      )}

      {/* ── Search & Filter Controls Bar ── */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search input */}
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by shortcut name or text content..."
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl pl-11 pr-10 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto shrink-0 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setScopeFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              scopeFilter === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setScopeFilter("shared")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              scopeFilter === "shared"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <Globe size={12} /> Team Shared ({sharedCount})
          </button>
          <button
            onClick={() => setScopeFilter("personal")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              scopeFilter === "personal"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <Lock size={12} /> Private ({personalCount})
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedResponses.pageItems.map(res => {
            const isPersonal = res.visibility === "personal";
            const shortcutCode = `/${res.shortcut}`;
            const isCopied = copiedId === res._id;
            const contentText = res.content || res.text || "";

            return (
              <div 
                key={res._id} 
                className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Left accent highlight bar */}
                <div className={`absolute top-0 left-0 w-1.5 h-full transition-all ${
                  isPersonal ? "bg-amber-500" : "bg-indigo-600"
                }`} />

                <div className="space-y-4">
                  {/* Top Bar: Code Pill + Scope Badge + Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleCopyShortcut(shortcutCode, res._id)}
                        className="inline-flex items-center gap-1.5 bg-slate-900 dark:bg-black text-indigo-300 font-mono text-xs font-black px-3 py-1.5 rounded-xl border border-indigo-500/30 hover:border-indigo-400 transition-all shadow-xs"
                        title="Click to copy shortcut code"
                      >
                        <Zap size={12} className="text-indigo-400" />
                        <span>{shortcutCode}</span>
                        {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={11} className="text-slate-400 opacity-60" />}
                      </button>

                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                        isPersonal
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/60"
                          : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60"
                      }`}>
                        {isPersonal ? <Lock size={10} /> : <Globe size={10} />}
                        {isPersonal ? "Private" : "Shared"}
                      </span>
                    </div>

                    {canManageShortcuts && (
                      <button
                        onClick={() => handleDelete(res._id)}
                        disabled={canManagePersonalShortcuts && !res.isOwnedByCurrentUser}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Delete shortcut"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Body: Expansion Text Payload */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-white/5 relative group/body">
                    <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {contentText}
                    </p>
                  </div>
                </div>

                {/* Footer bar */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  <span className="font-mono">Use: {shortcutCode}</span>
                  <button 
                    onClick={() => handleCopyShortcut(contentText, `${res._id}-text`)}
                    className="hover:text-indigo-600 transition-colors flex items-center gap-1 font-black uppercase tracking-wider text-[9px]"
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
