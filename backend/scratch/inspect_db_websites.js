import mongoose from 'mongoose';

const atlasUri = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';
const localUri = 'mongodb://127.0.0.1:27017/chat-support';

async function inspect(uri, name) {
  console.log(`\n=== INSPECTING ${name} ===`);
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;

  const websites = await db.collection('websites').find({}).toArray();
  console.log('Websites:');
  websites.forEach(w => {
    console.log(` - ID: ${w._id} | Name: ${w.websiteName} | Domain: ${w.domain} | Manager: ${w.managerId}`);
  });

  const users = await db.collection('users').find({}).toArray();
  console.log('Users:');
  users.forEach(u => {
    console.log(` - ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role}`);
  });

  await conn.close();
}

async function run() {
  try {
    await inspect(localUri, 'LOCAL DB');
  } catch (err) {
    console.error('Error connecting to local DB:', err.message);
  }

  try {
    await inspect(atlasUri, 'ATLAS DB');
  } catch (err) {
    console.error('Error connecting to Atlas DB:', err.message);
  }
}

run();
