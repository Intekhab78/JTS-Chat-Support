import { Router } from "express";
import * as creditNoteController from "../controllers/crmCreditNoteController.js";

const router = Router();

router.get("/", creditNoteController.listCreditNotes);
router.post("/", creditNoteController.createCreditNote);

export default router;
