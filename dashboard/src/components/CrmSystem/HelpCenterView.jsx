import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Search,
  ChevronRight,
  FileText,
  Sparkles,
  Plus,
  X,
  RefreshCw,
  Tag,
  Clock,
  ArrowLeft,
  CheckCircle2
} from "lucide-react";
import { api } from "../../api/client.js";
import { useToast } from "../../context/ToastContext.jsx";

const EMPTY_ARTICLE_FORM = {
  title: "",
  categoryName: "General",
  content: "",
  tagsInput: "",
  isPublished: true
};

export default function HelpCenterView({ websiteId }) {
  const toast = useToast();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Ask AI modal
  const [showAskModal, setShowAskModal] = useState(false);
  const [askQuestionText, setAskQuestionText] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [askingAi, setAskingAi] = useState(false);

  // Create article modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingArticle, setSavingArticle] = useState(false);
  const [articleForm, setArticleForm] = useState(EMPTY_ARTICLE_FORM);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const qs = websiteId && websiteId !== "all" ? `?websiteId=${websiteId}` : "";
      const [kbRes, helpRes] = await Promise.allSettled([
        api(`/api/knowledge-base/articles${qs}`),
        api(`/api/help/articles`)
      ]);

      const kbList =
        kbRes.status === "fulfilled" && Array.isArray(kbRes.value)
          ? kbRes.value.map((a) => ({
              id: a._id,
              title: a.title,
              category: a.categoryId?.name || "General",
              content: a.content || "",
              tags: Array.isArray(a.tags) ? a.tags : [],
              views: a.views || 0,
              isPublished: a.isPublished !== false,
              updatedAt: a.updatedAt,
              source: "kb"
            }))
          : [];

      const helpList =
        kbList.length === 0 && helpRes.status === "fulfilled" && Array.isArray(helpRes.value)
          ? helpRes.value.map((a) => ({
              id: a._id || a.id,
              title: a.title,
              category: a.category || "Platform Guide",
              content: a.content || a.summary || "",
              summary: a.summary || "",
              tags: Array.isArray(a.tags) ? a.tags : [],
              views: a.views || 0,
              isPublished: true,
              updatedAt: a.updatedAt,
              source: "help"
            }))
          : [];

      setArticles([...kbList, ...helpList]);
    } catch (err) {
      toast.error(err.message || "Failed to load knowledge articles");
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [websiteId]);

  const categories = useMemo(() => {
    const counts = new Map();
    articles.forEach((a) => {
      const cat = (a.category || "General").trim();
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((art) => {
      if (selectedCategory !== "all" && (art.category || "General") !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const inTags = (art.tags || []).some((t) => String(t).toLowerCase().includes(q));
      return (
        (art.title || "").toLowerCase().includes(q) ||
        (art.content || "").toLowerCase().includes(q) ||
        inTags
      );
    });
  }, [articles, selectedCategory, searchQuery]);

  const estimateReadTime = (text) => {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.ceil(words / 180))} min read`;
  };

  const handleAskAiAssistant = async () => {
    const q = askQuestionText.trim();
    if (!q) return;

    if (!websiteId || websiteId === "all") {
      toast.info("Select a specific website to query its Knowledge Base with AI.");
      return;
    }

    setAskingAi(true);
    setAiResult(null);
    try {
      const res = await api(`/api/knowledge-base/query`, {
        method: "POST",
        body: JSON.stringify({ websiteId, queryText: q })
      });
      setAiResult(res);
    } catch (err) {
      toast.error(err.message || "AI Knowledge query failed");
    } finally {
      setAskingAi(false);
    }
  };

  const handleCreateArticle = async (e) => {
    e.preventDefault();
    if (!websiteId || websiteId === "all") {
      toast.error("Please select a specific website first to create a KB article.");
      return;
    }

    setSavingArticle(true);
    try {
      const tags = articleForm.tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await api(`/api/knowledge-base/articles`, {
        method: "POST",
        body: JSON.stringify({
          websiteId,
          title: articleForm.title.trim(),
          categoryName: articleForm.categoryName.trim() || "General",
          content: articleForm.content.trim(),
          tags,
          isPublished: articleForm.isPublished
        })
      });

      toast.success("Knowledge article created");
      setShowCreateModal(false);
      setArticleForm(EMPTY_ARTICLE_FORM);
      fetchArticles();
    } catch (err) {
      toast.error(err.message || "Failed to create article");
    } finally {
      setSavingArticle(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Clean White Compact Header & Search */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <BookOpen size={14} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-wider leading-tight">
                  Knowledge & Resolution Hub
                </h2>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-black">
                  {articles.length} Articles
                </span>
              </div>
              <p className="text-[9.5px] font-semibold text-slate-400 leading-tight">
                Search verified knowledge base guides, SOPs, and query AI directly from your articles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchArticles}
              title="Refresh"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
            {websiteId && websiteId !== "all" && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[9.5px] font-black uppercase tracking-wide flex items-center gap-1 transition-colors"
              >
                <Plus size={11} /> New Article
              </button>
            )}
            <button
              onClick={() => {
                setAiResult(null);
                setShowAskModal(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9.5px] font-black uppercase tracking-wide flex items-center gap-1 shadow-sm transition-colors"
            >
              <Sparkles size={11} /> Ask AI
            </button>
          </div>
        </div>

        {/* Search Input + Dynamic Category Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <div className="relative flex-1 min-w-[210px] max-w-sm">
            <Search className="absolute left-2.5 top-2 text-slate-400" size={12} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles by title, content, or tag..."
              className="w-full pl-7 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide transition-colors ${
                selectedCategory === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              All ({articles.length})
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
        </div>
      </div>

      {/* Article Detail View OR Compact Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-white border border-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : selectedArticle ? (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <button
              onClick={() => setSelectedArticle(null)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9.5px] font-black uppercase tracking-wide inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={11} /> Back to Articles
            </button>
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase">
              {selectedArticle.category}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-sm font-black text-slate-900">{selectedArticle.title}</h1>
            <div className="flex flex-wrap items-center gap-2.5 text-[9.5px] font-bold text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Clock size={10} /> {estimateReadTime(selectedArticle.content)}
              </span>
              {selectedArticle.views > 0 && <span>• {selectedArticle.views} views</span>}
              {selectedArticle.updatedAt && (
                <span>• Updated {new Date(selectedArticle.updatedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3.5 text-[11px] font-medium text-slate-700 leading-relaxed whitespace-pre-line">
            {selectedArticle.content || selectedArticle.summary || "No content available."}
          </div>

          {(selectedArticle.tags || []).length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-1">
              {selectedArticle.tags.map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[8.5px] font-bold"
                >
                  <Tag size={8} /> {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-8 px-4 text-center space-y-1.5">
          <p className="text-slate-500 text-[10.5px] font-black uppercase tracking-wider">
            {articles.length === 0 ? "No knowledge articles yet" : "No articles match your search"}
          </p>
          <p className="text-slate-400 text-[9.5px] font-medium">
            {articles.length === 0
              ? "Select a website and click + New Article to publish your first guide."
              : "Try another keyword or switch category filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredArticles.map((art) => (
            <div
              key={art.id}
              onClick={() => setSelectedArticle(art)}
              className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between gap-2 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <FileText size={12} />
                    </div>
                    <span className="text-[8.5px] font-black uppercase text-slate-400 truncate">
                      {art.category}
                    </span>
                  </div>
                  {art.isPublished ? (
                    <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                      <CheckCircle2 size={8} /> Live
                    </span>
                  ) : (
                    <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                      Draft
                    </span>
                  )}
                </div>

                <h3 className="text-[11px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                  {art.title}
                </h3>
                <p className="text-[10px] font-medium text-slate-500 line-clamp-2 leading-snug">
                  {art.summary || art.content}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-black text-slate-400">
                <span>{estimateReadTime(art.content)}</span>
                <span className="text-indigo-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Read <ChevronRight size={11} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ask AI Knowledge Modal */}
      {showAskModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-3 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    AI Knowledge Assistant
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400">
                    Answers grounded in your published Knowledge Base
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAskModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2.5">
              <textarea
                rows={3}
                value={askQuestionText}
                onChange={(e) => setAskQuestionText(e.target.value)}
                placeholder="Ask a question about your docs, SLAs, billing, or setup..."
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-800 outline-none focus:border-indigo-400 resize-none"
              />

              {askingAi && (
                <div className="py-4 text-center space-y-1">
                  <Sparkles size={18} className="mx-auto text-indigo-600 animate-spin" />
                  <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                    Querying Knowledge Base...
                  </p>
                </div>
              )}

              {aiResult && (
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-2 max-h-56 overflow-y-auto">
                  <div className="flex items-center justify-between text-[8.5px] font-black uppercase text-indigo-600">
                    <span>Answer ({aiResult.mode || "rag"})</span>
                    {aiResult.matchedChunks !== undefined && (
                      <span>{aiResult.matchedChunks} matched sources</span>
                    )}
                  </div>
                  <p className="text-[10.5px] font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                    {aiResult.answer || "No matching knowledge found for this query."}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAskModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase"
              >
                Close
              </button>
              <button
                type="button"
                disabled={askingAi || !askQuestionText.trim()}
                onClick={handleAskAiAssistant}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1"
              >
                <Sparkles size={11} /> {askingAi ? "Searching..." : "Ask AI"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Article Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <form
            onSubmit={handleCreateArticle}
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 border border-slate-100"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                New Knowledge Article
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Title
              </label>
              <input
                required
                placeholder="e.g. How to configure SLA timers"
                value={articleForm.title}
                onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Category
                </label>
                <input
                  required
                  placeholder="General"
                  value={articleForm.categoryName}
                  onChange={(e) => setArticleForm({ ...articleForm, categoryName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Tags (comma separated)
                </label>
                <input
                  placeholder="sla, widget, setup"
                  value={articleForm.tagsInput}
                  onChange={(e) => setArticleForm({ ...articleForm, tagsInput: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                Content
              </label>
              <textarea
                required
                rows={4}
                placeholder="Write article steps or documentation..."
                value={articleForm.content}
                onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-800 resize-none focus:outline-none focus:border-indigo-400"
              />
            </div>

            <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={articleForm.isPublished}
                onChange={(e) => setArticleForm({ ...articleForm, isPublished: e.target.checked })}
                className="rounded border-slate-300 text-indigo-600"
              />
              Publish immediately
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingArticle}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-[10px] font-black uppercase"
              >
                {savingArticle ? "Saving..." : "Publish Article"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
