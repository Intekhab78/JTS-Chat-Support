const mongoose = require("mongoose");

const MONGODB_URI = "mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority";

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to DB.");

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("Found collections:", collections.map(c => c.name));

  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`- ${col.name}: ${count}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
