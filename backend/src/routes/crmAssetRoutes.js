import { Router } from "express";
import * as assetController from "../controllers/crmAssetController.js";

const router = Router();

router.get("/", assetController.listAssets);
router.post("/", assetController.createAsset);
router.put("/:id", assetController.updateAsset);
router.delete("/:id", assetController.deleteAsset);

export default router;
