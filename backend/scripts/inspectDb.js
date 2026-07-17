import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const atlasUri = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';
const localUri = 'mongodb://127.0.0.1:27017/chat-support';

async function inspect(uri, label) {
  console.log(`\n=== Inspecting ${label} ===`);
  try {
    const conn = await mongoose.createConnection(uri).asPromise();
    const db = conn.db;
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:`);
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }
    await conn.close();
  } catch (err) {
    console.error(`Error inspecting ${label}:`, err.message);
  }
}

async function run() {
  await inspect(atlasUri, 'MongoDB Atlas (Cloud)');
  await inspect(localUri, 'Local MongoDB');
}

run();
