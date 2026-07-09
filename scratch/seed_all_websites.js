import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname } from "path";
import bcrypt from "bcryptjs";

// Models
import { Website } from "../backend/src/models/Website.js";
import { InventoryCategory } from "../backend/src/models/InventoryCategory.js";
import { InventorySubcategory } from "../backend/src/models/InventorySubcategory.js";
import { Brand } from "../backend/src/models/Brand.js";
import { Size } from "../backend/src/models/Size.js";
import { Color } from "../backend/src/models/Color.js";
import { Unit } from "../backend/src/models/Unit.js";
import { Supplier } from "../backend/src/models/Supplier.js";
import { User } from "../backend/src/models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: dirname(__dirname) + "/backend/.env" });

async function seed() {
  const uri = process.env.MONGODB_URI;
  console.log("Connecting to:", uri);
  await mongoose.connect(uri);
  console.log("Database connected successfully!");

  const websites = await Website.find({});
  if (websites.length === 0) {
    console.error("No websites found in database.");
    process.exit(1);
  }

  const creator = await User.findOne({ role: { $in: ["admin", "client"] } });
  const createdBy = creator ? creator._id : new mongoose.Types.ObjectId();
  const hashedPassword = await bcrypt.hash("DefaultPassword123!", 12);

  for (const website of websites) {
    const websiteId = website._id;
    console.log(`\n--- Seeding for Website: ${website.websiteName} (ID: ${websiteId}) ---`);

    // 1. Categories
    const categoriesData = [
      { name: "Electronics", websiteId, isActive: true },
      { name: "Apparel & Clothing", websiteId, isActive: true },
      { name: "Office Stationery", websiteId, isActive: true },
      { name: "Industrial Tools", websiteId, isActive: true },
      { name: "Home Appliances", websiteId, isActive: true }
    ];
    
    const createdCategories = [];
    for (const cat of categoriesData) {
      let doc = await InventoryCategory.findOne({ websiteId, name: cat.name });
      if (!doc) {
        doc = await InventoryCategory.create(cat);
        console.log(`+ Created Category: ${cat.name}`);
      } else {
        console.log(`= Category already exists: ${cat.name}`);
      }
      createdCategories.push(doc);
    }

    // 2. Subcategories
    if (createdCategories.length > 0) {
      const subCategoryData = [
        { name: "Mobile Phones", categoryId: createdCategories[0]._id, websiteId, isActive: true },
        { name: "Laptops & Notebooks", categoryId: createdCategories[0]._id, websiteId, isActive: true },
        { name: "Computer Keyboards", categoryId: createdCategories[2]._id, websiteId, isActive: true },
        { name: "Hand Tools", categoryId: createdCategories[3]._id, websiteId, isActive: true },
        { name: "Microwave Ovens", categoryId: createdCategories[4]._id, websiteId, isActive: true }
      ];

      for (const sub of subCategoryData) {
        const doc = await InventorySubcategory.findOne({ websiteId, name: sub.name });
        if (!doc) {
          await InventorySubcategory.create(sub);
          console.log(`+ Created Subcategory: ${sub.name}`);
        } else {
          console.log(`= Subcategory already exists: ${sub.name}`);
        }
      }
    }

    // 3. Brands
    const brandData = [
      { name: "Apple Inc.", websiteId, isActive: true },
      { name: "Samsung Global", websiteId, isActive: true },
      { name: "Dell Enterprise", websiteId, isActive: true },
      { name: "Sony Corp", websiteId, isActive: true },
      { name: "HP Technologies", websiteId, isActive: true }
    ];

    for (const brand of brandData) {
      const doc = await Brand.findOne({ websiteId, name: brand.name });
      if (!doc) {
        await Brand.create(brand);
        console.log(`+ Created Brand: ${brand.name}`);
      } else {
        console.log(`= Brand already exists: ${brand.name}`);
      }
    }

    // 4. Sizes
    const sizeData = [
      { name: "Small (S)", websiteId, isActive: true },
      { name: "Medium (M)", websiteId, isActive: true },
      { name: "Large (L)", websiteId, isActive: true },
      { name: "Extra Large (XL)", websiteId, isActive: true },
      { name: "Standard (STD)", websiteId, isActive: true }
    ];

    for (const size of sizeData) {
      const doc = await Size.findOne({ websiteId, name: size.name });
      if (!doc) {
        await Size.create(size);
        console.log(`+ Created Size: ${size.name}`);
      } else {
        console.log(`= Size already exists: ${size.name}`);
      }
    }

    // 5. Colors
    const colorData = [
      { name: "Matte Black", websiteId, isActive: true },
      { name: "Space Grey", websiteId, isActive: true },
      { name: "Pearl White", websiteId, isActive: true },
      { name: "Royal Blue", websiteId, isActive: true },
      { name: "Silver Grey", websiteId, isActive: true }
    ];

    for (const color of colorData) {
      const doc = await Color.findOne({ websiteId, name: color.name });
      if (!doc) {
        await Color.create(color);
        console.log(`+ Created Color: ${color.name}`);
      } else {
        console.log(`= Color already exists: ${color.name}`);
      }
    }

    // 6. Units
    const unitData = [
      { name: "pieces (pcs)", websiteId, isActive: true },
      { name: "boxes (box)", websiteId, isActive: true },
      { name: "kilograms (kg)", websiteId, isActive: true },
      { name: "meters (mtr)", websiteId, isActive: true },
      { name: "packets (pkt)", websiteId, isActive: true }
    ];

    for (const unit of unitData) {
      const doc = await Unit.findOne({ websiteId, name: unit.name });
      if (!doc) {
        await Unit.create(unit);
        console.log(`+ Created Unit: ${unit.name}`);
      } else {
        console.log(`= Unit already exists: ${unit.name}`);
      }
    }

    // 7. Suppliers
    const suppliersData = [
      { companyName: `JTS General Trading - ${website.websiteName}`, contactPerson: "Mohammad Khan", email: `${website.websiteName.toLowerCase().replace(/\s+/g, "")}.jts@example.com`, phone: "+971501111111", status: "active" },
      { companyName: `Global Tech Solutions - ${website.websiteName}`, contactPerson: "Sarah Jenkins", email: `${website.websiteName.toLowerCase().replace(/\s+/g, "")}.tech@example.com`, phone: "+971502222222", status: "active" },
      { companyName: `Prime Logistics - ${website.websiteName}`, contactPerson: "Amit Patel", email: `${website.websiteName.toLowerCase().replace(/\s+/g, "")}.prime@example.com`, phone: "+971503333333", status: "active" },
      { companyName: `Elite Distributors - ${website.websiteName}`, contactPerson: "Hassan Ali", email: `${website.websiteName.toLowerCase().replace(/\s+/g, "")}.elite@example.com`, phone: "+971504444444", status: "active" },
      { companyName: `Apex Wholesalers - ${website.websiteName}`, contactPerson: "Lin Xiao", email: `${website.websiteName.toLowerCase().replace(/\s+/g, "")}.apex@example.com`, phone: "+971505555555", status: "active" }
    ];

    for (const supplier of suppliersData) {
      let doc = await Supplier.findOne({ companyName: supplier.companyName });
      if (!doc) {
        doc = await Supplier.create({
          ...supplier,
          websiteIds: [websiteId],
          createdBy
        });
        console.log(`+ Created Supplier: ${supplier.companyName}`);

        // Create User credential
        await User.create({
          name: supplier.contactPerson,
          email: supplier.email,
          password: hashedPassword,
          role: "supplier",
          supplierId: doc._id
        });
        console.log(`  + Created user credential: ${supplier.email}`);
      } else {
        console.log(`= Supplier already exists: ${supplier.companyName}`);
      }
    }
  }

  console.log("\nAll websites seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
