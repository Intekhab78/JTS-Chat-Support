import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Book, Plus, Edit2, Trash2, Check, X, Search, Tag, Sparkles,
  FileText, Globe, Upload, RefreshCw, CheckCircle2, Play, Eye,
  Database, Archive, RotateCcw, ChevronLeft, ChevronRight, FileUp,
  AlertCircle, ExternalLink, Clock
} from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

const PAGE_SIZE = 6;

const SOURCE_TYPE_META = {
  url: { label: "Web URL", color: "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20" },
  document: { label: "Document", color: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" },
  policy: { label: "Policy", color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" },
  faq: { label: "FAQ", color: "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20" },
  product: { label: "Product", color: "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20" }
};

function formatBytes(bytes = 0) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function estimateChunks(text = "") {
  const len = String(text || "").trim().length;
  if (!len) return 0;
  return Math.max(1, Math.ceil(len / 420));
}

export default function KnowledgeBaseManager({ websiteId }) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("articles"); // "articles" | "training" | "simulator"
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core DB State
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sources, setSources] = useState([]);
  const [stats, setStats] = useState({
    totalArticles: 0,
    publishedArticles: 0,
    archivedArticles: 0,
    totalViews: 0,
    totalSources: 0,
    urlSources: 0,
    documentSources: 0,
    totalChunks: 0,
    aiQueriesCount: 0,
    avgLatencyMs: 0
  });

  // Articles Filter & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "published" | "archived"
  const [sortBy, setSortBy] = useState("-updatedAt");
  const [currentPage, setCurrentPage] = useState(1);

  // Article Create/Edit Modal
  const [articleModalOpen, setArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [savingArticle, setSavingArticle] = useState(false);
  const [newCategoryMode, setNewCategoryMode] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    categoryId: "",
    categoryName: "",
    content: "",
    tags: "",
    isPublished: true
  });

  // View Modals
  const [viewingArticle, setViewingArticle] = useState(null);
  const [viewingSource, setViewingSource] = useState(null);

  // Sources / Ingestion State
  const [urlInput, setUrlInput] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [resyncingId, setResyncingId] = useState(null);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("document");
  const [docContent, setDocContent] = useState("");
  const [savingSource, setSavingSource] = useState(false);

  // AI Query Simulator State
  const [testQuery, setTestQuery] = useState("");
  const [queryResult, setQueryResult] = useState(null);
  const [querying, setQuerying] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    setQueryResult(null);
    loadAllData();
  }, [websiteId]);

  const loadAllData = async (silent = false) => {
    if (!websiteId) {
      setArticles([]);
      setCategories([]);
      setSources([]);
      setLoading(false);
      return;
    }

    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const qs = `websiteId=${encodeURIComponent(websiteId)}`;
      const [articlesRes, categoriesRes, sourcesRes, statsRes] = await Promise.all([
        api(`/api/knowledge-base/articles?${qs}&includeArchived=true`).catch(() => []),
        api(`/api/knowledge-base/categories?${qs}`).catch(() => []),
        api(`/api/knowledge-base/sources?${qs}`).catch(() => []),
        api(`/api/knowledge-base/stats?${qs}`).catch(() => null)
      ]);

      const normalizedArticles = Array.isArray(articlesRes)
        ? articlesRes
        : (articlesRes?.articles || articlesRes?.data || []);
      const normalizedCategories = Array.isArray(categoriesRes) ? categoriesRes : [];
      const normalizedSources = Array.isArray(sourcesRes) ? sourcesRes : [];

      setArticles(normalizedArticles);
      setCategories(normalizedCategories);
      setSources(normalizedSources);
      if (statsRes && typeof statsRes === "object") {
        setStats(statsRes);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshStats = async () => {
    if (!websiteId) return;
    const statsRes = await api(`/api/knowledge-base/stats?websiteId=${encodeURIComponent(websiteId)}`).catch(() => null);
    if (statsRes && typeof statsRes === "object") setStats(statsRes);
  };

  // ── Article Handlers ──
  const openCreateModal = () => {
    setEditingArticle(null);
    const defaultCatId = categories[0]?._id || "";
    setNewCategoryMode(categories.length === 0);
    setFormData({
      title: "",
      categoryId: defaultCatId,
      categoryName: "",
      content: "",
      tags: "",
      isPublished: true
    });
    setArticleModalOpen(true);
  };

  const openEditModal = (article) => {
    setEditingArticle(article);
    const catId = article.categoryId?._id || article.categoryId || "";
    setNewCategoryMode(false);
    setFormData({
      title: article.title || "",
      categoryId: String(catId),
      categoryName: "",
      content: article.content || "",
      tags: Array.isArray(article.tags) ? article.tags.join(", ") : (article.tags || ""),
      isPublished: article.isPublished !== false && !article.archivedAt
    });
    setArticleModalOpen(true);
  };

  const handleSaveArticle = async (e) => {
    e.preventDefault();
    if (!websiteId) {
      toast.error("Please select a website first.");
      return;
    }
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Article title and content are required.");
      return;
    }
    if (newCategoryMode && !formData.categoryName.trim()) {
      toast.error("Please enter a category name.");
      return;
    }
    if (!newCategoryMode && !formData.categoryId) {
      toast.error("Please select or create a category.");
      return;
    }

    setSavingArticle(true);
    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        websiteId,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        isPublished: Boolean(formData.isPublished),
        ...(newCategoryMode
          ? { categoryName: formData.categoryName.trim() }
          : { categoryId: formData.categoryId })
      };

      if (editingArticle?._id) {
        await api(`/api/knowledge-base/articles/${editingArticle._id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Article updated.");
      } else {
        await api("/api/knowledge-base/articles", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("Article published to Knowledge Base.");
      }

      setArticleModalOpen(false);
      await loadAllData(true);
    } catch (err) {
      toast.error(err?.message || "Failed to save article.");
    } finally {
      setSavingArticle(false);
    }
  };

  const handleTogglePublish = async (article) => {
    const isCurrentlyPublished = article.isPublished && !article.archivedAt;
    const endpoint = isCurrentlyPublished
      ? `/api/knowledge-base/articles/${article._id}/archive`
      : `/api/knowledge-base/articles/${article._id}/publish`;

    try {
      await api(endpoint, { method: "PATCH" });
      toast.success(isCurrentlyPublished ? "Article archived." : "Article published.");
      await loadAllData(true);
    } catch (err) {
      toast.error(err?.message || "Failed to update article status.");
    }
  };

  const handleDeleteArticle = async (article) => {
    if (!window.confirm(`Delete "${article.title}"? This action cannot be undone.`)) return;
    try {
      await api(`/api/knowledge-base/articles/${article._id}`, { method: "DELETE" });
      toast.success("Article deleted.");
      await loadAllData(true);
    } catch (err) {
      toast.error(err?.message || "Failed to delete article.");
    }
  };

  // ── Knowledge Source Handlers ──
  const handleCrawlUrl = async (e) => {
    e.preventDefault();
    if (!websiteId) return toast.error("Please select a website first.");
    if (!urlInput.trim()) return toast.error("Please enter a valid URL.");

    setCrawling(true);
    try {
      await api("/api/knowledge-base/sources/crawl", {
        method: "POST",
        body: JSON.stringify({ websiteId, url: urlInput.trim() })
      });
      setUrlInput("");
      toast.success("Website URL crawled and indexed.");
      await loadAllData(true);
    } catch (err) {
      toast.error(err?.message || "Failed to crawl URL.");
    } finally {
      setCrawling(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "").trim();
      if (!text) {
        toast.error("Selected file is empty.");
        return;
      }
      if (!docTitle.trim()) setDocTitle(file.name);
      setDocContent(text.slice(0, 100000));
      toast.success(`Loaded ${file.name}`);
    };
    reader.onerror = () => toast.error("Could not read the selected file.");
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSaveSource = async (e) => {
    e.preventDefault();
    if (!websiteId) return toast.error("Please select a website first.");
    if (!docTitle.trim() || !docContent.trim()) {
      return toast.error("Document title and content are required.");
    }

    setSavingSource(true);
    try {
      await api("/api/knowledge-base/sources", {
        method: "POST",
        body: JSON.stringify({
          websiteId,
          name: docTitle.trim(),
          type: docType,
          content: docContent.trim()
        })
      });
      setDocTitle("");
      setDocContent("");
      toast.success("Knowledge source indexed.");
      await loadAllData(true);
    } catch (err) {
      toast.error(err?.message || "Failed to save knowledge source.");
    } finally {
      setSavingSource(false);
    }
  };

  const handleResyncSource = async (source) => {
    setResyncingId(source._id);
    try {
      await api(`/api/knowledge-base/sources/${source._id}/resync`, { method: "POST" });
      toast.success("Source re-crawled and updated.");
      await loadAllData(true);
    } catch (err) {
      toast.error(err?.message || "Failed to re-sync URL.");
    } finally {
      setResyncingId(null);
    }
  };

  const handleDeleteSource = async (source) => {
    if (!window.confirm(`Remove "${source.name}" from AI training sources?`)) return;
    try {
      await api(`/api/knowledge-base/sources/${source._id}`, { method: "DELETE" });
      toast.success("Training source removed.");
      await loadAllData(true);
    } catch (err) {
      toast.error(err?.message || "Failed to delete source.");
    }
  };

  // ── AI Query Simulator Handler ──
  const handleRunQuery = async (overrideQuery) => {
    const q = String(overrideQuery ?? testQuery).trim();
    if (!q) return toast.error("Enter a question to test.");
    if (!websiteId) return toast.error("Please select a website first.");
    if (overrideQuery) setTestQuery(overrideQuery);

    setQuerying(true);
    setQueryResult(null);
    try {
      const res = await api("/api/knowledge-base/query", {
        method: "POST",
        body: JSON.stringify({ websiteId, queryText: q })
      });
      setQueryResult(res);
      refreshStats();
    } catch (err) {
      toast.error(err?.message || "Failed to query Knowledge Base.");
    } finally {
      setQuerying(false);
    }
  };

  // ── Filtering, Sorting & Pagination ──
  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = articles.filter((a) => {
      const isPublished = Boolean(a.isPublished && !a.archivedAt);
      if (statusFilter === "published" && !isPublished) return false;
      if (statusFilter === "archived" && isPublished) return false;

      const catId = String(a.categoryId?._id || a.categoryId || "");
      if (selectedCategoryId !== "all" && catId !== selectedCategoryId) return false;

      if (q) {
        const titleMatch = String(a.title || "").toLowerCase().includes(q);
        const contentMatch = String(a.content || "").toLowerCase().includes(q);
        const catMatch = String(a.categoryId?.name || "").toLowerCase().includes(q);
        const tagMatch = Array.isArray(a.tags) && a.tags.some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !contentMatch && !catMatch && !tagMatch) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "-views") return (b.views || 0) - (a.views || 0);
      if (sortBy === "title") return String(a.title || "").localeCompare(String(b.title || ""));
      return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    });
  }, [articles, searchQuery, selectedCategoryId, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedArticles = filteredArticles.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Dynamic quick prompts derived from actual DB content
  const suggestedQueries = useMemo(() => {
    const items = [];
    for (const a of articles.filter((x) => x.isPublished && !x.archivedAt).slice(0, 3)) {
      items.push(`Tell me about ${a.title}`);
    }
    for (const s of sources.slice(0, 2)) {
      items.push(`Summarize ${s.name}`);
    }
    return items.slice(0, 4);
  }, [articles, sources]);

  if (!websiteId) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-10 text-center max-w-xl mx-auto my-6">
        <Book size={28} className="mx-auto text-indigo-500 mb-2" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Website Selected</h3>
        <p className="text-xs text-slate-500 mt-1">
          Select a website from the top-right switcher to manage its Knowledge Base articles, training sources, and AI query testing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* ── TOP KPI SUMMARY BAR (100% REAL DB TELEMETRY) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Knowledge Articles</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">{stats.publishedArticles}</h4>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Published {stats.archivedArticles > 0 ? `· ${stats.archivedArticles} Archived` : ""}
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Book size={17} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Indexed Vector Chunks</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">{stats.totalChunks}</h4>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
                {stats.totalChunks > 0 ? "RAG Ready" : "Empty"}
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Database size={17} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Training Sources</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">{stats.totalSources}</h4>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-1.5 py-0.5 rounded">
                {stats.urlSources} URL · {stats.documentSources} Doc
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Globe size={17} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">AI Query Telemetry</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">{stats.aiQueriesCount}</h4>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">
                {stats.avgLatencyMs > 0 ? `${stats.avgLatencyMs}ms Avg` : "No Runs Yet"}
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sparkles size={17} />
          </div>
        </div>
      </div>

      {/* ── MAIN STUDIO CONTAINER ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Book size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">AI Knowledge Base & Training Studio</h3>
                <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-500/20">
                  Live RAG
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Manage website-scoped articles, crawl URLs, ingest documents, and test AI retrieval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("articles")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "articles"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <FileText size={13} />
                <span>Articles & FAQs</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-white/10">{articles.length}</span>
              </button>
              <button
                onClick={() => setActiveTab("training")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "training"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <Upload size={13} />
                <span>Documents & URLs</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-white/10">{sources.length}</span>
              </button>
              <button
                onClick={() => setActiveTab("simulator")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "simulator"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>AI Query Tester</span>
              </button>
            </div>

            <button
              onClick={() => loadAllData(true)}
              disabled={refreshing}
              title="Refresh Knowledge Base"
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── TAB 1: ARTICLES & FAQS ── */}
        {activeTab === "articles" && (
          <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search title, content, tags..."
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 w-48 sm:w-60"
                  />
                </div>

                <select
                  value={selectedCategoryId}
                  onChange={(e) => { setSelectedCategoryId(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                >
                  <option value="-updatedAt">Recently Updated</option>
                  <option value="-views">Most Viewed</option>
                  <option value="title">Title (A–Z)</option>
                </select>
              </div>

              <button
                onClick={openCreateModal}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-all"
              >
                <Plus size={13} />
                <span>New Article</span>
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-xs text-slate-400">Loading knowledge articles...</div>
            ) : paginatedArticles.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/20">
                <Book size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {articles.length === 0 ? "No knowledge articles yet for this website" : "No articles match your current filters"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {articles.length === 0
                    ? "Create your first FAQ or support article so AI agents and customers can use it."
                    : "Try clearing the search box or switching category/status filters."}
                </p>
                {articles.length === 0 && (
                  <button
                    onClick={openCreateModal}
                    className="mt-3 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Create First Article
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {paginatedArticles.map((article) => {
                    const isPublished = Boolean(article.isPublished && !article.archivedAt);
                    const categoryLabel = article.categoryId?.name || "Uncategorized";
                    const chunks = estimateChunks(article.content);

                    return (
                      <div
                        key={article._id}
                        className="p-3.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/70 transition-all flex flex-col justify-between gap-2"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <h4
                                onClick={() => setViewingArticle(article)}
                                className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 cursor-pointer truncate"
                              >
                                {article.title}
                              </h4>
                              <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-500/20">
                                {categoryLabel}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isPublished
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : "bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-400"
                                }`}>
                                {isPublished ? "Published" : "Archived"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setViewingArticle(article)}
                                className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-500"
                                title="Preview Article"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={() => handleTogglePublish(article)}
                                className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-500"
                                title={isPublished ? "Archive Article" : "Publish Article"}
                              >
                                {isPublished ? <Archive size={12} /> : <RotateCcw size={12} />}
                              </button>
                              <button
                                onClick={() => openEditModal(article)}
                                className="p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-500"
                                title="Edit Article"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteArticle(article)}
                                className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/10 text-rose-500"
                                title="Delete Article"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                            {article.content}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-white/5 text-[10px] text-slate-400">
                          <div className="flex items-center gap-1 flex-wrap min-w-0">
                            <Tag size={10} className="shrink-0" />
                            {Array.isArray(article.tags) && article.tags.length > 0 ? (
                              article.tags.slice(0, 4).map((tag, i) => (
                                <span key={i} className="text-[9px] font-medium bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/5">
                                  #{tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-[9px] text-slate-400">No tags</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span>{chunks} chunk{chunks === 1 ? "" : "s"}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5"><Eye size={10} /> {article.views || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                    <span className="text-[11px] text-slate-400">
                      Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredArticles.length)} of {filteredArticles.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <span className="text-[11px] font-bold px-2 text-slate-700 dark:text-slate-300">
                        {safePage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TAB 2: DOCUMENTS & URL INGESTION ── */}
        {activeTab === "training" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Crawl Website URL */}
              <form onSubmit={handleCrawlUrl} className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe size={15} className="text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Crawl Public URL</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Fetches live page HTML, strips scripts/markup, extracts readable text, and indexes it into MongoDB for AI retrieval.
                  </p>
                  <input
                    type="url"
                    required
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/faq"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={crawling}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {crawling ? <RefreshCw size={12} className="animate-spin" /> : <Globe size={12} />}
                  <span>{crawling ? "Crawling & Indexing..." : "Crawl & Index URL"}</span>
                </button>
              </form>

              {/* Upload File or Paste Document */}
              <form onSubmit={handleSaveSource} className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Upload size={15} className="text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Add Document / Policy</h4>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.csv,.json,.log"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:border-indigo-400 flex items-center gap-1"
                  >
                    <FileUp size={12} />
                    <span>Upload File</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Document Title"
                    className="col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="document">Document</option>
                    <option value="policy">Policy</option>
                    <option value="faq">FAQ</option>
                    <option value="product">Product</option>
                  </select>
                </div>

                <textarea
                  rows={3}
                  required
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Paste policy text, product specs, or upload a .txt / .md / .csv / .json file..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />

                <button
                  type="submit"
                  disabled={savingSource}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingSource ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                  <span>{savingSource ? "Indexing..." : `Save & Index (${estimateChunks(docContent)} chunks)`}</span>
                </button>
              </form>
            </div>

            {/* Active Sources List */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Indexed Knowledge Sources ({sources.length})
              </h4>

              {sources.length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-400">
                  No external documents or crawled URLs added yet for this website.
                </div>
              ) : (
                <div className="space-y-2">
                  {sources.map((src) => {
                    const meta = SOURCE_TYPE_META[src.type] || SOURCE_TYPE_META.document;
                    const syncedDate = src.lastSyncedAt ? new Date(src.lastSyncedAt).toLocaleDateString() : "—";

                    return (
                      <div
                        key={src._id}
                        className="p-3 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-50/40 dark:bg-slate-800/30 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                            {src.type === "url" ? <Globe size={14} /> : <FileText size={14} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                onClick={() => setViewingSource(src)}
                                className="text-xs font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600"
                              >
                                {src.name}
                              </p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${meta.color}`}>
                                {meta.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {formatBytes(src.sizeBytes)} • {src.chunkCount || estimateChunks(src.content)} chunks • Synced {syncedDate}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setViewingSource(src)}
                            className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-500"
                            title="Inspect Extracted Content"
                          >
                            <Eye size={13} />
                          </button>
                          {src.type === "url" && src.sourceUrl && (
                            <button
                              onClick={() => handleResyncSource(src)}
                              disabled={resyncingId === src._id}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
                              title="Re-crawl URL"
                            >
                              <RefreshCw size={13} className={resyncingId === src._id ? "animate-spin" : ""} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSource(src)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/10 text-rose-500"
                            title="Delete Source"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: LIVE AI QUERY TESTER ── */}
        {activeTab === "simulator" && (
          <div className="space-y-3">
            <div className="bg-slate-950 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    Live Knowledge Base Query Tester
                  </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 self-start sm:self-auto">
                  Searches {stats.publishedArticles} Articles + {stats.totalSources} Sources
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRunQuery()}
                  placeholder="Ask a question to test what the AI retrieves from this website's Knowledge Base..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-white outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleRunQuery()}
                  disabled={querying}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
                >
                  {querying ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                  <span>Run Query</span>
                </button>
              </div>

              {suggestedQueries.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 mr-1">Try:</span>
                  {suggestedQueries.map((sq, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRunQuery(sq)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors truncate max-w-[260px]"
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              )}

              {queryResult && (
                <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${queryResult.mode === "no_match" ? "text-amber-400" : "text-emerald-400"
                      }`}>
                      {queryResult.mode === "no_match" ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                      {queryResult.mode === "gemini_rag"
                        ? "Gemini RAG Response"
                        : queryResult.mode === "local_rag"
                          ? "Local Knowledge Match"
                          : "No Matching Knowledge"}
                    </span>
                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                      <span>Match Score: <strong className="text-emerald-400">{queryResult.confidence}%</strong></span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {queryResult.latencyMs}ms</span>
                      <span>{queryResult.matchedChunks} chunk{queryResult.matchedChunks === 1 ? "" : "s"}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                    {queryResult.answer}
                  </p>

                  {Array.isArray(queryResult.sources) && queryResult.sources.length > 0 && (
                    <div className="pt-2.5 border-t border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Retrieved Citations
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {queryResult.sources.map((src, idx) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-indigo-300 truncate">{src.title}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                                {Math.round((src.score || 0) * 100)}%
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 line-clamp-2">{src.excerpt}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT ARTICLE MODAL (CENTERED) ── */}
      {articleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveArticle}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/5">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                {editingArticle ? "Edit Knowledge Article" : "New Knowledge Article"}
              </h4>
              <button
                type="button"
                onClick={() => setArticleModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Article Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. How to reset account password"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category *</label>
                    <button
                      type="button"
                      onClick={() => setNewCategoryMode(!newCategoryMode)}
                      className="text-[10px] font-bold text-indigo-600 hover:underline"
                    >
                      {newCategoryMode ? "Select Existing" : "+ New Category"}
                    </button>
                  </div>
                  {newCategoryMode ? (
                    <input
                      type="text"
                      required
                      value={formData.categoryName}
                      onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                      placeholder="e.g. Billing & Invoices"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  ) : (
                    <select
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    >
                      <option value="">Select category...</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="billing, refund, faq"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Content & AI Instructions *</label>
                  <span className="text-[10px] text-slate-400">
                    {formData.content.length} chars · ~{estimateChunks(formData.content)} chunks
                  </span>
                </div>
                <textarea
                  rows={5}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write clear, accurate documentation for customers and AI agents..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Publish immediately (visible to AI RAG & Help Center)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-slate-800/30">
              <button
                type="button"
                onClick={() => setArticleModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingArticle}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingArticle ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>{editingArticle ? "Save Changes" : "Publish Article"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── VIEW ARTICLE MODAL (CENTERED) ── */}
      {viewingArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/5">
              <div className="min-w-0">
                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{viewingArticle.title}</h4>
                <p className="text-[11px] text-slate-400">
                  {viewingArticle.categoryId?.name || "Uncategorized"} · {viewingArticle.views || 0} views
                </p>
              </div>
              <button
                onClick={() => setViewingArticle(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {viewingArticle.content}
              </p>
              {Array.isArray(viewingArticle.tags) && viewingArticle.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-white/5">
                  {viewingArticle.tags.map((t, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW SOURCE MODAL (CENTERED) ── */}
      {viewingSource && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/5">
              <div className="min-w-0">
                <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{viewingSource.name}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{formatBytes(viewingSource.sizeBytes)}</span>
                  <span>•</span>
                  <span>{viewingSource.chunkCount || estimateChunks(viewingSource.content)} chunks</span>
                  {viewingSource.sourceUrl && (
                    <a
                      href={viewingSource.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-500 hover:underline inline-flex items-center gap-0.5"
                    >
                      Open URL <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewingSource(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <pre className="text-[11px] text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                {viewingSource.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
