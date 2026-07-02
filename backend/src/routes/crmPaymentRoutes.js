import { Router } from "express";
import * as paymentController from "../controllers/crmPaymentController.js";

const router = Router();

router.get("/", paymentController.listPayments);
router.post("/", paymentController.createPayment);
router.post("/refund/:id", paymentController.refundPayment);

export default router;
