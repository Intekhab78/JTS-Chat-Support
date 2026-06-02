const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const Supplier = mongoose.model('Supplier', new mongoose.Schema({ companyName: String }));
    const PurchaseOrder = mongoose.model('PurchaseOrder', new mongoose.Schema({
      supplierId: mongoose.Schema.Types.ObjectId,
      websiteId: mongoose.Schema.Types.ObjectId,
      poNumber: String,
      total: Number,
      status: String,
      createdAt: Date,
      deliveryDate: Date,
      reconciliation: {
        status: String,
        amount: Number
      }
    }));

    const supplier = await Supplier.findOne({ companyName: /Global Tech Supplies/i });
    if (!supplier) {
      console.log('Supplier not found');
      process.exit(1);
    }

    // Create 5 delivered orders with varying lead times
    const leadTimes = [24, 36, 48, 12, 72]; // hours
    for (let i = 0; i < 5; i++) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - (10 + i));
      const deliveryDate = new Date(createdAt);
      deliveryDate.setHours(deliveryDate.getHours() + leadTimes[i]);

      await PurchaseOrder.create({
        supplierId: supplier._id,
        websiteId: new mongoose.Types.ObjectId('65f1a2b3c4d5e6f7a8b9c0d1'), // Placeholder website
        poNumber: `PO-REAL-00${i+1}`,
        total: 500 + (i * 150),
        status: 'delivered',
        createdAt,
        deliveryDate,
        reconciliation: {
          status: i === 2 ? 'mismatch' : 'matched',
          amount: i === 2 ? 650 : (500 + (i * 150))
        }
      });
      console.log(`Created delivered order PO-REAL-00${i+1}`);
    }

    console.log('Done seeding real data!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
