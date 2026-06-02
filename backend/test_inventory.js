import mongoose from 'mongoose';
import { connectDatabase } from './src/config/database.js';
import { InventoryItem } from './src/models/InventoryItem.js';
import { User } from './src/models/User.js';

async function test() {
  await connectDatabase();
  try {
    const lowStockItems = await InventoryItem.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] }
    }).limit(5);
    console.log('Low stock success:', lowStockItems.length);
  } catch (e) {
    console.error('Low stock error:', e);
  }
  process.exit(0);
}
test();
