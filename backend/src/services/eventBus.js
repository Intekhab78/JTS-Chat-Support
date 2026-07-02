import { Workflow } from "../models/Workflow.js";
import { executeWorkflowBackground } from "./workflowExecutor.js";

/**
 * Centred Event Bus Service
 * Publishes events across all modules and initiates background automation flows.
 */
export async function publishEvent(websiteId, eventName, payload = {}) {
  console.log(`[Event Bus] Published event "${eventName}" for website: ${websiteId}`);
  try {
    // Find active workflows matching websiteId and event name trigger
    const workflows = await Workflow.find({
      websiteId,
      trigger: eventName,
      isActive: true
    });

    if (workflows.length === 0) {
      return;
    }

    console.log(`[Event Bus] Found ${workflows.length} active workflows matching event "${eventName}". Executing...`);

    // Execute matching workflows in the background (non-blocking)
    for (const workflow of workflows) {
      executeWorkflowBackground(workflow, payload).catch(err => {
        console.error(`[Event Bus] Error launching workflow ${workflow.name}:`, err);
      });
    }
  } catch (err) {
    console.error("[Event Bus] Error processing published event:", err);
  }
}
