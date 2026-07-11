import { Router } from "express";
import * as ctrl from "../controllers/meetingPlatformController.js";

const router = Router();

router.get("/", ctrl.listPlatforms);             // public list (active only) — for calendar form dropdown
router.get("/all", ctrl.listAllPlatforms);        // admin list (all including inactive)
router.post("/", ctrl.createPlatform);            // create new platform
router.patch("/:id", ctrl.updatePlatform);        // update platform
router.delete("/:id", ctrl.deletePlatform);       // delete platform
router.post("/generate-link", ctrl.generateRoomLink); // generate room link on demand

export default router;
