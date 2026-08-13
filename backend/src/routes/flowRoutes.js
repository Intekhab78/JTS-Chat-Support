import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getFlows, getFlowById, createFlow, updateFlow, deleteFlow } from "../controllers/flowController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getFlows);
router.get("/:id", getFlowById);
router.post("/", createFlow);
router.put("/:id", updateFlow);
router.delete("/:id", deleteFlow);

export default router;
