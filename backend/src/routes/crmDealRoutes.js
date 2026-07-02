import { Router } from "express";
import * as dealController from "../controllers/crmDealController.js";

const router = Router();

router.get("/", dealController.listDeals);
router.post("/", dealController.createDeal);
router.get("/:id", dealController.getDealDetails);
router.patch("/:id", dealController.updateDeal);
router.delete("/:id", dealController.deleteDeal);

export default router;
