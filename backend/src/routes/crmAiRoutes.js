import { Router } from "express";
import * as aiController from "../controllers/crmAiController.js";

const router = Router();

// Prompts
router.get("/prompts", aiController.listPrompts);
router.post("/prompts", aiController.createPrompt);

// Model Config
router.get("/config", aiController.getModelConfig);
router.post("/config", aiController.saveModelConfig);

// RAG Knowledge
router.get("/knowledge", aiController.listKnowledge);
router.post("/knowledge", aiController.createKnowledge);

// Usage Logs
router.get("/usage", aiController.listUsageLogs);

// Inbound Agent Queries
router.post("/query", aiController.runAgentQuery);

export default router;
