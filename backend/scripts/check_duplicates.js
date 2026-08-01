import mongoose from 'mongoose';

async function run() {
  try {
    await mongoose.connect('mongodb://chat_support_user:Chat%402026%23Secure@127.0.0.1:27018/chat-support?authSource=chat-support');
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));
    
    const duplicates = await Customer.aggregate([
      { $match: { email: { $exists: true, $ne: '' } } },
      { $group: { 
          _id: { $toLower: '$email' }, 
          count: { $sum: 1 }, 
          ids: { $push: '$_id' }, 
          names: { $push: '$name' },
          companyNames: { $push: '$companyName' },
          dates: { $push: '$createdAt' }
        } 
      },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    console.log('DUPLICATE GROUPS FOUND:', duplicates.length);
    console.log(JSON.stringify(duplicates, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
