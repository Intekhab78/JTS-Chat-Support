import mongoose from "mongoose";
import { Article } from "../models/Article.js";
import { Category } from "../models/Category.js";
import { AiKnowledgeSource } from "../models/AiKnowledgeSource.js";
import { AiUsageLog } from "../models/AiUsageLog.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { assertWebsiteAccess } from "../utils/websiteScope.js";
import {
  buildArticleSlug,
  buildArticleSort,
  chunkText,
  htmlToCleanText,
  normalizeArticleTags,
  validateCrawlUrl
} from "../utils/knowledgeBaseUtils.js";
import { AiProviderManager } from "../services/aiProviderManager.js";
import { logAuditEvent } from "../services/auditService.js";
import { createActivityEvent } from "../services/activityService.js";

async function resolveOwnedWebsiteIds(req) {
  return req.ownedWebsiteIds || await getOwnedWebsiteIds(req.user);
}

function assertObjectId(id, label = "ID") {
  if (!mongoose.Types.ObjectId.isValid(String(id || ""))) {
    throw new AppError(`Invalid ${label}.`, 400);
  }
}

async function findScopedArticle(req, articleId, includeDeleted = false) {
  assertObjectId(articleId, "article ID");
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const query = {
    _id: articleId,
    websiteId: { $in: ownedWebsiteIds }
  };
  if (!includeDeleted) query.deletedAt = null;

  const article = await Article.findOne(query);
  if (!article) throw new AppError("Article not found", 404);
  return { article, ownedWebsiteIds };
}

async function validateCategoryForWebsite(categoryId, websiteId) {
  assertObjectId(categoryId, "category ID");
  const category = await Category.findOne({ _id: categoryId, websiteId }).select("_id name websiteId");
  if (!category) throw new AppError("Category does not belong to this website.", 400);
  return category;
}

async function resolveCategoryForArticle({ categoryId, categoryName, websiteId, userId }) {
  if (categoryId) {
    return validateCategoryForWebsite(categoryId, websiteId);
  }
  const cleanName = String(categoryName || "").trim();
  if (!cleanName) throw new AppError("Category is required.", 400);

  const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let existing = await Category.findOne({
    websiteId,
    parentId: null,
    name: { $regex: `^${escaped}$`, $options: "i" }
  }).select("_id name websiteId");

  if (!existing) {
    existing = await Category.create({
      websiteId,
      name: cleanName,
      department: "general",
      managerId: userId || null
    });
  }
  return existing;
}

async function assertUniqueSlug({ websiteId, slug, excludeId = null }) {
  const query = { websiteId, slug, deletedAt: null };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await Article.findOne(query).select("_id");
  if (existing) throw new AppError("An article with this title already exists for this website.", 409);
}

function serializeArticle(article) {
  return article?.toObject ? article.toObject() : article;
}

async function recordKnowledgeBaseChange({ req, article, action, activityType, summary, metadata = {} }) {
  await Promise.all([
    logAuditEvent({
      actor: req.user,
      action,
      entityType: "article",
      entityId: article._id,
      websiteId: article.websiteId,
      metadata: {
        articleId: String(article._id),
        websiteId: String(article.websiteId),
        timestamp: new Date().toISOString(),
        ...metadata
      },
      ipAddress: req.ip
    }),
    createActivityEvent({
      actor: req.user,
      websiteId: article.websiteId,
      entityType: "article",
      entityId: article._id,
      type: activityType,
      summary,
      metadata
    })
  ]);
}

