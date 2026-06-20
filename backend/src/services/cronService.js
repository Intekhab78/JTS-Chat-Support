import cron from "node-cron";
import { User } from "../models/User.js";
import { Website } from "../models/Website.js";
import nodemailer from "nodemailer";

export const startCronJobs = () => {
  // Setup email transporter using Ethereal for dev or your real SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Daily Report at 8:00 AM
  cron.schedule("0 8 * * *", async () => {
    console.log("Running Daily Reporting Cron Job");
    try {
      const adminsAndClients = await User.find({ role: { $in: ["admin", "client"] } });
      
      for (const user of adminsAndClients) {
        // Fetch basic stats (in reality, call controller aggregations)
        const activeWebsites = await Website.countDocuments(user.role === 'client' ? { managerId: user._id } : {});
        const personnel = await User.countDocuments({ managerId: user._id, role: { $nin: ["admin", "client"] } });
        
        await transporter.sendMail({
          from: '"Dashboard AI" <reports@dashboard.local>',
          to: user.email,
          subject: "Your Daily Enterprise Report",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #1e293b;">Daily Dashboard Report</h2>
              <p>Hello ${user.name},</p>
              <p>Here is your daily system summary:</p>
              <ul>
                <li><strong>Active Websites:</strong> ${activeWebsites}</li>
                <li><strong>Active Agents:</strong> ${personnel}</li>
              </ul>
              <p>Log in to your Enterprise Dashboard to view full Analytics.</p>
            </div>
          `
        });
      }
    } catch (err) {
      console.error("Cron Error:", err);
    }
  });

  // Weekly Report every Monday at 8:00 AM
  cron.schedule("0 8 * * 1", async () => {
    console.log("Running Weekly Reporting Cron Job");
  });

  // Monthly Report 1st of every month at 8:00 AM
  cron.schedule("0 8 1 * *", async () => {
    console.log("Running Monthly Reporting Cron Job");
  });
};
