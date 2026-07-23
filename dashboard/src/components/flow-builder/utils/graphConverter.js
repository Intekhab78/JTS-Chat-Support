/**
 * Utility to translate between backend Flow nodes dictionary and React Flow graph structure.
 * 
 * Backend Schema:
 * {
 *   nodes: {
 *     root: { type: "message", message: "Hi", options: [{ text: "Support", next: "support" }], position: { x: 100, y: 100 } },
 *     support: { type: "action", actionType: "escalate", next: "end_node", position: { x: 450, y: 100 } }
 *   }
 * }
 */

export const DEFAULT_NODES_DICT = {
  root: {
    type: "message",
    message: "Hi 👋 How can we help you today?",
    options: [
      { text: "Support", next: "support" }
    ],
    position: { x: 100, y: 150 }
  },
  support: {
    type: "action",
    actionType: "escalate",
    department: "Technical Support",
    position: { x: 500, y: 150 }
  }
};

/**
 * Converts backend dictionary { nodes: { root: {...}, node_1: {...} } } to React Flow { nodes, edges }
 */
export function convertDictToReactFlow(nodesDict = DEFAULT_NODES_DICT) {
  const rfNodes = [];
  const rfEdges = [];

  if (!nodesDict || typeof nodesDict !== "object" || Object.keys(nodesDict).length === 0) {
    nodesDict = DEFAULT_NODES_DICT;
  }

  const keys = Object.keys(nodesDict);

  keys.forEach((nodeId, idx) => {
    const rawNode = nodesDict[nodeId] || {};
    // Calculate fallback grid layout if position is missing
    const defaultX = (idx % 3) * 380 + 100;
    const defaultY = Math.floor(idx / 3) * 260 + 100;
    const posX = rawNode.position?.x ?? defaultX;
    const posY = rawNode.position?.y ?? defaultY;

    rfNodes.push({
      id: nodeId,
      type: rawNode.type || "message",
      position: { x: posX, y: posY },
      data: {
        nodeId,
        type: rawNode.type || "message",
        message: rawNode.message || "",
        options: rawNode.options ? JSON.parse(JSON.stringify(rawNode.options)) : [],
        next: rawNode.next || "",
        actionType: rawNode.actionType || "escalate",
        department: rawNode.department || "",
        conditionType: rawNode.conditionType || "agents_online",
        trueNext: rawNode.trueNext || "",
        falseNext: rawNode.falseNext || "",
        fields: rawNode.fields ? JSON.parse(JSON.stringify(rawNode.fields)) : [],
        delaySeconds: rawNode.delaySeconds ?? 5,
        webhookUrl: rawNode.webhookUrl || "",
        httpMethod: rawNode.httpMethod || "POST",
        headers: rawNode.headers || "",
        prompt: rawNode.prompt || "",
        aiModel: rawNode.aiModel || "gpt-4o-mini",
        isSolution: !!rawNode.isSolution
      }
    });

    // Create Edges
    // 1. Button options
    if (Array.isArray(rawNode.options)) {
      rawNode.options.forEach((opt, optIdx) => {
        if (opt.next) {
          rfEdges.push({
            id: `edge-${nodeId}-opt-${optIdx}-${opt.next}`,
            source: nodeId,
            sourceHandle: `option-${optIdx}`,
            target: opt.next,
            animated: true,
            style: { strokeWidth: 2, stroke: "#6366f1" },
            label: opt.text || `Option ${optIdx + 1}`
          });
        }
      });
    }

    // 2. Linear next link
    if (rawNode.next) {
      rfEdges.push({
        id: `edge-${nodeId}-next-${rawNode.next}`,
        source: nodeId,
        sourceHandle: "next",
        target: rawNode.next,
        animated: true,
        style: { strokeWidth: 2, stroke: "#8b5cf6" },
        label: rawNode.type === "form" ? "After Submit" : "Next"
      });
    }

    // 3. Condition True Link
    if (rawNode.trueNext) {
      rfEdges.push({
        id: `edge-${nodeId}-true-${rawNode.trueNext}`,
        source: nodeId,
        sourceHandle: "trueNext",
        target: rawNode.trueNext,
        animated: true,
        style: { strokeWidth: 2, stroke: "#10b981" },
        label: "IF TRUE"
      });
    }

    // 4. Condition False Link
    if (rawNode.falseNext) {
      rfEdges.push({
        id: `edge-${nodeId}-false-${rawNode.falseNext}`,
        source: nodeId,
        sourceHandle: "falseNext",
        target: rawNode.falseNext,
        animated: true,
        style: { strokeWidth: 2, stroke: "#f43f5e" },
        label: "ELSE"
      });
    }
  });

  return { nodes: rfNodes, edges: rfEdges };
}

/**
 * Converts React Flow { nodes, edges } back to backend dictionary { root: {...}, node_1: {...} }
 */
export function convertReactFlowToDict(rfNodes = [], rfEdges = []) {
  const dict = {};

  rfNodes.forEach((node) => {
    const data = node.data || {};
    const nodeId = node.id || data.nodeId;

    dict[nodeId] = {
      type: data.type || "message",
      message: data.message ?? "",
      options: data.options ? JSON.parse(JSON.stringify(data.options)) : [],
      next: data.next || null,
      actionType: data.actionType || undefined,
      department: data.department || undefined,
      conditionType: data.conditionType || undefined,
      trueNext: data.trueNext || undefined,
      falseNext: data.falseNext || undefined,
      fields: data.fields ? JSON.parse(JSON.stringify(data.fields)) : undefined,
      delaySeconds: data.delaySeconds ?? undefined,
      webhookUrl: data.webhookUrl || undefined,
      httpMethod: data.httpMethod || undefined,
      headers: data.headers || undefined,
      prompt: data.prompt || undefined,
      aiModel: data.aiModel || undefined,
      isSolution: data.isSolution || undefined,
      position: {
        x: Math.round(node.position.x),
        y: Math.round(node.position.y)
      }
    };
  });

  return dict;
}