export const listArticles = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const {
    websiteId,
    categoryId,
    q,
    search,
    published,
    includeArchived = "false",
    page,
    limit = 20,
    sort = "-updatedAt"
  } = req.query;

  const query = {
    websiteId: { $in: ownedWebsiteIds },
    deletedAt: null
  };

  if (websiteId) {
    assertWebsiteAccess(req.user, ownedWebsiteIds, websiteId);
    query.websiteId = websiteId;
  }

  if (categoryId) {
    assertObjectId(categoryId, "category ID");
    query.categoryId = categoryId;
  }

  if (published === "true") query.isPublished = true;
  if (published === "false") query.isPublished = false;
  if (includeArchived !== "true") query.archivedAt = null;

  const searchTerm = String(q || search || "").trim();
  if (searchTerm) {
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const safeRegex = new RegExp(escapedTerm, "i");
    query.$or = [
      { title: safeRegex },
      { content: safeRegex },
      { tags: safeRegex }
    ];
  }

  let articleQuery = Article.find(query)
    .populate("categoryId", "name department")
    .populate("authorId", "name email")
    .sort(buildArticleSort(sort));

  if (page) {
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    articleQuery = articleQuery.skip((parsedPage - 1) * parsedLimit).limit(parsedLimit);

    const [articles, total] = await Promise.all([
      articleQuery,
      Article.countDocuments(query)
    ]);

    return res.json({
      articles: articles.map(serializeArticle),
      pagination: {
        total,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit),
        limit: parsedLimit
      }
    });
  }

  const articles = await articleQuery.limit(100);
  res.json(articles.map(serializeArticle));
});

export const getArticle = asyncHandler(async (req, res) => {
  const { article } = await findScopedArticle(req, req.params.id);
  await article.populate("categoryId", "name department");
  await article.populate("authorId", "name email");
  res.json(serializeArticle(article));
});

export const createArticle = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const { title, content, categoryId, categoryName, websiteId, tags, isPublished } = req.body;

  assertWebsiteAccess(req.user, ownedWebsiteIds, websiteId);
  const category = await resolveCategoryForArticle({
    categoryId,
    categoryName,
    websiteId,
    userId: req.user?._id
  });
  const slug = buildArticleSlug(title);
  if (!slug) throw new AppError("Title must contain at least one alphanumeric character.", 400);
  await assertUniqueSlug({ websiteId, slug });

  const article = await Article.create({
    title,
    slug,
    content,
    categoryId: category._id,
    websiteId,
    authorId: req.user._id,
    tags: normalizeArticleTags(tags),
    isPublished: isPublished !== undefined ? isPublished : true
  });

  await article.populate("categoryId", "name department");
  await article.populate("authorId", "name email");

  await recordKnowledgeBaseChange({
    req,
    article,
    action: "knowledge_base.article_created",
    activityType: "created",
    summary: `Knowledge base article created: ${article.title}`
  });

  res.status(201).json(serializeArticle(article));
});

export const updateArticle = asyncHandler(async (req, res) => {
  const { article, ownedWebsiteIds } = await findScopedArticle(req, req.params.id);
  const updates = { ...req.body };

  const nextWebsiteId = updates.websiteId || article.websiteId;
  assertWebsiteAccess(req.user, ownedWebsiteIds, nextWebsiteId);

  if (updates.categoryId || updates.categoryName || updates.websiteId) {
    const resolvedCategory = await resolveCategoryForArticle({
      categoryId: updates.categoryId || (updates.categoryName ? null : article.categoryId),
      categoryName: updates.categoryName,
      websiteId: nextWebsiteId,
      userId: req.user?._id
    });
    updates.categoryId = resolvedCategory._id;
    delete updates.categoryName;
  }

  if (updates.title) {
    const nextSlug = buildArticleSlug(updates.title);
    if (!nextSlug) throw new AppError("Title must contain at least one alphanumeric character.", 400);
    await assertUniqueSlug({ websiteId: nextWebsiteId, slug: nextSlug, excludeId: article._id });
    updates.slug = nextSlug;
  }

  if (updates.tags !== undefined) {
    updates.tags = normalizeArticleTags(updates.tags);
  }

  Object.assign(article, updates);
  await article.save();
  await article.populate("categoryId", "name department");
  await article.populate("authorId", "name email");

  await recordKnowledgeBaseChange({
    req,
    article,
    action: "knowledge_base.article_updated",
    activityType: "updated",
    summary: `Knowledge base article updated: ${article.title}`,
    metadata: { updatedFields: Object.keys(updates) }
  });

  res.json(serializeArticle(article));
});

