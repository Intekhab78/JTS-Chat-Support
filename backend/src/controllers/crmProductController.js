import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { PERMISSIONS, requirePermission } from "../utils/permissions.js";

// -- Category Endpoints --
export const listCategories = asyncHandler(async (req, res) => {
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const { websiteId } = req.query;
  const validWebsiteId = (websiteId && websiteId !== "undefined" && websiteId !== "null" && String(websiteId).trim() !== "") ? String(websiteId).trim() : null;

  const query = {};
  if (validWebsiteId) {
    query.websiteId = validWebsiteId;
  } else if (ownedWebsiteIds && ownedWebsiteIds.length > 0) {
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

  let path = `/${name}`;
  if (parentId) {
    const parent = await Category.findById(parentId);
    if (parent) {
      path = `${parent.path}/${name}`;
    }
  }

  const category = await Category.create({
    websiteId: resolvedWebsiteId || null,
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
  const { search, websiteId, category, page = 1, limit = 100 } = req.query;
  const validWebsiteId = (websiteId && websiteId !== "undefined" && websiteId !== "null" && String(websiteId).trim() !== "") ? String(websiteId).trim() : null;

  const query = {};
  const invQuery = { isDeleted: { $ne: true } };

  if (validWebsiteId) {
    query.websiteId = validWebsiteId;
    invQuery.websiteId = validWebsiteId;
  } else if (ownedWebsiteIds && ownedWebsiteIds.length > 0) {
    query.websiteId = { $in: ownedWebsiteIds };
    invQuery.websiteId = { $in: ownedWebsiteIds };
  }

  if (category) query.category = category;
  if (search && search.trim() !== "") {
    const searchRegex = new RegExp(search.trim(), "i");
    query.$or = [
      { name: searchRegex },
      { sku: searchRegex },
      { brand: searchRegex }
    ];
    invQuery.$or = [
      { name: searchRegex },
      { sku: searchRegex }
    ];
  }

  const products = await Product.find(query).sort({ name: 1 }).lean();
  const inventoryItems = await InventoryItem.find(invQuery).sort({ name: 1 }).lean();

  const mappedInv = inventoryItems.map(item => ({
    _id: item._id,
    sku: item.sku || `INV-${item.name.substring(0, 3).toUpperCase()}`,
    name: item.name,
    type: "service",
    category: item.category || "General Services",
    brand: item.brand || "JTS Support",
    price: item.unitCost || item.price || 0,
    cost: item.unitCost || 0,
    taxRate: item.taxRate || 5,
    unit: item.unit || "pcs",
    status: "active",
    description: item.description || `${item.name} service catalog item`
  }));

  // Combine products and inventory items, avoiding duplicates by SKU or Name
  const existingSkus = new Set(products.map(p => p.sku));
  const existingNames = new Set(products.map(p => p.name?.toLowerCase()));

  const uniqueInv = mappedInv.filter(i => !existingSkus.has(i.sku) && !existingNames.has(i.name?.toLowerCase()));
  const allItems = [...products, ...uniqueInv];

  const total = allItems.length;

  res.json({
    products: allItems,
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

// -- Product Variant Endpoints --
export const addVariant = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  let product = await Product.findById(req.params.id);

  if (!product) {
    const invItem = await InventoryItem.findById(req.params.id);
    if (invItem) {
      const targetWebsiteId = invItem.websiteId || ownedWebsiteIds[0];
      const existingProd = await Product.findOne({ websiteId: targetWebsiteId, sku: invItem.sku });
      if (existingProd) {
        product = existingProd;
      } else {
        product = await Product.create({
          websiteId: targetWebsiteId,
          sku: invItem.sku || `INV-${invItem.name.substring(0, 3).toUpperCase()}`,
          name: invItem.name,
          type: "service",
          category: invItem.category || "General Services",
          brand: invItem.brand || "JTS Support",
          price: invItem.unitCost || 0,
          cost: invItem.unitCost || 0,
          taxRate: 5,
          unit: invItem.unit || "pcs",
          status: "active",
          description: invItem.description || "",
          hasVariants: true,
          variantItems: []
        });
      }
    } else {
      throw new AppError("Product not found", 404);
    }
  }

  if (!ownedWebsiteIds.map(id => id.toString()).includes(product.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const { sku, variantName, price, costPrice, stockQuantity, attributes, barcode } = req.body;
  if (!variantName || price === undefined) {
    throw new AppError("Variant name and price are required", 400);
  }

  const generatedSku = sku || `${product.sku}-${(product.variantItems?.length || 0) + 1}`;
  product.hasVariants = true;
  product.variantItems.push({
    sku: generatedSku,
    variantName,
    attributes: attributes || [],
    price: parseFloat(price) || 0,
    costPrice: parseFloat(costPrice) || 0,
    stockQuantity: parseInt(stockQuantity) || 0,
    barcode: barcode || ""
  });

  await product.save();
  res.status(201).json(product);
});

export const updateVariant = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_UPDATE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const product = await Product.findById(req.params.id);

  if (!product) throw new AppError("Product not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(product.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  const variant = product.variantItems.id(req.params.variantId);
  if (!variant) throw new AppError("Variant not found", 404);

  Object.assign(variant, req.body);
  await product.save();
  res.json(product);
});

export const deleteVariant = asyncHandler(async (req, res) => {
  requirePermission(req.user, PERMISSIONS.CRM_DELETE);
  const ownedWebsiteIds = await getOwnedWebsiteIds(req.user);
  const product = await Product.findById(req.params.id);

  if (!product) throw new AppError("Product not found", 404);
  if (!ownedWebsiteIds.map(id => id.toString()).includes(product.websiteId.toString())) {
    throw new AppError("Unauthorized access", 403);
  }

  product.variantItems.pull({ _id: req.params.variantId });
  if (product.variantItems.length === 0) product.hasVariants = false;

  await product.save();
  res.json(product);
});
