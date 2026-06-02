const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Simulate req.user.supplierId as a string (how it usually comes from JWT)
    const supplierId = '69f590841373df943fdfb6c1'; 
    
    const InventoryItem = mongoose.model('InventoryItem', new mongoose.Schema({ preferredSupplierId: mongoose.Schema.Types.ObjectId, name: String }));
    
    // Try finding with string
    const itemsWithString = await InventoryItem.find({ preferredSupplierId: supplierId });
    console.log('Items found with string ID:', itemsWithString.length);

    // Try finding with ObjectId
    const itemsWithObjectId = await InventoryItem.find({ preferredSupplierId: new mongoose.Types.ObjectId(supplierId) });
    console.log('Items found with ObjectId:', itemsWithObjectId.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