export const deleteArticle = asyncHandler(async (req, res) => {
  const { article } = await findScopedArticle(req, req.params.id);

  article.deletedAt = new Date();
  article.deletedBy = req.user._id;
  article.archivedAt = article.archivedAt || article.deletedAt;
  article.archivedBy = article.archivedBy || req.user._id;
  await article.save();

  await recordKnowledgeBaseChange({
    req,
    article,
    action: "knowledge_base.article_deleted",
    activityType: "deleted",
    summary: `Knowledge base article deleted: ${article.title}`
  });

  res.json({ success: true });
});

export const listKnowledgeBaseCategories = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const { websiteId, q } = req.query;
  const query = { websiteId: { $in: ownedWebsiteIds } };

  if (websiteId) {
    assertWebsiteAccess(req.user, ownedWebsiteIds, websiteId);
    query.websiteId = websiteId;
  }

  const searchTerm = String(q || "").trim();
  if (searchTerm) {
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const safeRegex = new RegExp(escapedTerm, "i");
    query.$or = [
      { name: safeRegex },
      { department: safeRegex }
    ];
  }

  const categories = await Category.find(query).sort({ name: 1 }).limit(200);
  res.json(categories.map(serializeArticle));
});

export const publishArticle = asyncHandler(async (req, res) => {
  const { article } = await findScopedArticle(req, req.params.id);
  article.isPublished = true;
  article.archivedAt = null;
  article.archivedBy = null;
  await article.save();

  await recordKnowledgeBaseChange({
    req,
    article,
    action: "knowledge_base.article_published",
    activityType: "status_changed",
    summary: `Knowledge base article published: ${article.title}`
  });

  res.json(serializeArticle(article));
});

export const archiveArticle = asyncHandler(async (req, res) => {
  const { article } = await findScopedArticle(req, req.params.id);
  article.isPublished = false;
  article.archivedAt = new Date();
  article.archivedBy = req.user._id;
  await article.save();

  await recordKnowledgeBaseChange({
    req,
    article,
    action: "knowledge_base.article_archived",
    activityType: "archived",
    summary: `Knowledge base article archived: ${article.title}`
  });

  res.json(serializeArticle(article));
});

export const createKnowledgeBaseCategory = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const { websiteId, name, department = "general" } = req.body;
  if (!websiteId) throw new AppError("Website is required.", 400);
  assertWebsiteAccess(req.user, ownedWebsiteIds, websiteId);

  const cleanName = String(name || "").trim();
  if (!cleanName) throw new AppError("Category name is required.", 400);

  const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = await Category.findOne({
    websiteId,
    parentId: null,
    name: { $regex: `^${escaped}$`, $options: "i" }
  });
  if (existing) return res.json(existing);

  const category = await Category.create({
    websiteId,
    name: cleanName,
    department: String(department || "general").trim().toLowerCase(),
    managerId: req.user._id
  });
  res.status(201).json(category);
});

function resolveScopedWebsiteFilter(req, ownedWebsiteIds, websiteId) {
  if (websiteId) {
    assertWebsiteAccess(req.user, ownedWebsiteIds, websiteId);
    return websiteId;
  }
  return { $in: ownedWebsiteIds };
}

