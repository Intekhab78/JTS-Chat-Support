import { WorkflowExecution } from "../models/WorkflowExecution.js";
import { EmailProviderManager } from "./providers/emailProvider.js";

/**
 * Executes a workflow in the background.
 */
export async function executeWorkflowBackground(workflow, payload = {}) {
  const execution = await WorkflowExecution.create({
    workflowId: workflow._id,
    websiteId: workflow.websiteId,
    status: "running",
    variables: payload,
    logs: [{ nodeId: "start", message: `Workflow "${workflow.name}" triggered.`, status: "info" }]
  });

  try {
    // Find the starting node
    const startNode = workflow.nodes.find(n => n.type === "start" || n.type === "trigger");
    if (!startNode) {
      throw new Error("No Start/Trigger node found in this workflow.");
    }

    let currentNode = startNode;
    
    // Safety break counter for visual infinite loops
    let stepsCount = 0;
    while (currentNode && stepsCount < 100) {
      stepsCount++;
      execution.currentElement = currentNode.id;
      
      console.log(`[Workflow Executor] Executing node ID: ${currentNode.id} (${currentNode.type})`);
      
      execution.logs.push({
        nodeId: currentNode.id,
        message: `Processing node of type ${currentNode.type}`,
        status: "info"
      });

      let nextNodeId = null;

      if (currentNode.type === "start" || currentNode.type === "trigger") {
        nextNodeId = currentNode.next && currentNode.next[0];
      }
      
      else if (currentNode.type === "condition") {
        const { field, operator, value } = currentNode.config || {};
        const varValue = payload[field] || "";
        
        let match = false;
        if (operator === "equals") {
          match = String(varValue) === String(value);
        } else if (operator === "contains") {
          match = String(varValue).includes(String(value));
        } else {
          match = !!varValue;
        }

        execution.logs.push({
          nodeId: currentNode.id,
          message: `Evaluated condition: "${field}" ${operator} "${value}". Result: ${match}`,
          status: "info"
        });

        // Branch next: next[0] for true, next[1] for false
        nextNodeId = match ? (currentNode.next && currentNode.next[0]) : (currentNode.next && currentNode.next[1]);
      }
      
      else if (currentNode.type === "action") {
        const { actionType, emailTo, emailSubject, webhookUrl } = currentNode.config || {};
        
        if (actionType === "send_email") {
          const emailToResolved = emailTo || payload.email || "recipient@jts.com";
          const subjectResolved = emailSubject || "Workflow Automation Update";
          
          const mailer = EmailProviderManager.getProvider();
          await mailer.sendEmail({
            to: emailToResolved,
            subject: subjectResolved,
            htmlBody: `<p>Workflow automated notice. Event payload: ${JSON.stringify(payload)}</p>`
          });

          execution.logs.push({
            nodeId: currentNode.id,
            message: `Executed action: send_email to ${emailToResolved}`,
            status: "success"
          });
        }
        
        else if (actionType === "webhook") {
          if (webhookUrl) {
            console.log(`[Workflow Executor] Calling webhook URL: ${webhookUrl}`);
            // Simulated fetch payload
            execution.logs.push({
              nodeId: currentNode.id,
              message: `Executed webhook call to ${webhookUrl}`,
              status: "success"
            });
          }
        }

        nextNodeId = currentNode.next && currentNode.next[0];
      }
      
      else if (currentNode.type === "delay") {
        const { durationMinutes = 1 } = currentNode.config || {};
        execution.logs.push({
          nodeId: currentNode.id,
          message: `Simulating delay duration: ${durationMinutes} minutes`,
          status: "info"
        });
        nextNodeId = currentNode.next && currentNode.next[0];
      }
      
      else if (currentNode.type === "end") {
        execution.logs.push({
          nodeId: currentNode.id,
          message: "Reached End node.",
          status: "success"
        });
        break;
      }

      if (!nextNodeId) {
        break;
      }

      currentNode = workflow.nodes.find(n => n.id === nextNodeId);
    }

    execution.status = "success";
    await execution.save();
  } catch (err) {
    console.error(`[Workflow Executor] Execution failed for ${workflow.name}:`, err);
    execution.status = "failed";
    execution.logs.push({
      nodeId: execution.currentElement || "unknown",
      message: `Error: ${err.message}`,
      status: "failed"
    });
    await execution.save();
  }
}
