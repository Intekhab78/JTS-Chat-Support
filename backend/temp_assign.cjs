const mongoose = require('mongoose');
async function run() {
  const uri = 'mongodb://chat_support_user:Chat%4A2026%23Secure@127.0.0.1:27018/chat-support?authSource=chat-support&directConnection=true';
  const conn = mongoose.createConnection(uri);
  await conn.asPromise();
  const websites = await conn.collection('websites').find({}).toArray();
  console.log('All VPS Websites:', websites.map(w => ({ id: w._id, name: w.websiteName || w.domain })));
  const allIds = websites.map(w => w._id);
  await conn.collection('users').updateOne({ email: 'mohit@gmail.com' }, { $set: { websiteIds: allIds } });
  const updated = await conn.collection('users').findOne({ email: 'mohit@gmail.com' });
  console.log('UPDATED_USER_WEBSITES_COUNT:', updated.websiteIds.length);
  await conn.close();
  process.exit(0);
}
run();