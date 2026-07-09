import mongoose from "mongoose";
import { Website } from "../models/Website.js";
import { User } from "../models/User.js";
import { Category } from "../models/Category.js";
import { Article } from "../models/Article.js";
import { env } from "../config/env.js";

async function run() {
  console.log("Connecting to Database...");
  await mongoose.connect(env.mongoUri);
  console.log("Connected.");

  const websiteId = "6a2d64d4dc4011615028ba2a";
  const website = await Website.findById(websiteId);
  if (!website) {
    console.error("Website not found!");
    process.exit(1);
  }

  // Find author (Client or Admin user)
  const author = await User.findOne({ role: { $in: ["client", "admin"] } });
  if (!author) {
    console.error("Author user not found!");
    process.exit(1);
  }
  const authorId = author._id;

  // Create Category
  let category = await Category.findOne({ websiteId, name: "CRM User Guide" });
  if (!category) {
    category = await Category.create({
      websiteId,
      name: "CRM User Guide"
    });
    console.log("Category created successfully.");
  }

  const categoryId = category._id;

  // Clean old articles in this category to prevent duplicate slug index errors
  await Article.deleteMany({ websiteId, categoryId });

  // 1. Article: Client Portal Access: End-to-End Walkthrough
  const article1 = await Article.create({
    title: "Client Portal Access: End-to-End Walkthrough",
    slug: "client-portal-walkthrough",
    content: `### 🚀 Client Portal - End-to-End Guide

The Client Portal allows your customers to securely login to view their documents, manage quotes, check invoices, track orders, and raise support tickets.

#### 📂 1. Setting Up Portal Access
* Go to the **Customer Master Registry** or **CRM & Sales > Leads** page.
* Select any registered customer record and click the **Pencil Icon (Edit)**.
* Scroll to the bottom of the drawer to locate the **Client Portal Access** card.
* Click **[Grant Portal Access]**. The system will:
  1. Create a secure login account.
  2. Generate a secure temporary password.
  3. Send an automated welcome invite email to the client with their login credentials and URL.
  4. Log the password in the customer's timeline history.

#### 🔐 2. How the Client Logs In
* Your client visits the JTS Login Page: **http://localhost:5173/login**.
* They enter their registered email address and the temporary password.
* Upon login, the system automatically detects their role and redirects them directly to the **Client Portal Dashboard**.

#### 💼 3. Client Portal Modules
* **Dashboard**: Displays a visual summary of open tickets, quotations, pending invoices, and active sales orders.
* **Quotations**: Clients can view sent quotes and click **Accept** or **Reject** on offers.
* **Orders**: Lists active sales orders and their delivery/fulfillment status.
* **Invoices**: Displays invoice lists, payment history, and payment receipts.
* **Support Center**: Clients can submit helpdesk tickets and interact directly with support agents.
* **Settings**: Enables the client to update their contact info and change their password.`,
    categoryId,
    websiteId,
    authorId,
    tags: ["portal", "guide", "setup"],
    isPublished: true
  });
  console.log(`Article 1 created: ${article1.title}`);

  // 2. Article: How to Manage Client Portal Access Permissions
  const article2 = await Article.create({
    title: "How to Manage Client Portal Access Permissions",
    slug: "manage-portal-permissions",
    content: `### 🔒 Managing Portal Access and Security

Agents and Admins have complete control over who can login to the JTS Customer Portal.

#### 1. Granting Access (Provisional Invite)
* Go to **CUSTOMER MASTER** or **CRM > Contacts**.
* Open the drawer (Pencil Icon) or **Customer 360 View**.
* Check the status under **Client Portal Access**. If it shows **Inactive**, click **Grant Portal Access**.
* Note the generated temporary password in the alert pop-up to share if needed.

#### 2. Revoking Access
* If a customer relationship ends or security needs to be revoked, open their Profile Drawer.
* Under **Client Portal Access**, click the red **[Revoke Portal Access]** button.
* This will immediately delete their login credentials. They will no longer be able to log in to the portal.
* A history event is automatically added to the customer's timeline.`,
    categoryId,
    websiteId,
    authorId,
    tags: ["security", "access", "permissions"],
    isPublished: true
  });
  console.log(`Article 2 created: ${article2.title}`);

  // 3. Article: Troubleshooting Portal Login & Password Resets
  const article3 = await Article.create({
    title: "Troubleshooting Portal Login & Password Resets",
    slug: "troubleshoot-portal-login",
    content: `### 🛠️ Troubleshooting Login & Password Issues

If a client faces trouble logging in to their portal account, follow these diagnostic steps:

#### 1. Email Prefix / Credentials Not Found
* Verify that the client is entering the **exact email address** registered in their CRM customer record.
* Check that their account is marked **Active** under Active Governance in the Customer Master drawer.

#### 2. Resetting Client Passwords
* If a client forgets their password:
  1. Open their customer record drawer in **Customer Master Registry**.
  2. Click **[Revoke Portal Access]** to clear old credentials.
  3. Click **[Grant Portal Access]** again to generate a new temporary password and email invite.
* Alternatively, the client can use the **Forgot Password** link on the login page to receive a password reset link.

#### 3. 403 Forbidden Errors
* If the client gets a 403 error during portal browsing, make sure they are accessing through the official route. If the issue persists, clear the browser cache or contact the system administrator.`,
    categoryId,
    websiteId,
    authorId,
    tags: ["troubleshoot", "login", "password"],
    isPublished: true
  });
  console.log(`Article 3 created: ${article3.title}`);

  console.log("Seeding complete. Closing database connection.");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
