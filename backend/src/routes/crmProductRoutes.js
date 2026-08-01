import { Router } from "express";
import * as productController from "../controllers/crmProductController.js";

const router = Router();

// Product CRUD
router.get("/", productController.listProducts);
router.post("/", productController.createProduct);
router.patch("/:id", productController.updateProduct);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

// Product Variants
router.post("/:id/variants", productController.addVariant);
router.patch("/:id/variants/:variantId", productController.updateVariant);
router.put("/:id/variants/:variantId", productController.updateVariant);
router.delete("/:id/variants/:variantId", productController.deleteVariant);

// Categories
router.get("/categories", productController.listCategories);
router.post("/categories", productController.createCategory);

export default router;
