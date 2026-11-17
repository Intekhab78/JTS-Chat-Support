import { Router } from "express";
import * as aiController from "../controllers/crmAiController.js";

const router = Router();

// Prompts
router.get("/prompts", aiController.listPrompts);
router.post("/prompts", aiController.createPrompt);
router.put("/prompts/:id", aiController.updatePrompt);
router.delete("/prompts/:id", aiController.deletePrompt);

// Model Config
router.get("/config", aiController.getModelConfig);
router.post("/config", aiController.saveModelConfig);

// RAG Knowledge
router.get("/knowledge", aiController.listKnowledge);
router.post("/knowledge", aiController.createKnowledge);
router.put("/knowledge/:id", aiController.updateKnowledge);
router.delete("/knowledge/:id", aiController.deleteKnowledge);

// Usage Logs
router.get("/usage", aiController.listUsageLogs);

// Inbound Agent Queries
router.post("/query", aiController.runAgentQuery);

export default router;
