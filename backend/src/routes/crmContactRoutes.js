import { Router } from "express";
import * as contactController from "../controllers/crmContactController.js";

const router = Router();

router.get("/", contactController.listContacts);
router.post("/", contactController.createContact);
router.get("/:id", contactController.getContactDetails);
router.patch("/:id", contactController.updateContact);
router.delete("/:id", contactController.deleteContact);

export default router;
