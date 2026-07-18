import mongoose from 'mongoose';

const atlasUri = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';
const localUri = 'mongodb://127.0.0.1:27017/chat-support';

const websiteId = '69c2a29b587dc977e619d212'; // Uae Invoiceing
const adminId = '69be785b5d08929f6cbb89d4'; // Default Admin user ID

async function seedDatabase(uri, label) {
  console.log(`\n=== Seeding Inventory for ${label} ===`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;

  const UnitModel = conn.model('Unit', new mongoose.Schema({}, { strict: false }));
  const ColorModel = conn.model('Color', new mongoose.Schema({}, { strict: false }));
  const SizeModel = conn.model('Size', new mongoose.Schema({}, { strict: false }));
  const BrandModel = conn.model('Brand', new mongoose.Schema({}, { strict: false }));
  const InventoryCategoryModel = conn.model('InventoryCategory', new mongoose.Schema({}, { strict: false }));
  const InventorySubcategoryModel = conn.model('InventorySubcategory', new mongoose.Schema({}, { strict: false }));
  const SupplierModel = conn.model('Supplier', new mongoose.Schema({}, { strict: false }));
  const InventoryItemModel = conn.model('InventoryItem', new mongoose.Schema({}, { strict: false }));
  const InventoryMovementModel = conn.model('InventoryMovement', new mongoose.Schema({}, { strict: false }));

  // Helper ObjectId generator
  const oId = () => new mongoose.Types.ObjectId();
  const wId = new mongoose.Types.ObjectId(websiteId);
  const uId = new mongoose.Types.ObjectId(adminId);

  // 1. Clear existing inventory records
  console.log('  - Clearing existing inventory records...');
  await UnitModel.deleteMany({ websiteId: wId });
  await ColorModel.deleteMany({ websiteId: wId });
  await SizeModel.deleteMany({ websiteId: wId });
  await BrandModel.deleteMany({ websiteId: wId });
  await InventoryCategoryModel.deleteMany({ websiteId: wId });
  await InventorySubcategoryModel.deleteMany({ websiteId: wId });
  await SupplierModel.deleteMany({ websiteIds: wId });
  await InventoryItemModel.deleteMany({ websiteId: wId });
  await InventoryMovementModel.deleteMany({ websiteId: wId });

  const now = new Date();

  // 2. Units (10 records)
  console.log('  - Seeding 10 Units...');
  const units = await UnitModel.insertMany([
    { name: 'pcs', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'kg', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'litre', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'box', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'pack', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'doz', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'meter', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'set', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'roll', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'ctn', websiteId: wId, isActive: true, createdAt: now, updatedAt: now }
  ]);

  // 3. Colors (10 records)
  console.log('  - Seeding 10 Colors...');
  const colors = await ColorModel.insertMany([
    { name: 'black', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'white', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'silver', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'grey', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'blue', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'red', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'green', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'gold', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'yellow', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'pink', websiteId: wId, isActive: true, createdAt: now, updatedAt: now }
  ]);

  // 4. Sizes (10 records)
  console.log('  - Seeding 10 Sizes...');
  const sizes = await SizeModel.insertMany([
    { name: 'small', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'medium', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'large', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'xl', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'xxl', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: '10-inch', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: '12-inch', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: '15-inch', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: '500ml', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: '1l', websiteId: wId, isActive: true, createdAt: now, updatedAt: now }
  ]);

  // 5. Brands (10 records)
  console.log('  - Seeding 10 Brands...');
  const brands = await BrandModel.insertMany([
    { name: 'samsung', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'apple', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'sony', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'dell', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'hp', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'logitech', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'linksys', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'cisco', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'seagate', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'kingston', websiteId: wId, isActive: true, createdAt: now, updatedAt: now }
  ]);

  // 6. Categories (10 records)
  console.log('  - Seeding 10 Inventory Categories...');
  const categories = await InventoryCategoryModel.insertMany([
    { name: 'electronics', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'networking', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'storage', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'peripherals', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'accessories', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'office supplies', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'cables', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'power management', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'smart home', websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'software', websiteId: wId, isActive: true, createdAt: now, updatedAt: now }
  ]);

  // Helper maps for mapping IDs
  const catMap = {};
  categories.forEach(c => { catMap[c.name] = c._id; });

  // 7. Subcategories (10 records)
  console.log('  - Seeding 10 Inventory Subcategories...');
  const subcategories = await InventorySubcategoryModel.insertMany([
    { name: 'smartphones', categoryId: catMap['electronics'], websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'laptops', categoryId: catMap['electronics'], websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'routers', categoryId: catMap['networking'], websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'switches', categoryId: catMap['networking'], websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'hard drives', categoryId: catMap['storage'], websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'ssds', categoryId: catMap['storage'], websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'keyboards', categoryId: catMap['peripherals'], websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'mice', categoryId: catMap['peripherals'], websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'monitors', categoryId: catMap['peripherals'], websiteId: wId, isActive: true, createdAt: now, updatedAt: now },
    { name: 'office desks', categoryId: catMap['office supplies'], websiteId: wId, isActive: true, createdAt: now, updatedAt: now }
  ]);

  // 8. Suppliers (10 records)
  console.log('  - Seeding 10 Suppliers...');
  const suppliers = await SupplierModel.insertMany([
    { companyName: 'Acme Electronics', contactPerson: 'John Doe', email: 'john@acme.com', phone: '+971 4 111 2222', taxId: 'TAX-001', address: 'Sheikh Zayed Rd, Dubai', paymentTerms: 'Net 30', status: 'active', websiteIds: [wId], createdBy: uId, createdAt: now, updatedAt: now },
    { companyName: 'TechDistributors UAE', contactPerson: 'Sara Khan', email: 'sara@techdist.ae', phone: '+971 4 222 3333', taxId: 'TAX-002', address: 'Deira, Dubai', paymentTerms: 'Net 30', status: 'active', websiteIds: [wId], createdBy: uId, createdAt: now, updatedAt: now },
    { companyName: 'Global Hardware Ltd', contactPerson: 'Michael Smith', email: 'm.smith@globalhw.com', phone: '+971 4 333 4444', taxId: 'TAX-003', address: 'Jebel Ali, Dubai', paymentTerms: 'Net 15', status: 'active', websiteIds: [wId], createdBy: uId, createdAt: now, updatedAt: now },
    { companyName: 'Apex Networking Co', contactPerson: 'Ali Hassan', email: 'ali@apexnet.ae', phone: '+971 4 444 5555', taxId: 'TAX-004', address: 'Al Barsha, Dubai', paymentTerms: 'Net 30', status: 'active', websiteIds: [wId], createdBy: uId, createdAt: now, updatedAt: now },
    { companyName: 'Pioneer Storage SA', contactPerson: 'Jean Dupont', email: 'jean@pioneer.com', phone: '+971 4 555 6666', taxId: 'TAX-005', address: 'Business Bay, Dubai', paymentTerms: 'Net 45', status: 'active', websiteIds: [wId], createdBy: uId, createdAt: now, updatedAt: now },
    { companyName: 'Elite Peripherals Dubai', contactPerson: 'Jane Smith', email: 'jane@elite.ae', phone: '+971 4 666 7777', taxId: 'TAX-006', address: 'Silicon Oasis, Dubai', paymentTerms: 'Net 30', status: 'active', websiteIds: [wId], createdBy: uId, createdAt: now, updatedAt: now },
    { companyName: 'Middle East Office Supplies', contactPerson: 'Ahmed Ali', email: 'ahmed@meos.ae', phone: '+971 4 777 8888', taxId: 'TAX-007', address: 'Karama, Dubai', paymentTerms: 'Due on Receipt', status: 'active', websiteIds: [wId], createdBy: uId, createdAt: now, updatedAt: now },
    { companyName: 'CableWorld FZ', contactPerson: 'Bob Martin', email: 'bob@cableworld.com', phone: '+971 4 888 9999', taxId: 'TAX-008', address: 'DIC, Dubai', paymentTerms: 'Net 30', status: 'active', websiteIds: [wId], createdBy: uId, createdAt: now, updatedAt: now },
    { companyName: 'PowerTech Solutions', contactPerson: 'David Lee', email: 'david@powertech.ae', phone: '+971 4 999 0000', taxId: 'TAX-009', address: 'Sharjah', paymentTerms: 'Net 30', status: 'active', websiteIds: [wId], createdBy: uId, createdAt: now, updatedAt: now },
    { companyName: 'SmartLiving Gulf', contactPerson: 'Omar Salem', email: 'omar@smartliving.ae', phone: '+971 4 000 1111', taxId: 'TAX-010', address: 'Abu Dhabi', paymentTerms: 'Net 60', status: 'active', websiteIds: [wId], createdBy: uId, createdAt: now, updatedAt: now }
  ]);

  // Helper maps
  const subMap = {}; subcategories.forEach(s => { subMap[s.name] = s._id; });
  const brandMap = {}; brands.forEach(b => { brandMap[b.name] = b._id; });
  const sizeMap = {}; sizes.forEach(s => { sizeMap[s.name] = s._id; });
  const colMap = {}; colors.forEach(c => { colMap[c.name] = c._id; });
  const unitMap = {}; units.forEach(u => { unitMap[u.name] = u._id; });
  const supMap = {}; suppliers.forEach(s => { supMap[s.companyName] = s._id; });

  // 9. Items (Item Master - 10 records)
  console.log('  - Seeding 10 Items...');
  const itemsData = [
    { name: 'Galaxy S24 Ultra', sku: 'SAM-S24-ULTRA', cat: 'electronics', sub: 'smartphones', brand: 'samsung', size: 'large', color: 'black', unit: 'pcs', supplier: 'TechDistributors UAE', price: 3800 },
    { name: 'iPhone 15 Pro Max', sku: 'APL-IP15PM', cat: 'electronics', sub: 'smartphones', brand: 'apple', size: 'large', color: 'silver', unit: 'pcs', supplier: 'TechDistributors UAE', price: 4200 },
    { name: 'MacBook Pro 16"', sku: 'APL-MBP16', cat: 'electronics', sub: 'laptops', brand: 'apple', size: '15-inch', color: 'grey', unit: 'pcs', supplier: 'TechDistributors UAE', price: 8500 },
    { name: 'Dell XPS 15', sku: 'DEL-XPS15', cat: 'electronics', sub: 'laptops', brand: 'dell', size: '15-inch', color: 'silver', unit: 'pcs', supplier: 'Global Hardware Ltd', price: 6200 },
    { name: 'Nighthawk WiFi 7 Router', sku: 'LNK-NH-WF7', cat: 'networking', sub: 'routers', brand: 'linksys', size: 'medium', color: 'black', unit: 'pcs', supplier: 'Apex Networking Co', price: 1200 },
    { name: 'Catalyst 24-Port Switch', sku: 'CIS-CAT-24', cat: 'networking', sub: 'switches', brand: 'cisco', size: 'large', color: 'grey', unit: 'pcs', supplier: 'Apex Networking Co', price: 3500 },
    { name: 'Backup Plus 5TB HDD', sku: 'SEA-BP-5TB', cat: 'storage', sub: 'hard drives', brand: 'seagate', size: 'small', color: 'blue', unit: 'pcs', supplier: 'Pioneer Storage SA', price: 450 },
    { name: 'MX Master 3S Mouse', sku: 'LOG-MXM3S', cat: 'peripherals', sub: 'mice', brand: 'logitech', size: 'medium', color: 'black', unit: 'pcs', supplier: 'Elite Peripherals Dubai', price: 380 },
    { name: 'UltraSharp 27" Monitor', sku: 'DEL-US27', cat: 'peripherals', sub: 'monitors', brand: 'dell', size: 'large', color: 'black', unit: 'pcs', supplier: 'Elite Peripherals Dubai', price: 1800 },
    { name: 'Ergonomic Office Desk', sku: 'OFC-DESK-ERG', cat: 'office supplies', sub: 'office desks', brand: 'hp', size: 'xl', color: 'white', unit: 'pcs', supplier: 'Middle East Office Supplies', price: 950 }
  ];

  const createdItems = [];
  for (const item of itemsData) {
    const doc = await InventoryItemModel.create({
      websiteId: wId,
      name: item.name,
      sku: item.sku,
      category: item.cat,
      categoryId: catMap[item.cat],
      subcategoryId: subMap[item.sub],
      brand: item.brand,
      brandId: brandMap[item.brand],
      sizeId: sizeMap[item.size],
      colorId: colMap[item.color],
      unit: item.unit,
      unitId: unitMap[item.unit],
      unitCost: item.price,
      quantity: 50, // Starting stock
      reorderLevel: 10,
      isActive: true,
      isDeleted: false,
      createdBy: uId,
      preferredSupplierId: supMap[item.supplier],
      supplierId: supMap[item.supplier],
      createdAt: now,
      updatedAt: now
    });
    createdItems.push(doc);
  }

  // 10. Movements - Stock In (10 records)
  console.log('  - Seeding 10 Stock In movements...');
  for (let i = 0; i < 10; i++) {
    const item = createdItems[i];
    await InventoryMovementModel.create({
      websiteId: wId,
      itemId: item._id,
      type: 'in',
      quantity: 100,
      previousQuantity: 50,
      balanceAfter: 150,
      reference: `PO-${1000 + i}`,
      notes: 'Initial warehouse stock ingestion.',
      createdBy: uId,
      createdAt: now,
      updatedAt: now
    });

    // Update item stock quantity
    await InventoryItemModel.updateOne({ _id: item._id }, { $set: { quantity: 150 } });
  }

  // 11. Movements - Stock Out (10 records)
  console.log('  - Seeding 10 Stock Out movements...');
  for (let i = 0; i < 10; i++) {
    const item = createdItems[i];
    await InventoryMovementModel.create({
      websiteId: wId,
      itemId: item._id,
      type: 'out',
      quantity: 15,
      previousQuantity: 150,
      balanceAfter: 135,
      reference: `SO-${2000 + i}`,
      notes: 'Customer dispatch order.',
      createdBy: uId,
      createdAt: now,
      updatedAt: now
    });

    // Update item stock quantity
    await InventoryItemModel.updateOne({ _id: item._id }, { $set: { quantity: 135 } });
  }

  // 12. Movements - Adjustment (10 records)
  console.log('  - Seeding 10 Stock Adjustments...');
  for (let i = 0; i < 10; i++) {
    const item = createdItems[i];
    await InventoryMovementModel.create({
      websiteId: wId,
      itemId: item._id,
      type: 'adjust',
      quantity: -5,
      previousQuantity: 135,
      balanceAfter: 130,
      reference: `ADJ-${3000 + i}`,
      notes: 'Manual physical inventory verification audit discrepancy correction.',
      createdBy: uId,
      createdAt: now,
      updatedAt: now
    });

    // Update item stock quantity
    await InventoryItemModel.updateOne({ _id: item._id }, { $set: { quantity: 130 } });
  }

  console.log(`Successfully completed all inventory database seeding for ${label}.`);
  await conn.close();
}

async function run() {
  try {
    await seedDatabase(localUri, 'LOCAL DB');
  } catch (err) {
    console.error('Error seeding local DB:', err);
  }

  try {
    await seedDatabase(atlasUri, 'ATLAS DB');
  } catch (err) {
    console.error('Error seeding Atlas DB:', err);
  }
}

run();
