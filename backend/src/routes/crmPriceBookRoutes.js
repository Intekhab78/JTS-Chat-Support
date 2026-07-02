import { Router } from "express";
import * as priceBookController from "../controllers/crmPriceBookController.js";

const router = Router();

router.get("/", priceBookController.listPriceBooks);
router.post("/", priceBookController.createPriceBook);
router.patch("/:id", priceBookController.updatePriceBook);
router.delete("/:id", priceBookController.deletePriceBook);

export default router;