export const getKnowledgeBaseStats = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const websiteFilter = resolveScopedWebsiteFilter(req, ownedWebsiteIds, req.query.websiteId);

  const [articles, sources, queryStats] = await Promise.all([
    Article.find({ websiteId: websiteFilter, deletedAt: null }).select("content isPublished archivedAt views"),
    AiKnowledgeSource.find({ websiteId: websiteFilter }).select("type content chunkCount"),
    AiUsageLog.aggregate([
      {
        $match: {
          websiteId: typeof websiteFilter === "string"
            ? new mongoose.Types.ObjectId(websiteFilter)
            : { $in: ownedWebsiteIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
          promptName: "kb_simulator"
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgLatencyMs: { $avg: "$latencyMs" }
        }
      }
    ])
  ]);

  let publishedArticles = 0;
  let archivedArticles = 0;
  let totalViews = 0;
  let articleChunks = 0;

  for (const a of articles) {
    totalViews += Number(a.views || 0);
    if (a.archivedAt || !a.isPublished) {
      archivedArticles += 1;
    } else {
      publishedArticles += 1;
    }
    articleChunks += chunkText(a.content || "").length;
  }

  let urlSources = 0;
  let documentSources = 0;
  let sourceChunks = 0;

  for (const s of sources) {
    if (s.type === "url") urlSources += 1;
    else documentSources += 1;
    sourceChunks += Number(s.chunkCount || chunkText(s.content || "").length);
  }

  res.json({
    totalArticles: articles.length,
    publishedArticles,
    archivedArticles,
    totalViews,
    totalSources: sources.length,
    urlSources,
    documentSources,
    totalChunks: articleChunks + sourceChunks,
    aiQueriesCount: queryStats[0]?.count || 0,
    avgLatencyMs: queryStats[0]?.avgLatencyMs ? Math.round(queryStats[0].avgLatencyMs) : 0
  });
});

export const listKnowledgeSources = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const websiteFilter = resolveScopedWebsiteFilter(req, ownedWebsiteIds, req.query.websiteId);

  const sources = await AiKnowledgeSource.find({ websiteId: websiteFilter })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(100);

  const normalized = sources.map((s) => {
    const obj = s.toObject();
    return {
      ...obj,
      chunkCount: obj.chunkCount || chunkText(obj.content || "").length,
      sizeBytes: obj.sizeBytes || Buffer.byteLength(obj.content || "", "utf8"),
      status: obj.status || "indexed",
      lastSyncedAt: obj.lastSyncedAt || obj.updatedAt || obj.createdAt
    };
  });

  res.json(normalized);
});

export const createKnowledgeSource = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const { websiteId, name, content, type = "document" } = req.body;
  if (!websiteId) throw new AppError("Website is required.", 400);
  assertWebsiteAccess(req.user, ownedWebsiteIds, websiteId);

  const cleanName = String(name || "").trim();
  const cleanContent = String(content || "").trim();
  if (!cleanName || !cleanContent) {
    throw new AppError("Document title and content are required.", 400);
  }

  const allowedTypes = new Set(["faq", "document", "product", "policy"]);
  const safeType = allowedTypes.has(type) ? type : "document";
  const chunks = chunkText(cleanContent);

  const source = await AiKnowledgeSource.create({
    websiteId,
    name: cleanName.slice(0, 180),
    content: cleanContent.slice(0, 100000),
    type: safeType,
    chunkCount: chunks.length,
    sizeBytes: Buffer.byteLength(cleanContent, "utf8"),
    status: "indexed",
    lastSyncedAt: new Date(),
    createdBy: req.user._id
  });

  res.status(201).json(source);
});

async function fetchAndExtractUrl(targetUrl) {
  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": "JTS-Support-KnowledgeCrawler/1.0",
      "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8"
    },
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    throw new AppError(`Failed to fetch URL (HTTP ${response.status}).`, 400);
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const rawBody = await response.text();
  if (!rawBody.trim()) {
    throw new AppError("The target URL returned empty content.", 400);
  }

  let extractedTitle = "";
  let extractedText = "";

  if (contentType.includes("text/plain") || contentType.includes("application/json")) {
    extractedText = rawBody.trim();
  } else {
    const parsed = htmlToCleanText(rawBody);
    extractedTitle = parsed.title;
    extractedText = parsed.text;
  }

  if (!extractedText || extractedText.length < 20) {
    throw new AppError("Could not extract readable text from this URL (it may require client-side JavaScript rendering).", 400);
  }

  return {
    title: extractedTitle,
    content: extractedText.slice(0, 100000)
  };
}

