import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

async function run() {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in .env');
  }

  console.log('Connecting to database...');
  const conn = await mongoose.connect(mongoUri);
  const db = conn.connection.db;
  console.log(`Connected successfully to database.`);

  // 1. Get all websites
  const websites = await db.collection('websites').find({}).toArray();
  
  // Identify websites to keep (case-insensitive checks for UAE Invoice and JTS Middleeast)
  const websitesToKeep = websites.filter(w => {
    const name = (w.websiteName || '').toLowerCase();
    return name.includes('uae invoice') || name.includes('jts middleeast') || name.includes('jtsmiddleeast');
  });

  const websitesToDelete = websites.filter(w => {
    const name = (w.websiteName || '').toLowerCase();
    return !name.includes('uae invoice') && !name.includes('jts middleeast') && !name.includes('jtsmiddleeast');
  });

  console.log('\n--- WEBSITES CONFIGURATION ---');
  console.log(`Keeping ${websitesToKeep.length} websites:`);
  websitesToKeep.forEach(w => console.log(`  - [KEEP] Name: ${w.websiteName} | ID: ${w._id} | ManagerID: ${w.managerId}`));

  console.log(`Deleting ${websitesToDelete.length} websites:`);
  websitesToDelete.forEach(w => console.log(`  - [DELETE] Name: ${w.websiteName} | ID: ${w._id}`));

  if (websitesToDelete.length === 0) {
    console.log('No websites to delete. Exiting...');
    await mongoose.disconnect();
    return;
  }

  const keepIds = websitesToKeep.map(w => w._id);
  const deleteIds = websitesToDelete.map(w => w._id);
  const keepManagerIds = websitesToKeep.map(w => w.managerId.toString());

  // 2. Identify Users/Clients to delete
  const users = await db.collection('users').find({}).toArray();
  const usersToDelete = users.filter(u => {
    // Only delete clients
    if ((u.role || '').toLowerCase() !== 'client') return false;
    // Do not delete if the client is a manager of a kept website
    if (keepManagerIds.includes(u._id.toString())) return false;
    // Otherwise delete
    return true;
  });

  console.log('\n--- USERS CONFIGURATION ---');
  console.log(`Deleting ${usersToDelete.length} client users:`);
  usersToDelete.forEach(u => console.log(`  - [DELETE] Email: ${u.email} | Name: ${u.name} | Role: ${u.role}`));

  const deleteUserIds = usersToDelete.map(u => u._id);

  // 3. Confirm cleanup execution
  console.log('\nStarting database cleanup...');

  // Delete Websites
  const webResult = await db.collection('websites').deleteMany({ _id: { $in: deleteIds } });
  console.log(`Deleted ${webResult.deletedCount} websites.`);

  // Delete Users (Clients)
  if (deleteUserIds.length > 0) {
    const userResult = await db.collection('users').deleteMany({ _id: { $in: deleteUserIds } });
    console.log(`Deleted ${userResult.deletedCount} client users.`);
  }

  // Delete ChatSessions
  const chatResult = await db.collection('chatsessions').deleteMany({ websiteId: { $in: deleteIds } });
  console.log(`Deleted ${chatResult.deletedCount} chat sessions.`);

  // Delete Tickets
  const ticketResult = await db.collection('tickets').deleteMany({ websiteId: { $in: deleteIds } });
  console.log(`Deleted ${ticketResult.deletedCount} tickets.`);

  // Delete Visitors
  const visitorResult = await db.collection('visitors').deleteMany({ websiteId: { $in: deleteIds } });
  console.log(`Deleted ${visitorResult.deletedCount} visitors.`);

  // Delete Canned Responses
  const cannedResult = await db.collection('cannedresponses').deleteMany({ websiteId: { $in: deleteIds } });
  console.log(`Deleted ${cannedResult.deletedCount} canned responses.`);

  // Delete Analytics
  const analyticsResult = await db.collection('analytics').deleteMany({ websiteId: { $in: deleteIds } });
  console.log(`Deleted ${analyticsResult.deletedCount} analytics records.`);

  // Delete Analytics Snapshots
  const snapshotResult = await db.collection('analyticssnapshots').deleteMany({ websiteId: { $in: deleteIds } });
  console.log(`Deleted ${snapshotResult.deletedCount} analytics snapshots.`);

  // Delete orphaned messages (messages belonging to deleted chat sessions)
  // Get active session IDs
  const activeSessions = await db.collection('chatsessions').find({}).toArray();
  const activeSessionIds = activeSessions.map(s => s._id);
  const msgResult = await db.collection('messages').deleteMany({ sessionId: { $not: { $in: activeSessionIds } } });
  console.log(`Deleted ${msgResult.deletedCount} orphaned messages.`);

  console.log('\nDatabase cleanup finished successfully!');
  await mongoose.disconnect();
}

run().catch(console.error);
