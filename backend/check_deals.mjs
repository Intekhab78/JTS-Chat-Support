import mongoose from "mongoose";

const MONGODB_URI = "mongodb://chat_support_user:Chat%402026%23Secure@127.0.0.1:27018/chat-support?authSource=chat-support";

await mongoose.connect(MONGODB_URI);

const Deal = mongoose.model("Deal", new mongoose.Schema({}, { strict: false }), "deals");
const deals = await Deal.find({}).select("dealName stage websiteId isDeleted createdAt").lean();

console.log("Total deals found:", deals.length);
deals.forEach(d => {
  console.log(JSON.stringify({
    name: d.dealName,
    stage: d.stage,
    websiteId: String(d.websiteId),
    deleted: d.isDeleted
  }));
});

await mongoose.disconnect();
process.exit(0);
