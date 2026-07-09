import { Reminder } from "../models/Reminder.js";
import { User } from "../models/User.js";
import { createNotification } from "./notificationService.js";
import { sendEmail } from "./emailService.js";
import { getSocketServer } from "../sockets/index.js";

export const checkAndDispatchReminders = async () => {
  try {
    const now = new Date();
    const pending = await Reminder.find({
      remindAt: { $lte: now },
      isSent: { $ne: true }
    }).populate("ownerId").populate("customerId");

    for (const reminder of pending) {
      reminder.isSent = true;
      reminder.sentAt = new Date();
      await reminder.save();

      console.log(`[Reminder Daemon] Dispatching reminder "${reminder.title}" to ${reminder.ownerId?.email}`);

      // 1. Send In-App Notification (Notification model + Socket emit)
      if (reminder.ownerId) {
        try {
          await createNotification({
            userId: reminder.ownerId._id,
            websiteId: reminder.websiteId,
            type: "alert",
            title: `Reminder: ${reminder.title}`,
            content: `You have an upcoming ${reminder.type} event.`
          });
        } catch (err) {
          console.error("Failed to create in-app notification:", err);
        }
      }

      // 2. Send Email Reminder
      if (reminder.ownerId?.email) {
        try {
          await sendEmail({
            to: reminder.ownerId.email,
            subject: `Reminder: ${reminder.title}`,
            html: `<p>This is a reminder for your upcoming JTS CRM event: <strong>${reminder.title}</strong> scheduled around ${reminder.remindAt.toLocaleString()}</p>`
          });
        } catch (err) {
          console.error("Failed to send email reminder:", err);
        }
      }

      // 3. Emit Browser Notification via Socket.io
      const io = getSocketServer();
      if (io && reminder.ownerId) {
        io.to(`us_${reminder.ownerId._id}`).emit("notification:new", {
          title: `Reminder: ${reminder.title}`,
          content: `Scheduled ${reminder.type} upcoming.`,
          createdAt: new Date()
        });
      }
    }
  } catch (err) {
    console.error("[Reminder Daemon Error] Failed to process alerts:", err);
  }
};
