const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const InventoryItem = mongoose.model('InventoryItem', new mongoose.Schema({ 
      name: String, sku: String, quantity: Number, reorderLevel: Number 
    }));
    const items = await InventoryItem.find({}).limit(5);
    console.log('Available items SKUs:', items.map(i => i.sku));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
