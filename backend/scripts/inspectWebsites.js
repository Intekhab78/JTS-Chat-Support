import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const localUri = 'mongodb://127.0.0.1:27017/chat-support';

async function run() {
  const conn = await mongoose.connect(localUri);
  console.log('Connected to Local MongoDB');

  const db = conn.connection.db;

  const websites = await db.collection('websites').find({}).toArray();
  console.log('\n--- WEBSITES ---');
  websites.forEach(w => {
    console.log(`ID: ${w._id} | Name: ${w.websiteName} | Domain: ${w.domain} | Manager: ${w.managerId}`);
  });

  const users = await db.collection('users').find({}).toArray();
  console.log('\n--- USERS ---');
  users.forEach(u => {
    console.log(`ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Websites: ${JSON.stringify(u.websiteIds)}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
