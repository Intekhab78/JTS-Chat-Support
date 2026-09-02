const mongoose = require('mongoose');

async function run() {
  const uri = 'mongodb://chat_support_user:Chat%4A2026%23Secure@127.0.0.1:27018/chat-support?authSource=chat-support';
  const conn = mongoose.createConnection(uri);
  await conn.asPromise();
  console.log('Connected with auth!');

  const websites = await conn.collection('websites').find({}).toArray();
  const allIds = websites.map(w => w._id);
  console.log('Websites in VPS:', websites.map(w => w.websiteName || w.domain));

  await conn.collection('users').updateOne({ email: 'mohit@gmail.com' }, { $set: { websiteIds: allIds } });
  console.log('SUCCESSFULLY_UPDATED_MOHIT_WEBSITES');

  await conn.close();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});