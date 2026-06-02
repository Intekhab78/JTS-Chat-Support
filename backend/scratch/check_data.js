import mongoose from 'mongoose';
import { ChatSession } from '../src/models/ChatSession.js';
import { User } from '../src/models/User.js';

async function check() {
  await mongoose.connect('mongodb://localhost:27017/chat-support');
  const totalSessions = await ChatSession.countDocuments();
  const assignedSessions = await ChatSession.countDocuments({ assignedAgent: { $ne: null } });
  const agents = await User.find({ role: 'agent' });
  
  console.log('Total Sessions:', totalSessions);
  console.log('Assigned Sessions:', assignedSessions);
  console.log('Total Agents:', agents.length);
  
  if (assignedSessions > 0) {
    const sample = await ChatSession.findOne({ assignedAgent: { $ne: null } });
    console.log('Sample Assigned Agent:', sample.assignedAgent);
    console.log('Sample CreatedAt:', sample.createdAt);
  } else {
      console.log('No assigned sessions found.');
  }
  
  process.exit();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
