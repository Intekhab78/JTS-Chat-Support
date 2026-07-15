import { Router } from "express";
import { calculateStateTax } from "../utils/taxCalculator.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.get("/calculate", asyncHandler(async (req, res) => {
  const { state = "", country = "India", subtotal = 0 } = req.query;
  const result = calculateStateTax(Number(subtotal), state, country);
  res.json(result);
}));

export default router;
