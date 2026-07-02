import { Router } from "express";
import * as companyController from "../controllers/crmCompanyController.js";

const router = Router();

router.get("/", companyController.listCompanies);
router.post("/", companyController.createCompany);
router.get("/:id", companyController.getCompanyDetails);
router.patch("/:id", companyController.updateCompany);
router.delete("/:id", companyController.deleteCompany);

export default router;
