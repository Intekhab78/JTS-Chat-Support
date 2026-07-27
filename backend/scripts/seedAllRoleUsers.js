import bcrypt from "bcryptjs";
import { connectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Website } from "../src/models/Website.js";

async function seedAllRoleUsers() {
  console.log("=================================================");
  console.log("🚀 SEEDING USERS FOR ALL SYSTEM ROLES");
  console.log("=================================================\n");

  await connectDatabase();

  // Find the primary client manager user (mohit or default manager)
  const clientUser = await User.findOne({ email: "mohit@gmail.com" }) || await User.findOne({ role: "client" });
  if (!clientUser) {
    console.error("No client user found");
    process.exit(1);
  }

  // Find website associated with clientUser
  const website = await Website.findOne({ managerId: clientUser._id }) || await Website.findOne({});
  const websiteIds = website ? [website._id] : [];

  const hashedPassword = await bcrypt.hash("Password123!", 12);

  const rolesToSeed = [
    { name: "Tax Consultant User", email: "tax.consultant@example.com", role: "tax_consultant", department: "tax" },
    { name: "Executive Management User", email: "executive.management@example.com", role: "management", department: "executive" },
    { name: "Account User", email: "account.user@example.com", role: "account", department: "accounts" },
    { name: "Purchase User", email: "purchase.user@example.com", role: "purchase", department: "logistics" },
    { name: "Sales User", email: "sales@gmail.com", role: "sales", department: "sales" },
    { name: "Agent User", email: "agent.user@example.com", role: "agent", department: "support" },
    { name: "Manager User", email: "manager.user@example.com", role: "manager", department: "general" },
    { name: "Portal User", email: "portal.user@example.com", role: "user", department: "client_portal" }
  ];

  for (const roleDef of rolesToSeed) {
    let user = await User.findOne({ email: roleDef.email });
    if (!user) {
      user = await User.create({
        name: roleDef.name,
        email: roleDef.email,
        password: hashedPassword,
        role: roleDef.role,
        department: roleDef.department,
        managerId: clientUser._id,
        websiteIds,
        isOnline: true,
        isAvailable: true
      });
      console.log(`  ✅ Created user: ${user.name} (${user.role})`);
    } else {
      user.role = roleDef.role;
      user.department = roleDef.department;
      user.managerId = clientUser._id;
      user.websiteIds = websiteIds;
      await user.save();
      console.log(`  🔄 Updated user: ${user.name} (${user.role})`);
    }
  }

  console.log("\n=================================================");
  console.log("🎉 ALL ROLE USERS SEEDED SUCCESSFULLY!");
  console.log("=================================================");
  process.exit(0);
}

seedAllRoleUsers().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
