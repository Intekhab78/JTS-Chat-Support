import mongoose from 'mongoose';

const atlasUri = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';
const localUri = 'mongodb://127.0.0.1:27017/chat-support';

const websiteId = '69c2a29b587dc977e619d212'; // Uae Invoiceing
const managerId = '69be37a312b562258c78450e'; // mohit

const departmentsToInsert = [
  { name: 'billing', websiteId: new mongoose.Types.ObjectId(websiteId), managerId: new mongoose.Types.ObjectId(managerId), isActive: true },
  { name: 'sales', websiteId: new mongoose.Types.ObjectId(websiteId), managerId: new mongoose.Types.ObjectId(managerId), isActive: true },
  { name: 'support', websiteId: new mongoose.Types.ObjectId(websiteId), managerId: new mongoose.Types.ObjectId(managerId), isActive: true },
  { name: 'accounts', websiteId: new mongoose.Types.ObjectId(websiteId), managerId: new mongoose.Types.ObjectId(managerId), isActive: true },
  { name: 'refunds', websiteId: new mongoose.Types.ObjectId(websiteId), managerId: new mongoose.Types.ObjectId(managerId), isActive: true },
  { name: 'marketing', websiteId: new mongoose.Types.ObjectId(websiteId), managerId: new mongoose.Types.ObjectId(managerId), isActive: true },
  { name: 'operations', websiteId: new mongoose.Types.ObjectId(websiteId), managerId: new mongoose.Types.ObjectId(managerId), isActive: true },
  { name: 'finance', websiteId: new mongoose.Types.ObjectId(websiteId), managerId: new mongoose.Types.ObjectId(managerId), isActive: true },
  { name: 'logistics', websiteId: new mongoose.Types.ObjectId(websiteId), managerId: new mongoose.Types.ObjectId(managerId), isActive: true },
  { name: 'legal', websiteId: new mongoose.Types.ObjectId(websiteId), managerId: new mongoose.Types.ObjectId(managerId), isActive: true }
];

async function insertData(uri, name) {
  console.log(`\n=== Inserting departments into ${name} ===`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;
  const col = db.collection('departments');

  // Clear existing departments for this website
  console.log('Clearing existing departments for this website...');
  await col.deleteMany({ websiteId: new mongoose.Types.ObjectId(websiteId) });

  const now = new Date();
  const docs = departmentsToInsert.map(dept => ({
    ...dept,
    createdAt: now,
    updatedAt: now
  }));

  const result = await col.insertMany(docs);
  console.log(`Successfully inserted ${result.insertedCount} departments!`);

  // Verify
  const verified = await col.find({ websiteId: new mongoose.Types.ObjectId(websiteId) }).toArray();
  console.log('Verified inserted departments:');
  verified.forEach(d => {
    console.log(` - ID: ${d._id} | Name: ${d.name} | Website: ${d.websiteId} | Manager: ${d.managerId}`);
  });

  await conn.close();
}

async function run() {
  try {
    await insertData(localUri, 'LOCAL DB');
  } catch (err) {
    console.error('Error connecting/inserting local DB:', err);
  }

  try {
    await insertData(atlasUri, 'ATLAS DB');
  } catch (err) {
    console.error('Error connecting/inserting Atlas DB:', err);
  }
}

run();
