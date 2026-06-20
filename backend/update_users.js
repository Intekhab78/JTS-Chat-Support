import mongoose from 'mongoose';
import { User } from './src/models/User.js';
import { connectDatabase } from './src/config/database.js';

async function run() {
  await connectDatabase();
  await User.updateOne({ email: 'mohit@gmail.com' }, { $set: { role: 'client' } });
  console.log('User role updated to client!');
  process.exit(0);
}
run();
