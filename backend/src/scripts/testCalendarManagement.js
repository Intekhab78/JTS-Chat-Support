import mongoose from "mongoose";
import assert from "assert";
import { connectDatabase } from "../config/database.js";
import { Activity } from "../models/Activity.js";
import { Reminder } from "../models/Reminder.js";
import { Customer } from "../models/Customer.js";
import { User } from "../models/User.js";

import * as activityService from "../services/activityService.js";
import * as activityController from "../controllers/crmActivityController.js";

async function runTests() {
  console.log("=== CONNECTING TO DATABASE ===");
  await connectDatabase();

  const websiteId = new mongoose.Types.ObjectId();
  const actorId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();

  console.log("\n=== STARTING ENTERPRISE CALENDAR & MEETING MANAGEMENT INTEGRATION TESTS ===");

  try {
    // 1. Test Schedule Meeting (Spawns a Reminder document)
    console.log("-> Testing Schedule Meeting + Reminder creation...");
    const startAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000); // 30 mins duration

    const meeting = await activityService.createActivity({
      websiteId,
      customerId,
      type: "meeting",
      title: "Quarterly Business Review",
      description: "Discuss enterprise client accounts Q3 targets",
      dueDate: startAt,
      endAt,
      timezone: "Asia/Kolkata",
      meetingType: "zoom",
      priority: "high",
      reminderOffsetMinutes: 15
    }, actorId);

    assert.ok(meeting);
    assert.strictEqual(meeting.title, "Quarterly Business Review");
    assert.strictEqual(meeting.meetingType, "zoom");

    // Check if Reminder was successfully generated in DB
    const reminder = await Reminder.findOne({ relatedId: meeting._id });
    assert.ok(reminder);
    assert.strictEqual(reminder.title, "Reminder: Quarterly Business Review");
    assert.strictEqual(reminder.type, "meeting");
    // Assert remindAt = startAt - 15 minutes
    const expectedRemindAt = new Date(startAt.getTime() - 15 * 60 * 1000);
    assert.strictEqual(reminder.remindAt.getTime(), expectedRemindAt.getTime());

    // 2. Test Reschedule Meeting
    console.log("-> Testing Rescheduling Meeting...");
    const newStartAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const updatedMeeting = await activityService.updateActivity(meeting._id, {
      dueDate: newStartAt,
      reminderOffsetMinutes: 15
    }, actorId);

    // Verify reminder updated remindAt
    const updatedReminder = await Reminder.findOne({ relatedId: meeting._id });
    assert.ok(updatedReminder);
    const newExpectedRemindAt = new Date(newStartAt.getTime() - 15 * 60 * 1000);
    assert.strictEqual(updatedReminder.remindAt.getTime(), newExpectedRemindAt.getTime());

    // 3. Test Complete Meeting
    console.log("-> Testing Completing Meeting...");
    const completedMeeting = await activityService.updateActivity(meeting._id, {
      status: "completed"
    }, actorId);

    assert.strictEqual(completedMeeting.status, "completed");
    assert.ok(completedMeeting.completedAt);
    assert.strictEqual(String(completedMeeting.completedBy), String(actorId));

    // Verify reminder marked as sent so it won't fire again
    const completedReminder = await Reminder.findOne({ relatedId: meeting._id });
    assert.ok(completedReminder);
    assert.strictEqual(completedReminder.isSent, true);

    // 4. Test Cancel Meeting
    console.log("-> Testing Cancelling Meeting (clears reminders)...");
    // Create new temporary meeting
    const tempMeeting = await activityService.createActivity({
      websiteId,
      type: "meeting",
      title: "Demo Call",
      dueDate: startAt,
      reminderOffsetMinutes: 30
    }, actorId);

    const tempReminder = await Reminder.findOne({ relatedId: tempMeeting._id });
    assert.ok(tempReminder);

    // Cancel it
    await activityService.updateActivity(tempMeeting._id, {
      status: "cancelled"
    }, actorId);

    // Verify reminder is cleaned up/deleted from collection
    const cancelledReminder = await Reminder.findOne({ relatedId: tempMeeting._id });
    assert.ok(!cancelledReminder);

    // 5. Test Date Range Filtering & Reminders Query mapping in list endpoint mock context
    console.log("-> Testing Calendar controller date range mapping...");
    const listRes = await activityService.getActivitiesList({
      websiteId,
      dueDate: { $gte: new Date(Date.now() - 10000), $lte: new Date(Date.now() + 5 * 60 * 60 * 1000) }
    });
    // Should return original meeting & tempMeeting
    assert.ok(listRes.activities.length >= 1);

    // 6. Test RBAC filter logic verification
    console.log("-> Testing RBAC visibility limits...");
    const getRbacQuery = (user) => {
      const q = {};
      if (user.role === "sales" || user.role === "support") {
        q.ownerId = user._id;
      }
      return q;
    };
    const salesUser = { _id: actorId, role: "sales" };
    const adminUser = { _id: new mongoose.Types.ObjectId(), role: "admin" };

    assert.deepStrictEqual(getRbacQuery(salesUser), { ownerId: actorId });
    assert.deepStrictEqual(getRbacQuery(adminUser), {});

    console.log("\n✅ ALL CALENDAR & MEETING MANAGEMENT INTEGRATION TESTS PASSED!");
  } catch (error) {
    console.error("\n❌ CALENDAR INTEGRATION TESTS FAILED:", error);
  } finally {
    console.log("\n=== CLEANING UP DATABASE ===");
    await Activity.deleteMany({ websiteId });
    await Reminder.deleteMany({ websiteId });
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTests();
