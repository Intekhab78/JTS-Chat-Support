import { Router } from "express";
import * as debitNoteController from "../controllers/crmDebitNoteController.js";

const router = Router();

router.get("/", debitNoteController.listDebitNotes);
router.post("/", debitNoteController.createDebitNote);
router.patch("/:id", debitNoteController.updateDebitNoteStatus);

export default router;
