import { Router } from "express";
import * as cannedResponseController from "../controllers/crmCannedResponseController.js";

const router = Router();

router.get("/", cannedResponseController.listCannedResponses);
router.post("/", cannedResponseController.createCannedResponse);
router.delete("/:id", cannedResponseController.deleteCannedResponse);

export default router;
