import mongoose from 'mongoose';
import { ChatSession } from '../src/models/ChatSession.js';

async function check() {
  try {
    await mongoose.connect('mongodb://localhost:27017/chat-support');
    const total = await ChatSession.countDocuments();
    const assigned = await ChatSession.countDocuments({ assignedAgent: { $ne: null } });
    const statuses = await ChatSession.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    console.log('Total:', total);
    console.log('Assigned:', assigned);
    console.log('Statuses:', JSON.stringify(statuses));
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
