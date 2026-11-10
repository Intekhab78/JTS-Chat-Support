import { Category } from "../models/Category.js";
import { Website } from "../models/Website.js";
import { broadcastDataChange } from "../services/dataSyncService.js";
import { getOwnedWebsiteIds } from "../utils/roleUtils.js";

export const getCategories = async (req, res) => {
  try {
    const { websiteId } = req.query;
    const filter = {};

    if (websiteId) {
      const owned = await getOwnedWebsiteIds(req.user);
      if (req.user.role !== "admin" && !owned.some(id => String(id) === String(websiteId))) {
        return res.status(403).json({ message: "Access denied: Unauthorized website access" });
      }
      filter.websiteId = websiteId;
    } else if (req.user.role === "client") {
      const owned = await getOwnedWebsiteIds(req.user);
      filter.$or = [{ websiteId: { $in: owned } }, { managerId: req.user._id }];
    } else if (req.user.role === "admin") {
      // Admins see all categories
    } else {
      const owned = await getOwnedWebsiteIds(req.user);
      filter.websiteId = { $in: owned };
    }

    const categories = await Category.find(filter).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, subcategories, websiteId, department, createDashboard } = req.body;
    
    // Verify website ownership
    const owned = await getOwnedWebsiteIds(req.user);
    if (req.user.role !== "admin" && !owned.some(id => String(id) === String(websiteId))) {
      return res.status(403).json({ message: "Access denied: Unauthorized website access" });
    }

    const category = new Category({
      department: String(department || "general").trim().toLowerCase(),
      name,
      subcategories: subcategories || [],
      createDashboard: Boolean(createDashboard),
      websiteId,
      managerId: website.managerId
    });

    await category.save();
    broadcastDataChange({ entity: "category", action: "created", websiteId, data: { id: category._id } });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subcategories, department, createDashboard } = req.body;

    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    // Verify ownership
    if (req.user.role === "client" && category.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (department) category.department = String(department).trim().toLowerCase();
    if (name) category.name = name;
    if (subcategories) category.subcategories = subcategories;
    if (typeof createDashboard !== "undefined") category.createDashboard = Boolean(createDashboard);

    await category.save();
    broadcastDataChange({ entity: "category", action: "updated", websiteId: category.websiteId, data: { id: category._id } });
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    // Verify ownership
    if (req.user.role === "client" && category.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    const websiteId = category.websiteId;
    await Category.findByIdAndDelete(id);
    broadcastDataChange({ entity: "category", action: "deleted", websiteId, data: { id } });
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
