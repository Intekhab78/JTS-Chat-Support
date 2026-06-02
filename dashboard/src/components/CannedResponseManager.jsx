import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { Trash2, Plus, MessageSquare, Search, Zap, X } from "lucide-react";
import PaginationControls from "./PaginationControls.jsx";
import { getPaginationMeta } from "../utils/pagination.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function CannedResponseManager() {
  const { user } = useAuth();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newResponse, setNewResponse] = useState({ shortcut: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const canManageSharedShortcuts = ["admin", "client", "manager"].includes(user?.role);
  const canManagePersonalShortcuts = user?.role === "agent";
  const canManageShortcuts = canManageSharedShortcuts || canManagePersonalShortcuts;

  async function loadResponses() {
    try {
      setLoading(true);
      setError("");
      const data = await api("/api/canned-responses");
      setResponses(data);
    } catch (err) {
      setError(err.message || "Failed to load shortcuts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResponses();
  }, []);

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
      loadResponses();
    } catch (err) {
      setError(err.message || "Failed to delete shortcut.");
    }
  }

  const filtered = searchQuery
    ? responses.filter(r => 
        r.shortcut.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : responses;
  const paginatedResponses = getPaginationMeta(filtered, page);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, responses.length]);

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <h2 className="heading-md dark:text-white">Protocol Shortcuts</h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Type /shortcut in a chat to rapidly deploy standard responses.</p>
        </div>
        {canManageShortcuts ? (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-100/10 flex items-center justify-center gap-3"
          >
            <Plus size={16} /> {canManagePersonalShortcuts && !canManageSharedShortcuts ? "New Personal Shortcut" : "New Asset"}
          </button>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
            Read-only shortcut library
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-[11px] font-bold text-red-600">
          {error}
        </div>
      )}

      {canManagePersonalShortcuts ? (
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/80 px-6 py-5 text-[11px] font-bold text-indigo-700">
          Shared shortcuts created by admin, client, or manager appear for everyone. Shortcuts you create here are private and only visible to your own agent account.
        </div>
      ) : !canManageShortcuts ? (
        <div className="rounded-3xl border border-indigo-100 bg-indigo-50/80 px-6 py-5 text-[11px] font-bold text-indigo-700">
          Agents can use shortcuts in chat with `/shortcut`, but only admin, client, and manager roles can create or delete them.
        </div>
      ) : null}

      <div className="premium-card p-4 flex items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 transition-colors">
        <div className="flex-1 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter by shortcut or payload content…"
            className="w-full bg-slate-50/50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-2xl pl-16 pr-8 py-4.5 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 dark:text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => (
            <div key={i} className="premium-card p-10 h-64 animate-pulse bg-slate-50/50 dark:bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {paginatedResponses.pageItems.map(res => (
            <div key={res._id} className="premium-card p-10 hover:shadow-2xl hover:translate-y-[-6px] transition-all group relative overflow-hidden flex flex-col justify-between bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600 dark:bg-indigo-500 opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-2 px-4 py-1.5 bg-slate-950 dark:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg border border-white/5">
                      <Zap size={12} className="text-indigo-400" />
                      /{res.shortcut}
                    </span>
                    <span className={`rounded-xl border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                      res.visibility === "personal"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}>
                      {res.scopeLabel || (res.visibility === "personal" ? "Private" : "Shared")}
                    </span>
                  </div>
                  {canManageShortcuts ? (
                    <button
                      onClick={() => handleDelete(res._id)}
                      disabled={canManagePersonalShortcuts && !res.isOwnedByCurrentUser}
                      className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : null}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-bold line-clamp-4">
                  {res.content}
                </p>
              </div>
              <div className="pt-8 mt-8 border-t border-slate-50 dark:border-white/5 flex items-center justify-between group-hover:border-indigo-100 dark:group-hover:border-indigo-500/10 transition-colors">
                <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Active Shortcut</span>
                <MessageSquare size={16} className="text-indigo-500 opacity-20 group-hover:opacity-100 transition-all" />
              </div>
            </div>
          ))}
          
          {filtered.length === 0 && !isAdding && (
             <div className="col-span-full py-32 rounded-[40px] border-2 border-dashed border-slate-100 dark:border-white/5 text-center space-y-6 bg-slate-50/30 dark:bg-white/5">
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center mx-auto text-4xl transition-transform hover:rotate-12 cursor-default">🧩</div>
                <div className="space-y-2">
                   <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">No Matches Found</h4>
                   <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Adjust your search parameters.</p>
                </div>
             </div>
          )}
        </div>
      )}
      {!loading && (
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
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div className="fixed inset-0 bg-slate-950/40 dark:bg-black/80 backdrop-blur-md" onClick={() => setIsAdding(false)} />
          <div className="relative flex min-h-full items-start justify-center py-6 sm:py-10">
          <form 
            onSubmit={handleCreate}
            className="relative z-10 w-full max-w-xl space-y-8 rounded-[32px] border border-slate-100 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-500 dark:border-white/5 dark:bg-slate-900 sm:rounded-[40px] sm:p-8 max-h-[calc(100vh-2rem)] overflow-y-auto lg:max-h-[calc(100vh-5rem)] lg:p-10 custom-scrollbar"
          >
            <div className="flex justify-between items-start">
               <div className="space-y-3">
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase sm:text-3xl">New Shortcut</h3>
                 <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                   {canManagePersonalShortcuts && !canManageSharedShortcuts
                     ? "Create a private shortcut only you can use."
                     : "Map a sequence to a rapid execution command."}
                 </p>
               </div>
               <button type="button" onClick={() => setIsAdding(false)} className="p-3 text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                  <X size={20} />
               </button>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Command Vector (Shortcut)</label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500 font-black text-xl italic group-focus-within:animate-pulse">/</span>
                  <input
                    required
                    maxLength={20}
                    value={newResponse.shortcut}
                    onChange={e => setNewResponse({ ...newResponse, shortcut: e.target.value.toLowerCase().replace(/\//g, "").replace(/\s/g, '-') })}
                    placeholder="e.g. welcome-msg"
                    className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-[28px] pl-12 pr-8 py-5 text-sm font-black focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 dark:text-white shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Expansion Payload</label>
                <textarea
                  required
                  rows={6}
                  value={newResponse.content}
                  onChange={e => setNewResponse({ ...newResponse, content: e.target.value })}
                  placeholder="The precise data payload that will replace the shortcut code..."
                  className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-[28px] px-8 py-6 text-sm font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:outline-none focus:border-indigo-500/50 transition-all resize-none shadow-inner leading-relaxed"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                disabled={saving}
                type="submit"
                className="flex-[2] bg-slate-950 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-500 text-white px-8 py-4 rounded-[24px] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {saving ? (
                   <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                   <><Zap size={18} /> Save Shortcut</>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className="flex-1 border-2 border-slate-100 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 px-8 py-4 rounded-[24px] font-black text-[11px] uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
          </div>
        </div>
      )}
    </div>
  );
}
