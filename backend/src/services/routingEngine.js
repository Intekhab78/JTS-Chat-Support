import { User } from "../models/User.js";
import { ChatSession } from "../models/ChatSession.js";
import { logCrmActivity } from "./activityLoggerService.js";

/**
 * Omnichannel Routing Engine
 * Automatically routes a ChatSession to the best matching online agent.
 */
export async function routeSessionToAgent(session) {
  try {
    const websiteId = session.websiteId;
    const department = session.department || "general";
    const sessionTags = session.tags || [];

    // Query active agents for this website
    const candidates = await User.find({
      websiteIds: websiteId,
      isOnline: true,
      isAvailable: true,
      agentStatus: "online",
      department: department
    });

    if (candidates.length === 0) {
      console.log(`[Routing Engine] No available online agents for department ${department}. Queueing session ${session.sessionId}`);
      session.status = "queued";
      await session.save();
      return null;
    }

    // Filter candidates by skill if specified
    let matchingCandidates = [...candidates];
    if (sessionTags.length > 0) {
      matchingCandidates = candidates.filter(agent => {
        const agentSkills = agent.skills || [];
        return sessionTags.some(tag => agentSkills.includes(tag));
      });
    }

    // Fallback to all candidates if no skill matches
    if (matchingCandidates.length === 0) {
      matchingCandidates = [...candidates];
    }

    // Sort by currentWorkload (Round Robin / Load balancing)
    matchingCandidates.sort((a, b) => (a.currentWorkload || 0) - (b.currentWorkload || 0));

    const selectedAgent = matchingCandidates[0];

    // Allocate session
    session.assignedAgent = selectedAgent._id;
    session.status = "active";
    session.acceptedAt = new Date();
    await session.save();

    // Increment agent workload
    selectedAgent.currentWorkload = (selectedAgent.currentWorkload || 0) + 1;
    await selectedAgent.save();

    console.log(`[Routing Engine] Routed session ${session.sessionId} to agent ${selectedAgent.name} (Workload: ${selectedAgent.currentWorkload})`);

    // Log activity timeline
    await logCrmActivity({
      websiteId: websiteId,
      type: "owner_changed",
      title: "Conversation Routed Automatically",
      description: `Omnichannel session ${session.sessionId} routed to agent ${selectedAgent.name} in department "${department}".`,
      customerId: session.customerId,
      ownerId: selectedAgent._id
    });

    return selectedAgent;
  } catch (err) {
    console.error("[Routing Engine] Error routing session:", err);
    return null;
  }
}
