import mongoose from 'mongoose';

async function run() {
  try {
    console.log('[Deduplication] Connecting to MongoDB...');
    await mongoose.connect('mongodb://chat_support_user:Chat%402026%23Secure@127.0.0.1:27018/chat-support?authSource=chat-support');
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));
    
    // Find all duplicate emails
    const duplicates = await Customer.aggregate([
      { $match: { email: { $exists: true, $ne: '' } } },
      { $group: { 
          _id: { $toLower: '$email' }, 
          count: { $sum: 1 }, 
          ids: { $push: '$_id' }
        } 
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    console.log(`[Deduplication] Found ${duplicates.length} duplicate email groups.`);

    let totalDeleted = 0;

    for (const group of duplicates) {
      const email = group._id;
      const docs = await Customer.find({ email: new RegExp(`^${email}$`, 'i') }).sort({ updatedAt: -1, createdAt: -1 });

      if (docs.length <= 1) continue;

      // Keep the primary doc (first one in docs, which is newest)
      const primaryDoc = docs[0];
      const deleteIds = docs.slice(1).map(d => d._id);

      // Merge any missing fields from secondary docs onto primaryDoc if needed
      for (const secDoc of docs.slice(1)) {
        if (!primaryDoc.tradeLicenseNumber && secDoc.tradeLicenseNumber) primaryDoc.tradeLicenseNumber = secDoc.tradeLicenseNumber;
        if (!primaryDoc.tradeLicenseExpiryDate && secDoc.tradeLicenseExpiryDate) primaryDoc.tradeLicenseExpiryDate = secDoc.tradeLicenseExpiryDate;
        if (!primaryDoc.trn && secDoc.trn) primaryDoc.trn = secDoc.trn;
        if (!primaryDoc.companyName && secDoc.companyName) primaryDoc.companyName = secDoc.companyName;
        if (!primaryDoc.phone && secDoc.phone) primaryDoc.phone = secDoc.phone;
      }

      await Customer.updateOne({ _id: primaryDoc._id }, { $set: primaryDoc.toObject() });
      const delResult = await Customer.deleteMany({ _id: { $in: deleteIds } });
      
      totalDeleted += delResult.deletedCount || 0;
      console.log(`[Deduplication] Merged & Cleaned "${email}": Kept 1, deleted ${delResult.deletedCount}`);
    }

    console.log(`\n✅ [Deduplication Complete] Removed ${totalDeleted} duplicate customer documents from MongoDB!`);
    process.exit(0);
  } catch (err) {
    console.error('[Deduplication Error]', err);
    process.exit(1);
  }
}

run();
