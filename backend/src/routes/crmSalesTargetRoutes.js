import { Router } from "express";
import * as salesTargetController from "../controllers/crmSalesTargetController.js";

const router = Router();

router.get("/", salesTargetController.listTargets);
router.post("/", salesTargetController.saveTarget);
router.delete("/:id", salesTargetController.deleteTarget);

export default router;
