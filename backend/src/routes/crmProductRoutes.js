import { Router } from "express";
import * as productController from "../controllers/crmProductController.js";

const router = Router();

// Product CRUD
router.get("/", productController.listProducts);
router.post("/", productController.createProduct);
router.patch("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

// Categories
router.get("/categories", productController.listCategories);
router.post("/categories", productController.createCategory);

export default router;
