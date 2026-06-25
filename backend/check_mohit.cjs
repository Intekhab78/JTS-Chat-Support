/**
 * Script to find and fix Mohit's user role.
 * Run: node check_mohit.cjs
 */
const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb+srv://chatAI:bawsfL1sbUHjKTVt@cluster0.ehduwnn.mongodb.net/chat-support?retryWrites=true&w=majority";

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db("chat-support");

  // Find all users with "mohit" in name or email
  const users = await db.collection("users").find({
    $or: [
      { name: { $regex: /mohit/i } },
      { email: { $regex: /mohit/i } }
    ]
  }).toArray();

  if (users.length === 0) {
    console.log("❌ No user found with name/email containing 'mohit'");
  } else {
    console.log(`✅ Found ${users.length} user(s):\n`);
    users.forEach(u => {
      console.log(`  _id:    ${u._id}`);
      console.log(`  name:   ${u.name}`);
      console.log(`  email:  ${u.email}`);
      console.log(`  role:   ${u.role}`);
      console.log(`  managerId: ${u.managerId}`);
      console.log("  ---");
    });
  }

  await client.close();
}

main().catch(console.error);
