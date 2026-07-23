/**
 * Comprehensive Flow Tree Graph Validator
 * Detects:
 * 1. MISSING_ROOT
 * 2. EMPTY_ROOT_OPTIONS
 * 3. BROKEN_LINK (target node missing)
 * 4. ORPHAN_NODE (unreachable from root)
 * 5. INCOMPLETE_ACTION (missing actionType or next target)
 * 6. INCOMPLETE_CONDITION (missing trueNext or falseNext)
 * 7. EMPTY_FORM_TRANSITION (Form node missing next transition)
 * 8. DEAD_END (Node has no outgoing transitions and is not an End node)
 * 9. CIRCULAR_REFERENCE / INFINITE_LOOP without exit
 */

export function validateFlowGraph(nodesDict = {}, analytics = null) {
  const allNodeIds = new Set(Object.keys(nodesDict));
  const errors = [];
  const warnings = [];

  // 1. Missing Root Node Check
  if (!nodesDict.root) {
    errors.push({ code: "MISSING_ROOT", message: "Flow is missing the mandatory 'root' start node.", node: "root" });
  } else {
    const root = nodesDict.root;
    if ((!root.options || root.options.length === 0) && !root.next) {
      errors.push({ code: "EMPTY_ROOT_OPTIONS", message: "Root node has no buttons or next transition — visitors will see a blank widget.", node: "root" });
    }
    if (!root.message && root.type !== "condition" && root.type !== "action") {
      warnings.push({ code: "MISSING_ROOT_MESSAGE", message: "Root node message text is empty.", node: "root" });
    }
  }

  // 2. Transition & Node Specific Checks
  Object.entries(nodesDict).forEach(([id, node]) => {
    // Option buttons validation
    if (node.type === "message" || node.type === "button_group") {
      (node.options || []).forEach((opt, idx) => {
        const isCloseBtn = (opt.text || "").toLowerCase().includes("close") || (opt.text || "").toLowerCase().includes("exit") || (opt.text || "").toLowerCase().includes("end");
        if (!opt.next && !isCloseBtn) {
          errors.push({ code: "EMPTY_BUTTON_TARGET", message: `Node "${id}" button "${opt.text || `Option ${idx + 1}`}" has no target node selected.`, node: id });
        } else if (opt.next && !allNodeIds.has(opt.next)) {
          errors.push({ code: "BROKEN_LINK", message: `Node "${id}" button "${opt.text}" links to missing node "${opt.next}".`, node: id });
        }
      });
    }

    // Form node validation
    if (node.type === "form") {
      if (!node.next) {
        errors.push({ code: "EMPTY_FORM_TRANSITION", message: `Form node "${id}" has no transition node configured for after submission.`, node: id });
      } else if (!allNodeIds.has(node.next)) {
        errors.push({ code: "BROKEN_FORM_LINK", message: `Form node "${id}" submission links to missing node "${node.next}".`, node: id });
      }
    }

    // Action node validation
    if (node.type === "action") {
      if (!node.actionType) {
        errors.push({ code: "MISSING_ACTION_TYPE", message: `Action node "${id}" is missing an action logic type (e.g. Escalate, CRM Lead).`, node: id });
      }
      if (!node.next) {
        warnings.push({ code: "ACTION_DEAD_END", message: `Action node "${id}" has no next transition — chat will end after execution.`, node: id });
      } else if (!allNodeIds.has(node.next)) {
        errors.push({ code: "BROKEN_ACTION_LINK", message: `Action node "${id}" links to missing target node "${node.next}".`, node: id });
      }
    }

    // Condition node validation
    if (node.type === "condition") {
      if (!node.trueNext) {
        errors.push({ code: "MISSING_CONDITION_TRUE", message: `Condition node "${id}" is missing IF TRUE target node.`, node: id });
      } else if (!allNodeIds.has(node.trueNext)) {
        errors.push({ code: "BROKEN_CONDITION_TRUE", message: `Condition node "${id}" IF TRUE links to missing node "${node.trueNext}".`, node: id });
      }

      if (!node.falseNext) {
        errors.push({ code: "MISSING_CONDITION_FALSE", message: `Condition node "${id}" is missing ELSE target node.`, node: id });
      } else if (!allNodeIds.has(node.falseNext)) {
        errors.push({ code: "BROKEN_CONDITION_FALSE", message: `Condition node "${id}" ELSE links to missing node "${node.falseNext}".`, node: id });
      }
    }

    // Dead end check for regular nodes
    const hasOutgoing =
      (node.options && node.options.length > 0) ||
      !!node.next ||
      !!node.trueNext ||
      !!node.falseNext;

    if (!hasOutgoing && node.type !== "end" && !node.isSolution) {
      warnings.push({ code: "DEAD_END", message: `Node "${id}" has no outgoing links or choices. Flow terminates here.`, node: id });
    }
  });

  // 3. Reachability & Orphan Node Detection
  const reachable = new Set();
  const queue = nodesDict.root ? ["root"] : [];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || reachable.has(currentId) || !nodesDict[currentId]) continue;

    reachable.add(currentId);
    const currNode = nodesDict[currentId];

    (currNode.options || []).forEach((o) => { if (o.next) queue.push(o.next); });
    if (currNode.next) queue.push(currNode.next);
    if (currNode.trueNext) queue.push(currNode.trueNext);
    if (currNode.falseNext) queue.push(currNode.falseNext);
  }

  allNodeIds.forEach((id) => {
    if (!reachable.has(id)) {
      warnings.push({ code: "ORPHAN_NODE", message: `Node "${id}" is unreachable from the root start node.`, node: id });
    }
  });

  // 4. Circular Reference & Infinite Loop Detection
  const visited = new Set();
  const recStack = new Set();
  const cycleNodes = new Set();

  function isCyclic(id) {
    if (!id || !nodesDict[id]) return false;
    if (recStack.has(id)) {
      cycleNodes.add(id);
      return true;
    }
    if (visited.has(id)) return false;

    visited.add(id);
    recStack.add(id);

    const currNode = nodesDict[id];
    let hasCycle = false;

    for (const opt of currNode.options || []) {
      if (opt.next && isCyclic(opt.next)) hasCycle = true;
    }
    if (currNode.next && isCyclic(currNode.next)) hasCycle = true;
    if (currNode.trueNext && isCyclic(currNode.trueNext)) hasCycle = true;
    if (currNode.falseNext && isCyclic(currNode.falseNext)) hasCycle = true;

    recStack.delete(id);
    return hasCycle;
  }

  if (nodesDict.root) {
    if (isCyclic("root")) {
      warnings.push({
        code: "CIRCULAR_REFERENCE",
        message: `Potential infinite loop detected involving node(s): ${Array.from(cycleNodes).join(", ")}. Ensure an exit path exists.`
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    reachableCount: reachable.size,
    totalNodesCount: allNodeIds.size
  };
}
