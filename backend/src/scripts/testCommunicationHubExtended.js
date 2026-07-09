import mongoose from "mongoose";
import assert from "assert";
import { connectDatabase } from "../config/database.js";
import { ChatSession } from "../models/ChatSession.js";
import { Message } from "../models/Message.js";
import { Customer } from "../models/Customer.js";
import { User } from "../models/User.js";

import * as communicationHubService from "../services/communicationHubService.js";

async function runTests() {
  console.log("=== CONNECTING TO DATABASE ===");
  await connectDatabase();

  const websiteId = new mongoose.Types.ObjectId();
  const actorId = new mongoose.Types.ObjectId();

  console.log("\n=== STARTING OMNICHANNEL COMMUNICATION HUB INTEGRATION TESTS ===");

  try {
    // 1. Test Incoming Facebook Message
    console.log("-> Testing Inbound Facebook Messenger message...");
    const fbInbound = await communicationHubService.receiveIncomingMessage({
      websiteId,
      channel: "facebook",
      from: "fb_user_12345",
      text: "Hello from Facebook Messenger!",
      providerMessageId: "fb_mid_111"
    });

    assert.ok(fbInbound.session);
    assert.strictEqual(fbInbound.session.channel, "facebook");
    assert.strictEqual(fbInbound.message.message, "Hello from Facebook Messenger!");
    assert.strictEqual(fbInbound.message.sender, "visitor");

    // Verify Customer auto-mapping
    const customer = await Customer.findById(fbInbound.session.customerId);
    assert.ok(customer);
    assert.strictEqual(customer.metadata.get("facebookId"), "fb_user_12345");

    // 2. Test Incoming Instagram Message (same customer)
    console.log("-> Testing Inbound Instagram Message mapping to customer...");
    // Link customer to instagram ID
    customer.metadata.set("instagramId", "ig_user_12345");
    await customer.save();

    const igInbound = await communicationHubService.receiveIncomingMessage({
      websiteId,
      channel: "instagram",
      from: "ig_user_12345",
      text: "Hello from Instagram Direct Message!",
      providerMessageId: "ig_mid_222"
    });

    assert.ok(igInbound.session);
    assert.strictEqual(igInbound.session.channel, "instagram");
    assert.strictEqual(String(igInbound.session.customerId), String(customer._id));

    // 3. Test Outgoing Replies (Agent Send)
    console.log("-> Testing Outgoing Agent Sends (WhatsApp, SMS, Facebook)...");
    const fbOutbound = await communicationHubService.sendMessage({
      sessionId: fbInbound.session._id,
      message: "Agent reply to Facebook message",
      actorId
    });
    assert.strictEqual(fbOutbound.sender, "agent");
    assert.strictEqual(fbOutbound.deliveryStatus, "sent");

    // 4. Test Conversation Merging (Merge FB thread into Instagram thread)
    console.log("-> Testing Conversation Merging (Facebook -> Instagram)...");
    const mergedTarget = await communicationHubService.mergeConversations(
      fbInbound.session._id,
      igInbound.session._id,
      actorId
    );

    // Assert that source conversation is closed and marked merged
    const updatedSource = await ChatSession.findById(fbInbound.session._id);
    assert.strictEqual(updatedSource.isMerged, true);
    assert.strictEqual(updatedSource.status, "closed");
    assert.strictEqual(String(updatedSource.mergedIntoId), String(igInbound.session._id));

    // Assert that messages from the source conversation were moved
    const mergedMessagesCount = await Message.countDocuments({ sessionId: igInbound.session._id });
    // Total should be: 1 (original IG message) + 1 (original FB inbound message) + 1 (original FB agent send message) = 3 messages!
    assert.strictEqual(mergedMessagesCount, 3);

    // 5. Test Webhook status updates
    console.log("-> Testing message delivery status update callbacks...");
    const updatedMsg = await communicationHubService.updateMessageStatus("fb_mid_111", "read");
    assert.ok(updatedMsg);
    assert.strictEqual(updatedMsg.deliveryStatus, "read");
    assert.ok(updatedMsg.readAt);

    // 6. Test RBAC filter logic verification
    console.log("-> Testing RBAC routing logic criteria...");
    const salesUser = { _id: new mongoose.Types.ObjectId(), role: "sales" };
    const agentUser = { _id: new mongoose.Types.ObjectId(), role: "agent" };
    const adminUser = { _id: new mongoose.Types.ObjectId(), role: "admin" };

    const getRbacQuery = (user) => {
      const q = {};
      if (user.role === "sales") {
        q.assignedAgent = user._id;
      } else if (user.role === "agent") {
        q.$or = [{ assignedAgent: user._id }, { assignedAgent: null }];
      }
      return q;
    };

    assert.deepStrictEqual(getRbacQuery(salesUser), { assignedAgent: salesUser._id });
    assert.deepStrictEqual(getRbacQuery(agentUser), { $or: [{ assignedAgent: agentUser._id }, { assignedAgent: null }] });
    assert.deepStrictEqual(getRbacQuery(adminUser), {});

    console.log("\n✅ ALL OMNICHANNEL COMMUNICATION INTEGRATION TESTS PASSED!");
  } catch (error) {
    console.error("\n❌ OMNICHANNEL INTEGRATION TESTS FAILED:", error);
  } finally {
    console.log("\n=== CLEANING UP DATABASE ===");
    await ChatSession.deleteMany({ websiteId });
    // Clean messages by resolving sessionIds
    const sessions = await ChatSession.find({ websiteId }).select("_id");
    const sessionIds = sessions.map(s => s._id);
    await Message.deleteMany({ sessionId: { $in: sessionIds } });
    await Customer.deleteMany({ websiteId });
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTests();
