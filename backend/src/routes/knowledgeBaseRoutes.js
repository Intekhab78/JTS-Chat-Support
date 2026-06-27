import { Router } from "express";
import {
  archiveArticle,
  createArticle,
  deleteArticle,
  getArticle,
  listArticles,
  listKnowledgeBaseCategories,
  publishArticle,
  updateArticle
} from "../controllers/knowledgeBaseController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { attachOwnedWebsiteIds } from "../middleware/attachOwnedWebsiteIds.js";
import { validate, createKnowledgeBaseArticleSchema, updateKnowledgeBaseArticleSchema } from "../utils/validators.js";

const router = Router();

router.use(requireAuth);
router.use(attachOwnedWebsiteIds);

const readRoles = requireRole("admin", "client", "manager", "agent", "sales", "purchase", "accounts", "user");
const writeRoles = requireRole("admin", "client", "manager");

router.get("/", readRoles, listArticles);
router.get("/search", readRoles, listArticles);
router.get("/categories", readRoles, listKnowledgeBaseCategories);
router.post("/", writeRoles, validate(createKnowledgeBaseArticleSchema), createArticle);

// Existing frontend aliases.
router.get("/articles", readRoles, listArticles);
router.post("/articles", writeRoles, validate(createKnowledgeBaseArticleSchema), createArticle);
router.get("/articles/:id", readRoles, getArticle);
router.put("/articles/:id", writeRoles, validate(updateKnowledgeBaseArticleSchema), updateArticle);
router.delete("/articles/:id", writeRoles, deleteArticle);
router.patch("/articles/:id/publish", writeRoles, publishArticle);
router.patch("/articles/:id/archive", writeRoles, archiveArticle);

router.get("/:id", readRoles, getArticle);
router.put("/:id", writeRoles, validate(updateKnowledgeBaseArticleSchema), updateArticle);
router.delete("/:id", writeRoles, deleteArticle);
router.patch("/:id/publish", writeRoles, publishArticle);
router.patch("/:id/archive", writeRoles, archiveArticle);

export default router;
