import { Router } from "express";
import * as pipelineController from "../controllers/crmPipelineController.js";

const router = Router();

router.get("/", pipelineController.listPipelines);
router.post("/", pipelineController.createPipeline);
router.patch("/:id", pipelineController.updatePipeline);
router.delete("/:id", pipelineController.deletePipeline);

export default router;
