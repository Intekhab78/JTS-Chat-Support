import { Router } from "express";
import * as subscriptionController from "../controllers/crmSubscriptionController.js";

const router = Router();

router.get("/", subscriptionController.listSubscriptions);
router.post("/", subscriptionController.createSubscription);
router.put("/:id", subscriptionController.updateSubscription);
router.delete("/:id", subscriptionController.deleteSubscription);
router.post("/cron", subscriptionController.triggerBillingCron); // trigger billing task manually

export default router;