export const crawlKnowledgeUrl = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const { websiteId, url } = req.body;
  if (!websiteId) throw new AppError("Website is required.", 400);
  assertWebsiteAccess(req.user, ownedWebsiteIds, websiteId);

  const validation = validateCrawlUrl(url);
  if (!validation.valid) {
    throw new AppError(validation.reason, 400);
  }

  const { title, content } = await fetchAndExtractUrl(validation.url);
  const chunks = chunkText(content);
  const displayName = title ? `${title} (${validation.hostname})` : validation.url;

  const existing = await AiKnowledgeSource.findOne({
    websiteId,
    type: "url",
    sourceUrl: validation.url
  });

  if (existing) {
    existing.name = displayName.slice(0, 180);
    existing.content = content;
    existing.chunkCount = chunks.length;
    existing.sizeBytes = Buffer.byteLength(content, "utf8");
    existing.status = "indexed";
    existing.lastSyncedAt = new Date();
    await existing.save();
    return res.json(existing);
  }

  const source = await AiKnowledgeSource.create({
    websiteId,
    name: displayName.slice(0, 180),
    sourceUrl: validation.url,
    content,
    type: "url",
    chunkCount: chunks.length,
    sizeBytes: Buffer.byteLength(content, "utf8"),
    status: "indexed",
    lastSyncedAt: new Date(),
    createdBy: req.user._id
  });

  res.status(201).json(source);
});

export const resyncKnowledgeSource = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  assertObjectId(req.params.id, "source ID");

  const source = await AiKnowledgeSource.findOne({
    _id: req.params.id,
    websiteId: { $in: ownedWebsiteIds }
  });
  if (!source) throw new AppError("Knowledge source not found.", 404);
  if (source.type !== "url" || !source.sourceUrl) {
    throw new AppError("Only URL sources can be re-synced.", 400);
  }

  const validation = validateCrawlUrl(source.sourceUrl);
  if (!validation.valid) throw new AppError(validation.reason, 400);

  const { title, content } = await fetchAndExtractUrl(validation.url);
  source.name = (title ? `${title} (${validation.hostname})` : validation.url).slice(0, 180);
  source.content = content;
  source.chunkCount = chunkText(content).length;
  source.sizeBytes = Buffer.byteLength(content, "utf8");
  source.status = "indexed";
  source.lastSyncedAt = new Date();
  await source.save();

  res.json(source);
});

export const deleteKnowledgeSource = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  assertObjectId(req.params.id, "source ID");

  const deleted = await AiKnowledgeSource.findOneAndDelete({
    _id: req.params.id,
    websiteId: { $in: ownedWebsiteIds }
  });
  if (!deleted) throw new AppError("Knowledge source not found.", 404);

  res.json({ success: true });
});

const STOP_WORDS = new Set([
  "the", "is", "are", "was", "were", "what", "when", "where", "which", "who",
  "how", "can", "could", "should", "would", "do", "does", "did", "for", "with",
  "and", "or", "but", "not", "this", "that", "these", "those", "from", "into",
  "about", "your", "our", "have", "has", "had", "will", "any", "all", "per"
]);

