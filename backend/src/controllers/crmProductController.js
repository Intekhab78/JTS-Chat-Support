import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

// -- Category Endpoints --
export const listCategories = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  const categories = await Category.find(query).sort({ path: 1, name: 1 });
  res.json(categories);
});

export const createCategory = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, name, parentId } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access", 403);
  }

  let path = `/${name}`;
  if (parentId) {
    const parent = await Category.findById(parentId);
    if (parent) {
      path = `${parent.path}/${name}`;
    }
  }

  const category = await Category.create({
    websiteId: resolvedWebsiteId,
    name,
    parentId: parentId || null,
    path
  });

  res.status(201).json(category);
});

// -- Product Endpoints --
export const listProducts = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_VIEW);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { search, websiteId, category, page = 1, limit = 50 } = req.query;

  if (ownedWebsiteIds.length === 0) {
    return res.json({ products: [], pagination: { total: 0, page: 1, pages: 0 } });
  }

  const query = {};
  if (websiteId) {
    if (!ownedWebsiteIds.map(id => id.toString()).includes(websiteId)) {
      throw new AppError("Unauthorized access", 403);
    }
    query.websiteId = websiteId;
  } else {
    query.websiteId = { $in: ownedWebsiteIds };
  }

  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: new RegExp(search, "i") },
      { sku: new RegExp(search, "i") },
      { brand: new RegExp(search, "i") }
    ];
  }

  const products = await Product.find(query)
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Product.countDocuments(query);

  res.json({
    products,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    }
  });
});

export const createProduct = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_CREATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId, sku } = req.body;

  let resolvedWebsiteId = websiteId;
  if (!resolvedWebsiteId && ownedWebsiteIds.length > 0) resolvedWebsiteId = ownedWebsiteIds[0];
  if (!resolvedWebsiteId || !ownedWebsiteIds.map(id => id.toString()).includes(String(resolvedWebsiteId))) {
    throw new AppError("Unauthorized access", 403);
  }

  // Check unique SKU
  const existing = await Product.findOne({ websiteId: resolvedWebsiteId, sku });
  if (existing) throw new AppError(`A product with SKU ${sku} already exists`, 409);

  const product = await Product.create({
    ...req.body,
    websiteId: resolvedWebsiteId
  });

  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const product = await Product.findById(req.params.id);

  if (!product) throw new AppError("Product not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(product.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const product = await Product.findById(req.params.id);

  if (!product) throw new AppError("Product not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(product.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Product deleted successfully" });
});
