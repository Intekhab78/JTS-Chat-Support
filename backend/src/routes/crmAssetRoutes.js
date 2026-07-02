import { Router } from "express";
import * as assetController from "../controllers/crmAssetController.js";

const router = Router();

router.get("/", assetController.listAssets);
router.post("/", assetController.createAsset);

export default router;
