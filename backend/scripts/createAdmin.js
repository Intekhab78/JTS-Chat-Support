import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

async function run() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in .env');
  }

  console.log(`Connecting to database at ${mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}...`);
  const conn = await mongoose.connect(mongoUri);
  const db = conn.connection.db;

  const email = 'jtsadmin@gmail.com';
  const passwordText = 'jts@123';
  const hashedPassword = await bcrypt.hash(passwordText, 10);

  const existing = await db.collection('users').findOne({ email });

  if (existing) {
    console.log(`User "${email}" already exists. Resetting password and role...`);
    await db.collection('users').updateOne(
      { email },
      { $set: { password: hashedPassword, role: 'admin', name: 'Admin' } }
    );
    console.log(`Updated successfully. Password is reset to: ${passwordText}`);
  } else {
    console.log(`User "${email}" does not exist. Creating new Admin user...`);
    await db.collection('users').insertOne({
      name: 'Admin',
      email,
      password: hashedPassword,
      role: 'admin',
      isOnline: false,
      isAvailable: true,
      agentStatus: 'online',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`Admin user created successfully. Use email: ${email} and password: ${passwordText}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
