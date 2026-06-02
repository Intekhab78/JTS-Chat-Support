import mongoose from "mongoose";
import dotenv from "dotenv";
import { Size } from "../models/Size.js";
import { Color } from "../models/Color.js";
import { InventoryCategory } from "../models/InventoryCategory.js";
import { InventorySubcategory } from "../models/InventorySubcategory.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Website } from "../models/Website.js";
import { User } from "../models/User.js";

dotenv.config();

async function populate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const targetWebsiteName = process.argv[2] || "";
    let website;
    if (targetWebsiteName) {
      website = await Website.findOne({ websiteName: new RegExp(targetWebsiteName, "i") });
    } else {
      website = await Website.findOne();
    }

    const user = await User.findOne({ role: "admin" }) || await User.findOne();

    if (!website || !user) {
      console.error(`Website "${targetWebsiteName || "any"}" or User not found`);
      process.exit(1);
    }

    const websiteId = website._id;
    const userId = user._id;

    console.log(`Using Website: ${website.websiteName} (${websiteId})`);
    console.log(`Using User: ${user.name} (${userId})`);

    // 1. Categories
    const categoriesData = [
      { name: "Electronics", websiteId },
      { name: "Furniture", websiteId },
      { name: "Apparel", websiteId },
      { name: "Hardware", websiteId },
      { name: "Stationery", websiteId },
      { name: "Networking", websiteId },
      { name: "Kitchenware", websiteId },
      { name: "Safety Gear", websiteId },
      { name: "Cleaning Supplies", websiteId },
      { name: "Office Decor", websiteId }
    ];
    
    await InventoryCategory.deleteMany({ websiteId, name: { $in: categoriesData.map(c => c.name) } });
    const categories = await InventoryCategory.insertMany(categoriesData);
    console.log("Inserted Categories");

    // 2. Subcategories
    const subcategoriesData = [
      { name: "Laptops", categoryId: categories[0]._id, websiteId },
      { name: "Monitors", categoryId: categories[0]._id, websiteId },
      { name: "Printers", categoryId: categories[0]._id, websiteId },
      { name: "Chairs", categoryId: categories[1]._id, websiteId },
      { name: "Desks", categoryId: categories[1]._id, websiteId },
      { name: "Storage Cabinets", categoryId: categories[1]._id, websiteId },
      { name: "T-Shirts", categoryId: categories[2]._id, websiteId },
      { name: "Uniforms", categoryId: categories[2]._id, websiteId },
      { name: "Tools", categoryId: categories[3]._id, websiteId },
      { name: "Fasteners", categoryId: categories[3]._id, websiteId },
      { name: "Notebooks", categoryId: categories[4]._id, websiteId },
      { name: "Pens & Markers", categoryId: categories[4]._id, websiteId },
      { name: "Routers", categoryId: categories[5]._id, websiteId },
      { name: "Cables", categoryId: categories[5]._id, websiteId },
      { name: "Coffee Makers", categoryId: categories[6]._id, websiteId },
      { name: "Helmets", categoryId: categories[7]._id, websiteId },
      { name: "Gloves", categoryId: categories[7]._id, websiteId }
    ];
    await InventorySubcategory.deleteMany({ websiteId, name: { $in: subcategoriesData.map(s => s.name) } });
    const subcategories = await InventorySubcategory.insertMany(subcategoriesData);
    console.log("Inserted Subcategories");

    // 3. Sizes
    const sizesData = [
      { name: "XS", websiteId },
      { name: "Small", websiteId },
      { name: "Medium", websiteId },
      { name: "Large", websiteId },
      { name: "XL", websiteId },
      { name: "XXL", websiteId },
      { name: "14-inch", websiteId },
      { name: "15.6-inch", websiteId },
      { name: "24-inch", websiteId },
      { name: "27-inch", websiteId },
      { name: "Standard", websiteId },
      { name: "Compact", websiteId },
      { name: "1 Meter", websiteId },
      { name: "5 Meters", websiteId },
      { name: "10 Meters", websiteId }
    ];
    await Size.deleteMany({ websiteId, name: { $in: sizesData.map(s => s.name) } });
    const sizes = await Size.insertMany(sizesData);
    console.log("Inserted Sizes");

    // 4. Colors
    const colorsData = [
      { name: "Black", websiteId },
      { name: "Silver", websiteId },
      { name: "Blue", websiteId },
      { name: "Red", websiteId },
      { name: "White", websiteId },
      { name: "Grey", websiteId },
      { name: "Navy Blue", websiteId },
      { name: "Charcoal", websiteId },
      { name: "Green", websiteId },
      { name: "Yellow", websiteId },
      { name: "Orange", websiteId },
      { name: "Gold", websiteId },
      { name: "Transparent", websiteId },
      { name: "Brown", websiteId },
      { name: "Beige", websiteId }
    ];
    await Color.deleteMany({ websiteId, name: { $in: colorsData.map(c => c.name) } });
    const colors = await Color.insertMany(colorsData);
    console.log("Inserted Colors");

    // 5. Items
    const itemsData = [
      {
        name: "Dell Latitude 5420",
        sku: "LAP-DELL-5420-BLK",
        categoryId: categories[0]._id,
        subcategoryId: subcategories[0]._id,
        sizeId: sizes[7]._id,
        colorId: colors[0]._id,
        brand: "Dell",
        unitCost: 55000,
        quantity: 10,
        reorderLevel: 2,
        websiteId,
        createdBy: userId
      },
      {
        name: "LG Ultragear Monitor",
        sku: "MON-LG-24-BLK",
        categoryId: categories[0]._id,
        subcategoryId: subcategories[1]._id,
        sizeId: sizes[8]._id,
        colorId: colors[0]._id,
        brand: "LG",
        unitCost: 18000,
        quantity: 5,
        reorderLevel: 1,
        websiteId,
        createdBy: userId
      },
      {
        name: "Office Ergonomic Chair",
        sku: "FUR-CHAIR-ERG-BLU",
        categoryId: categories[1]._id,
        subcategoryId: subcategories[3]._id,
        sizeId: sizes[10]._id,
        colorId: colors[2]._id,
        brand: "Featherlite",
        unitCost: 12000,
        quantity: 15,
        reorderLevel: 5,
        websiteId,
        createdBy: userId
      },
      {
        name: "Executive Wooden Desk",
        sku: "FUR-DESK-EXE-BRN",
        categoryId: categories[1]._id,
        subcategoryId: subcategories[4]._id,
        sizeId: sizes[3]._id,
        colorId: colors[13]._id,
        brand: "Godrej",
        unitCost: 25000,
        quantity: 3,
        reorderLevel: 1,
        websiteId,
        createdBy: userId
      },
      {
        name: "Cotton Polo T-Shirt",
        sku: "APP-POLO-TSH-RED",
        categoryId: categories[2]._id,
        subcategoryId: subcategories[6]._id,
        sizeId: sizes[2]._id,
        colorId: colors[3]._id,
        brand: "Levi's",
        unitCost: 1500,
        quantity: 50,
        reorderLevel: 10,
        websiteId,
        createdBy: userId
      },
      {
        name: "Safety Helmet",
        sku: "SAF-HELMET-YEL",
        categoryId: categories[7]._id,
        subcategoryId: subcategories[15]._id,
        sizeId: sizes[10]._id,
        colorId: colors[9]._id,
        brand: "3M",
        unitCost: 1200,
        quantity: 30,
        reorderLevel: 5,
        websiteId,
        createdBy: userId
      },
      {
        name: "Nitric Gloves",
        sku: "SAF-GLOVE-BLU",
        categoryId: categories[7]._id,
        subcategoryId: subcategories[16]._id,
        sizeId: sizes[3]._id,
        colorId: colors[2]._id,
        brand: "Honeywell",
        unitCost: 350,
        quantity: 100,
        reorderLevel: 20,
        websiteId,
        createdBy: userId
      },
      {
        name: "Cat6 Ethernet Cable",
        sku: "NET-CABLE-10M-GRY",
        categoryId: categories[5]._id,
        subcategoryId: subcategories[13]._id,
        sizeId: sizes[14]._id,
        colorId: colors[5]._id,
        brand: "D-Link",
        unitCost: 800,
        quantity: 40,
        reorderLevel: 10,
        websiteId,
        createdBy: userId
      },
      {
        name: "Wireless Router AC1200",
        sku: "NET-ROUTER-TP-WHT",
        categoryId: categories[5]._id,
        subcategoryId: subcategories[12]._id,
        sizeId: sizes[11]._id,
        colorId: colors[4]._id,
        brand: "TP-Link",
        unitCost: 3200,
        quantity: 12,
        reorderLevel: 3,
        websiteId,
        createdBy: userId
      },
      {
        name: "Drip Coffee Maker",
        sku: "KIT-COFFEE-PHI-SLV",
        categoryId: categories[6]._id,
        subcategoryId: subcategories[14]._id,
        sizeId: sizes[11]._id,
        colorId: colors[1]._id,
        brand: "Philips",
        unitCost: 4500,
        quantity: 6,
        reorderLevel: 2,
        websiteId,
        createdBy: userId
      }
    ];
    
    // Clear items with these SKUs
    await InventoryItem.deleteMany({ websiteId, sku: { $in: itemsData.map(i => i.sku) } });
    await InventoryItem.insertMany(itemsData);
    console.log("Inserted Items");

    console.log("Population completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("Error populating data:", err);
    process.exit(1);
  }
}

populate();
