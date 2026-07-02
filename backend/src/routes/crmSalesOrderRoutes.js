import { Router } from "express";
import * as salesOrderController from "../controllers/crmSalesOrderController.js";

const router = Router();

router.get("/", salesOrderController.listSalesOrders);
router.post("/", salesOrderController.createSalesOrder);
router.patch("/:id/status", salesOrderController.updateSalesOrderStatus);
router.post("/convert/:quoteId", salesOrderController.convertQuotationToOrder);

export default router;
