import mongoose from "mongoose";

const MONGODB_URI = "mongodb://chat_support_user:Chat%402026%23Secure@127.0.0.1:27018/chat-support?authSource=chat-support";

await mongoose.connect(MONGODB_URI);

const Invoice = mongoose.model("Invoice", new mongoose.Schema({}, { strict: false }), "invoices");

const inv = await Invoice.findOne({ invoiceId: /350833/i }).lean();
console.log(JSON.stringify(inv, null, 2));

await mongoose.disconnect();
process.exit(0);