export const queryKnowledgeBase = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  const ownedWebsiteIds = await resolveOwnedWebsiteIds(req);
  const { websiteId, queryText } = req.body;

  if (!websiteId) throw new AppError("Website is required.", 400);
  assertWebsiteAccess(req.user, ownedWebsiteIds, websiteId);

  const safeQuery = String(queryText || "").trim();
  if (!safeQuery) throw new AppError("Query text is required.", 400);

  const [articles, sources] = await Promise.all([
    Article.find({
      websiteId,
      deletedAt: null,
      archivedAt: null,
      isPublished: true
    }).populate("categoryId", "name"),
    AiKnowledgeSource.find({ websiteId })
  ]);

  const queryLower = safeQuery.toLowerCase();
  const terms = [...new Set(
    queryLower
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
  )];

  const scoredChunks = [];

  const scoreItem = ({ id, title, sourceType, content, tags = [] }) => {
    const titleLower = String(title || "").toLowerCase();
    const tagStr = Array.isArray(tags) ? tags.join(" ").toLowerCase() : "";
    const chunks = chunkText(content || "", 500, 80);

    chunks.forEach((chunk, idx) => {
      const chunkLower = chunk.toLowerCase();
      let hits = 0;
      let titleBoost = 0;

      for (const term of terms) {
        if (chunkLower.includes(term)) hits += 1;
        if (titleLower.includes(term) || tagStr.includes(term)) titleBoost += 0.6;
      }

      if (chunkLower.includes(queryLower)) hits += 2;
      if (hits === 0 && titleBoost === 0) return;

      const denominator = Math.max(terms.length, 1);
      const rawScore = Math.min(0.99, (hits + titleBoost * 0.5) / denominator);
      scoredChunks.push({
        id: String(id),
        title,
        sourceType,
        chunkIndex: idx + 1,
        excerpt: chunk,
        score: Number(rawScore.toFixed(2))
      });
    });
  };

  for (const a of articles) {
    scoreItem({
      id: a._id,
      title: a.title,
      sourceType: a.categoryId?.name ? `Article · ${a.categoryId.name}` : "Article",
      content: a.content,
      tags: a.tags
    });
  }

  for (const s of sources) {
    scoreItem({
      id: s._id,
      title: s.name,
      sourceType: `Source · ${String(s.type || "document").toUpperCase()}`,
      content: s.content
    });
  }

  scoredChunks.sort((a, b) => b.score - a.score);
  const topChunks = scoredChunks.slice(0, 4);

  if (topChunks.length === 0) {
    const latencyMs = Date.now() - startedAt;
    return res.json({
      answer: "No matching articles or indexed documents were found for this query in the selected website's Knowledge Base. Try adding an article, crawling a URL, or phrasing the question with different keywords.",
      mode: "no_match",
      confidence: 0,
      matchedChunks: 0,
      latencyMs,
      sources: []
    });
  }

  const topScore = topChunks[0].score;
  const confidence = Math.min(99, Math.max(35, Math.round(topScore * 100)));
  let answer = "";
  let mode = "local_rag";

  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  if (hasGeminiKey) {
    const contextBlock = topChunks
      .map((c, i) => `[Source ${i + 1}: ${c.title} (${c.sourceType})]\n${c.excerpt}`)
      .join("\n\n");

    const prompt = `You are a concise, accurate support AI assistant. Answer the user's question using ONLY the verified knowledge base excerpts below. Do not invent facts outside these excerpts.\n\nKnowledge Base Excerpts:\n${contextBlock}\n\nUser Question: ${safeQuery}\n\nAnswer concisely:`;

    const driver = AiProviderManager.getProvider("gemini");
    const llmResult = await driver.generateCompletion({
      prompt,
      temperature: 0.2,
      maxTokens: 400
    });

    if (llmResult?.text && !llmResult.text.startsWith("Hello! I am your AI assistant")) {
      answer = llmResult.text.trim();
      mode = "gemini_rag";
    }
  }

  if (!answer) {
    const uniqueExcerpts = [];
    const seenIds = new Set();
    for (const c of topChunks) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        uniqueExcerpts.push(c.excerpt);
      }
      if (uniqueExcerpts.length >= 2) break;
    }
    answer = uniqueExcerpts.join("\n\n");
    mode = "local_rag";
  }

  const latencyMs = Math.max(1, Date.now() - startedAt);

  await AiUsageLog.create({
    websiteId,
    userId: req.user._id,
    promptName: "kb_simulator",
    tokensPrompt: Math.ceil(safeQuery.length / 4),
    tokensCompletion: Math.ceil(answer.length / 4),
    cost: 0,
    latencyMs,
    provider: mode === "gemini_rag" ? "gemini" : "local"
  }).catch(() => null);

  res.json({
    answer,
    mode,
    confidence,
    matchedChunks: topChunks.length,
    latencyMs,
    sources: topChunks
  });
});
