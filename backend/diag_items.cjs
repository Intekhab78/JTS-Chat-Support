const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Item = mongoose.model('InventoryItem', new mongoose.Schema({ preferredSupplierId: mongoose.Schema.Types.ObjectId, name: String }));
    const all = await Item.find({ preferredSupplierId: { $ne: null } });
    console.log('Total assigned items:', all.length);
    all.forEach(i => console.log(`Item: ${i.name}, Supplier: ${i.preferredSupplierId}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
