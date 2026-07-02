import { Router } from "express";
import * as callController from "../controllers/crmCallController.js";

const router = Router();

router.get("/", callController.listCalls);
router.post("/", callController.createCall);
router.delete("/:id", callController.deleteCall);

export default router;
