import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const atlasUri = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';
const localUri = 'mongodb://127.0.0.1:27017/chat-support';

const websiteId = '69c2a29b587dc977e619d212'; // Uae Invoiceing
const managerId = '69be37a312b562258c78450e'; // mohit (client manager)

async function generateUsers() {
  const hashedPassword = await bcrypt.hash('Password123', 12);
  
  return [
    {
      name: 'Account User',
      email: 'account.user@example.com',
      password: hashedPassword,
      role: 'account',
      department: 'accounts',
      websiteIds: [new mongoose.Types.ObjectId(websiteId)],
      managerId: new mongoose.Types.ObjectId(managerId),
      isOnline: true,
      isAvailable: true,
      agentStatus: 'online',
      languages: ['english'],
      currentWorkload: 0,
      maxWorkload: 5,
      assignedCategories: []
    },
    {
      name: 'Sales User',
      email: 'sales.user@example.com',
      password: hashedPassword,
      role: 'sales',
      department: 'sales',
      websiteIds: [new mongoose.Types.ObjectId(websiteId)],
      managerId: new mongoose.Types.ObjectId(managerId),
      isOnline: true,
      isAvailable: true,
      agentStatus: 'online',
      languages: ['english'],
      currentWorkload: 0,
      maxWorkload: 5,
      assignedCategories: []
    },
    {
      name: 'Purchase User',
      email: 'purchase.user@example.com',
      password: hashedPassword,
      role: 'purchase',
      department: 'logistics',
      websiteIds: [new mongoose.Types.ObjectId(websiteId)],
      managerId: new mongoose.Types.ObjectId(managerId),
      isOnline: true,
      isAvailable: true,
      agentStatus: 'online',
      languages: ['english'],
      currentWorkload: 0,
      maxWorkload: 5,
      assignedCategories: []
    },
    {
      name: 'Manager User',
      email: 'manager.user@example.com',
      password: hashedPassword,
      role: 'manager',
      department: 'general',
      websiteIds: [new mongoose.Types.ObjectId(websiteId)],
      managerId: new mongoose.Types.ObjectId(managerId),
      isOnline: true,
      isAvailable: true,
      agentStatus: 'online',
      languages: ['english'],
      currentWorkload: 0,
      maxWorkload: 5,
      assignedCategories: []
    },
    {
      name: 'Agent User',
      email: 'agent.user@example.com',
      password: hashedPassword,
      role: 'agent',
      department: 'support',
      websiteIds: [new mongoose.Types.ObjectId(websiteId)],
      managerId: new mongoose.Types.ObjectId(managerId),
      isOnline: true,
      isAvailable: true,
      agentStatus: 'online',
      languages: ['english'],
      currentWorkload: 0,
      maxWorkload: 5,
      assignedCategories: []
    }
  ];
}

async function insertData(uri, dbName) {
  console.log(`\n=== Inserting users into ${dbName} ===`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;
  const col = db.collection('users');

  const usersToInsert = await generateUsers();
  const emails = usersToInsert.map(u => u.email);

  console.log(`Clearing existing users with emails: ${emails.join(', ')}`);
  await col.deleteMany({ email: { $in: emails } });

  const now = new Date();
  const docs = usersToInsert.map(user => ({
    ...user,
    createdAt: now,
    updatedAt: now
  }));

  const result = await col.insertMany(docs);
  console.log(`Successfully inserted ${result.insertedCount} users!`);

  // Verify
  const verified = await col.find({ email: { $in: emails } }).toArray();
  console.log(`Verified inserted users in ${dbName}:`);
  verified.forEach(u => {
    console.log(` - ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Dept: ${u.department}`);
  });

  await conn.close();
}

async function run() {
  try {
    await insertData(localUri, 'LOCAL DB');
  } catch (err) {
    console.error('Error inserting local DB:', err);
  }

  try {
    await insertData(atlasUri, 'ATLAS DB');
  } catch (err) {
    console.error('Error inserting Atlas DB:', err);
  }
}

run();
