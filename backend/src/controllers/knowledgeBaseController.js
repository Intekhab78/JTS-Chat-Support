import mongoose from "mongoose";
import { Article } from "../models/Article.js";
import { Category } from "../models/Category.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import { assertWebsiteAccess } from "../utils/websiteScope.js";
import { buildArticleSlug, buildArticleSort, normalizeArticleTags } from "../utils/knowledgeBaseUtils.js";
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
    query.$or = [
      { title: new RegExp(searchTerm, "i") },
      { content: new RegExp(searchTerm, "i") },
      { tags: new RegExp(searchTerm, "i") }
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
  const { title, content, categoryId, websiteId, tags, isPublished } = req.body;

  assertWebsiteAccess(req.user, ownedWebsiteIds, websiteId);
  const category = await validateCategoryForWebsite(categoryId, websiteId);
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

  if (updates.categoryId || updates.websiteId) {
    await validateCategoryForWebsite(updates.categoryId || article.categoryId, nextWebsiteId);
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
    query.$or = [
      { name: new RegExp(searchTerm, "i") },
      { department: new RegExp(searchTerm, "i") }
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
