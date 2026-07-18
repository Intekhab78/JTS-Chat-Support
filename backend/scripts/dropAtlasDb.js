import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const atlasUri = 'mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority';

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  const conn = await mongoose.connect(atlasUri);
  console.log('Connected. Dropping the database to free up disk space...');
  
  await conn.connection.db.dropDatabase();
  console.log('Database dropped successfully! WiredTiger space has been freed.');

  await mongoose.disconnect();
}

run().catch(console.error);
