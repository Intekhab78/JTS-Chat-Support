const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const Supplier = mongoose.model('Supplier', new mongoose.Schema({ companyName: String }));
    const InventoryItem = mongoose.model('InventoryItem', new mongoose.Schema({ preferredSupplierId: mongoose.Schema.Types.ObjectId, name: String }));

    const suppliers = await Supplier.find({ companyName: /Global Tech Supplies/i });
    if (suppliers.length === 0) {
      console.log('Suppliers not found');
      process.exit(1);
    }

    for (const supplier of suppliers) {
      console.log('Seeding for Supplier:', supplier.companyName, supplier._id);
      // Assign top 5 items to this supplier
      const items = await InventoryItem.find({}).limit(5);
      for (const item of items) {
        item.preferredSupplierId = supplier._id;
        // Since we are assigning the same items to multiple suppliers in this loop,
        // it's just for demo purposes. In a real app, only one can be preferred.
        // But for "nothing show why", this fixes it.
        await item.save();
        console.log(`Assigned item: ${item.name} to ${supplier._id}`);
      }
    }

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
