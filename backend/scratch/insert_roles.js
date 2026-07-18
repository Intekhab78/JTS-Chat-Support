import mongoose from 'mongoose';

const atlasUri = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';
const localUri = 'mongodb://127.0.0.1:27017/chat-support';

const adminId = '69be785b5d08929f6cbb89d4'; // Default Admin user ID

const rolesToInsert = [
  {
    name: 'account',
    description: 'Handles accounting, invoicing, billing dashboards, and ledger review.',
    permissions: ['accounts.view', 'invoice.manage', 'billing.view'],
    isActive: true,
    createdBy: new mongoose.Types.ObjectId(adminId)
  },
  {
    name: 'sales',
    description: 'Responsible for managing leads, creating prospects, and updating CRM records.',
    permissions: ['crm.view', 'crm.create', 'crm.update', 'crm.assign'],
    isActive: true,
    createdBy: new mongoose.Types.ObjectId(adminId)
  },
  {
    name: 'purchase',
    description: 'Manages purchase requests, tracks ticketing pipelines, and vendor status.',
    permissions: ['crm.view', 'ticket.view', 'ticket.comment'],
    isActive: true,
    createdBy: new mongoose.Types.ObjectId(adminId)
  },
  {
    name: 'manager',
    description: 'Full operational manager with CRM, Ticketing, Chat, and Reporting access.',
    permissions: [
      'crm.view', 'crm.create', 'crm.update', 'crm.assign', 'crm.merge',
      'ticket.view', 'ticket.create', 'ticket.update', 'ticket.comment',
      'chat.view', 'chat.transfer', 'chat.note', 'chat.history',
      'reports.view'
    ],
    isActive: true,
    createdBy: new mongoose.Types.ObjectId(adminId)
  },
  {
    name: 'agent',
    description: 'Frontline support agent for managing tickets and communicating with customers via live chat.',
    permissions: [
      'ticket.view', 'ticket.create', 'ticket.update', 'ticket.comment',
      'chat.view', 'chat.transfer', 'chat.note'
    ],
    isActive: true,
    createdBy: new mongoose.Types.ObjectId(adminId)
  }
];

async function insertData(uri, dbName) {
  console.log(`\n=== Inserting roles into ${dbName} ===`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;
  const col = db.collection('roles');

  // Clear existing roles with these names to avoid duplicates
  const names = rolesToInsert.map(r => r.name);
  console.log(`Clearing existing roles for: ${names.join(', ')}`);
  await col.deleteMany({ name: { $in: names } });

  const now = new Date();
  const docs = rolesToInsert.map(role => ({
    ...role,
    createdAt: now,
    updatedAt: now
  }));

  const result = await col.insertMany(docs);
  console.log(`Successfully inserted ${result.insertedCount} roles!`);

  // Verify
  const verified = await col.find({}).toArray();
  console.log(`Verified total roles in ${dbName}: ${verified.length}`);
  verified.forEach(r => {
    console.log(` - ID: ${r._id} | Name: ${r.name} | Permissions Count: ${r.permissions.length}`);
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
