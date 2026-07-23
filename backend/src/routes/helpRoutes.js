import express from "express";
import { HelpArticle } from "../models/HelpArticle.js";

const router = express.Router();

const INITIAL_ARTICLES = [
  {
    title: "Message Node (Text & Quick Replies)",
    slug: "message-node",
    category: "Node Types",
    nodeType: "message",
    summary: "Sends text responses to website visitors with optional quick reply buttons.",
    content: "The Message node is the fundamental building block of your chatbot flow. It sends text to visitors and presents action buttons. Keep messages under 200 characters for optimal engagement.",
    tags: ["message", "text", "buttons", "nodes"]
  },
  {
    title: "Form Collection Node",
    slug: "form-node",
    category: "Node Types",
    nodeType: "form",
    summary: "Collects structured visitor inputs such as Name, Email, Phone Number, or Dropdown choices.",
    content: "Use the Form node to qualify leads or collect support ticket information. Supported fields include Text, Email, Number, Long Text, and Dropdown Select.",
    tags: ["form", "lead", "email", "input"]
  },
  {
    title: "Action Execution Node",
    slug: "action-node",
    category: "Node Types",
    nodeType: "action",
    summary: "Executes backend actions like escalating chat to live agents or creating CRM leads.",
    content: "Action nodes perform background tasks. Supported actions include Escalate to Live Agent, Create CRM Lead, Create Support Ticket, and Schedule Callback.",
    tags: ["action", "escalate", "crm", "ticket"]
  },
  {
    title: "Condition (IF / THEN) Node",
    slug: "condition-node",
    category: "Node Types",
    nodeType: "condition",
    summary: "Evaluates business logic rules like Agent Online status or Business Hours.",
    content: "Condition nodes branch flow execution dynamically. Always configure both the IF TRUE target and ELSE false target to prevent dead-end bottlenecks.",
    tags: ["condition", "if", "branch", "business hours"]
  },
  {
    title: "Flow Graph Validation & Health Checks",
    slug: "graph-validation",
    category: "Validation",
    summary: "Explains health diagnostics, publish protection, and fixing broken links.",
    content: "The Flow Validation Engine continuously scans your graph for missing root nodes, broken links, dead ends, and orphan nodes. Draft mode allows saving work-in-progress flows with warnings.",
    tags: ["validation", "health", "draft", "publish"]
  }
];

// GET /api/help/articles - Search & list articles
router.get("/articles", async (req, res) => {
  try {
    const { category, search, nodeType } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (nodeType) filter.nodeType = nodeType;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { summary: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } }
      ];
    }

    let articles = await HelpArticle.find(filter).sort({ order: 1, title: 1 });

    // Seed initial articles if empty
    if (articles.length === 0 && !search && !category && !nodeType) {
      await HelpArticle.insertMany(INITIAL_ARTICLES);
      articles = await HelpArticle.find({}).sort({ order: 1, title: 1 });
    }

    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/help/categories - List article categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await HelpArticle.distinct("category");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/help/node/:nodeType - Fetch specific node doc article
router.get("/node/:nodeType", async (req, res) => {
  try {
    let article = await HelpArticle.findOne({ nodeType: req.params.nodeType });
    if (!article) {
      article = INITIAL_ARTICLES.find(a => a.nodeType === req.params.nodeType) || null;
    }
    res.json(article || { title: `${req.params.nodeType} Documentation`, summary: "Node guidance", content: "Details for this node type." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
