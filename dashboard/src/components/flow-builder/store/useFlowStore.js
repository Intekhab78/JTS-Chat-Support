import { create } from "zustand";
import { addEdge, applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import { convertDictToReactFlow, convertReactFlowToDict, DEFAULT_NODES_DICT } from "../utils/graphConverter.js";
import { validateFlowGraph } from "../validation/flowValidator.js";

const MAX_HISTORY = 25;

const computeValidation = (rfNodes, rfEdges, analytics) => {
  const dict = convertReactFlowToDict(rfNodes, rfEdges);
  return validateFlowGraph(dict, analytics);
};

export const useFlowStore = create((set, get) => ({
  // Core State
  nodes: [],
  edges: [],
  selectedNodeId: "root",
  website: null,
  flowId: null,
  flowName: "Custom Website Flow",
  isPublished: true,
  isDirty: false,
  saving: false,
  saveSuccess: false,
  lastSavedAt: null,
  copiedNode: null,
  validation: { isValid: true, errors: [], warnings: [], reachableCount: 0, totalNodesCount: 0 },

  // History Stack for Undo/Redo & Version Snapshots
  history: [],
  historyIndex: -1,

  // Diagnostics, Analytics, Help & Debugger Modals
  analytics: null,
  showDiagnostics: false,
  showSimulator: false,
  showVersionHistory: false,
  showDebugger: false,
  showHelpDrawer: false,
  showTemplatesModal: false,
  showProductTour: false,
  setShowHelpDrawer: (val) => set({ showHelpDrawer: val }),
  setShowTemplatesModal: (val) => set({ showTemplatesModal: val }),
  setShowProductTour: (val) => set({ showProductTour: val }),

  // Initialize Store from Backend Website/Flow payload
  initFlow: (website, analyticsData = null) => {
    let dict = DEFAULT_NODES_DICT;
    let flowId = null;
    let flowName = "Custom Website Flow";
    let isPublished = true;
    let updatedAt = null;

    if (website?.activeFlowId?.nodes) {
      dict = website.activeFlowId.nodes;
      flowId = website.activeFlowId._id;
      flowName = website.activeFlowId.name || flowName;
      isPublished = website.activeFlowId.isPublished ?? true;
      updatedAt = website.activeFlowId.updatedAt ? new Date(website.activeFlowId.updatedAt).toLocaleTimeString() : null;
    } else if (website?.botFlow?.nodes) {
      dict = website.botFlow.nodes;
    }

    const { nodes: rfNodes, edges: rfEdges } = convertDictToReactFlow(dict);
    const validation = computeValidation(rfNodes, rfEdges, analyticsData);

    set({
      website,
      flowId,
      flowName,
      isPublished,
      nodes: rfNodes,
      edges: rfEdges,
      selectedNodeId: rfNodes.length > 0 ? rfNodes[0].id : "root",
      analytics: analyticsData,
      validation,
      lastSavedAt: updatedAt || new Date().toLocaleTimeString(),
      history: [{ timestamp: new Date().toLocaleTimeString(), nodes: rfNodes, edges: rfEdges }],
      historyIndex: 0,
      isDirty: false
    });
  },

  // Record History State for Undo/Redo
  recordHistory: (nodes, edges) => {
    const { history, historyIndex, analytics } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      timestamp: new Date().toLocaleTimeString(),
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    });
    if (newHistory.length > MAX_HISTORY) newHistory.shift();

    const validation = computeValidation(nodes, edges, analytics);

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      validation,
      isDirty: true
    });
  },

  undo: () => {
    const { history, historyIndex, analytics } = get();
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      const nodes = JSON.parse(JSON.stringify(prev.nodes));
      const edges = JSON.parse(JSON.stringify(prev.edges));
      const validation = computeValidation(nodes, edges, analytics);
      set({
        nodes,
        edges,
        validation,
        historyIndex: historyIndex - 1,
        isDirty: true
      });
    }
  },

  redo: () => {
    const { history, historyIndex, analytics } = get();
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      const nodes = JSON.parse(JSON.stringify(next.nodes));
      const edges = JSON.parse(JSON.stringify(next.edges));
      const validation = computeValidation(nodes, edges, analytics);
      set({
        nodes,
        edges,
        validation,
        historyIndex: historyIndex + 1,
        isDirty: true
      });
    }
  },

  restoreVersionSnapshot: (index) => {
    const { history, analytics } = get();
    if (history[index]) {
      const target = history[index];
      const nodes = JSON.parse(JSON.stringify(target.nodes));
      const edges = JSON.parse(JSON.stringify(target.edges));
      const validation = computeValidation(nodes, edges, analytics);
      set({
        nodes,
        edges,
        validation,
        historyIndex: index,
        isDirty: true,
        showVersionHistory: false
      });
    }
  },

  // Copy & Paste Node
  copyNode: (nodeId) => {
    const { nodes } = get();
    const target = nodes.find(n => n.id === nodeId);
    if (target) {
      set({ copiedNode: JSON.parse(JSON.stringify(target)) });
    }
  },

  pasteNode: (position = { x: 400, y: 250 }) => {
    const { copiedNode, nodes, edges } = get();
    if (!copiedNode) return;

    const newId = `node_${Date.now()}`;
    const newNode = JSON.parse(JSON.stringify(copiedNode));
    newNode.id = newId;
    newNode.data.nodeId = newId;
    newNode.position = position;

    const updatedNodes = [...nodes, newNode];
    const dict = convertReactFlowToDict(updatedNodes, edges);
    const { nodes: rfNodes, edges: rfEdges } = convertDictToReactFlow(dict);

    set({ nodes: rfNodes, edges: rfEdges, selectedNodeId: newId });
    get().recordHistory(rfNodes, rfEdges);
  },

  // React Flow Handlers
  onNodesChange: (changes) => {
    const { edges, analytics } = get();
    const updatedNodes = applyNodeChanges(changes, get().nodes);
    const validation = computeValidation(updatedNodes, edges, analytics);
    set({ nodes: updatedNodes, validation });
  },

  onEdgesChange: (changes) => {
    const { nodes, analytics } = get();
    const updatedEdges = applyEdgeChanges(changes, get().edges);
    const validation = computeValidation(nodes, updatedEdges, analytics);
    set({ edges: updatedEdges, validation });
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();
    const updatedEdges = addEdge({ ...connection, animated: true, style: { strokeWidth: 2, stroke: "#6366f1" } }, edges);
    
    const sourceNode = nodes.find(n => n.id === connection.source);
    if (sourceNode) {
      const draftNodes = JSON.parse(JSON.stringify(nodes));
      const targetNode = draftNodes.find(n => n.id === connection.source);
      
      if (connection.sourceHandle?.startsWith("option-")) {
        const optIdx = parseInt(connection.sourceHandle.replace("option-", ""), 10);
        if (targetNode.data.options?.[optIdx]) {
          targetNode.data.options[optIdx].next = connection.target;
        }
      } else if (connection.sourceHandle === "trueNext") {
        targetNode.data.trueNext = connection.target;
      } else if (connection.sourceHandle === "falseNext") {
        targetNode.data.falseNext = connection.target;
      } else {
        targetNode.data.next = connection.target;
      }

      set({ nodes: draftNodes, edges: updatedEdges });
      get().recordHistory(draftNodes, updatedEdges);
    } else {
      set({ edges: updatedEdges });
      get().recordHistory(nodes, updatedEdges);
    }
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setShowDiagnostics: (val) => set({ showDiagnostics: val }),
  setShowSimulator: (val) => set({ showSimulator: val }),
  setShowVersionHistory: (val) => set({ showVersionHistory: val }),
  setIsPublished: (val) => set({ isPublished: val, isDirty: true }),

  addNode: (type = "message", position = { x: 350, y: 200 }) => {
    const { nodes, edges } = get();
    const newId = `node_${Date.now()}`;
    
    const newNode = {
      id: newId,
      type,
      position,
      data: {
        nodeId: newId,
        type,
        message: type === "message" ? "Hello! How can we assist you?" : "",
        options: type === "button_group" || type === "message" ? [{ text: "Click Me", next: "" }] : [],
        next: "",
        actionType: type === "action" ? "escalate" : undefined,
        department: type === "action" ? "Support" : undefined,
        conditionType: type === "condition" ? "agents_online" : undefined,
        trueNext: "",
        falseNext: "",
        fields: type === "form" ? [{ name: "full_name", type: "text", label: "Full Name", required: true }] : [],
        delaySeconds: type === "delay" ? 5 : undefined,
        webhookUrl: type === "webhook" ? "https://api.example.com/webhook" : undefined,
        prompt: type === "ai_response" ? "Answer visitor query politely..." : undefined
      }
    };

    const dict = convertReactFlowToDict([...nodes, newNode], edges);
    const { nodes: rfNodes, edges: rfEdges } = convertDictToReactFlow(dict);

    set({
      nodes: rfNodes,
      edges: rfEdges,
      selectedNodeId: newId
    });

    get().recordHistory(rfNodes, rfEdges);
  },

  duplicateNode: (nodeId) => {
    const { nodes, edges } = get();
    const target = nodes.find(n => n.id === nodeId);
    if (!target) return;

    const newId = `node_${Date.now()}`;
    const copy = JSON.parse(JSON.stringify(target));
    copy.id = newId;
    copy.data.nodeId = newId;
    copy.position = { x: target.position.x + 40, y: target.position.y + 40 };

    const updatedNodes = [...nodes, copy];
    const dict = convertReactFlowToDict(updatedNodes, edges);
    const { nodes: rfNodes, edges: rfEdges } = convertDictToReactFlow(dict);

    set({ nodes: rfNodes, edges: rfEdges, selectedNodeId: newId });
    get().recordHistory(rfNodes, rfEdges);
  },

  updateNodeData: (nodeId, fieldOrUpdates, value) => {
    const { nodes, edges } = get();
    const updates =
      typeof fieldOrUpdates === "object" && fieldOrUpdates !== null
        ? fieldOrUpdates
        : { [fieldOrUpdates]: value };

    const updatedNodes = nodes.map((n) => {
      if (n.id === nodeId) {
        const newData = { ...n.data, ...updates };
        const newType = updates.type || n.type || "message";

        // Initialize default options/fields if switching to message/form
        if (updates.type === "message" && (!newData.options || newData.options.length === 0)) {
          newData.options = [{ text: "Option 1", next: "" }];
        }
        if (updates.type === "form" && (!newData.fields || newData.fields.length === 0)) {
          newData.fields = [{ name: "full_name", type: "text", label: "Full Name", required: true }];
        }

        return {
          ...n,
          type: newType,
          data: newData
        };
      }
      return n;
    });

    const dict = convertReactFlowToDict(updatedNodes, edges);
    const { nodes: rfNodes, edges: rfEdges } = convertDictToReactFlow(dict);

    set({ nodes: rfNodes, edges: rfEdges });
    get().recordHistory(rfNodes, rfEdges);
  },

  renameNodeId: (oldId, newId) => {
    if (!newId || oldId === newId || oldId === "root") return;
    const { nodes, edges } = get();
    
    if (nodes.some(n => n.id === newId)) {
      alert(`Node ID "${newId}" already exists. Please choose a unique name.`);
      return;
    }

    const dict = convertReactFlowToDict(nodes, edges);
    const newDict = {};

    Object.entries(dict).forEach(([id, node]) => {
      const targetId = id === oldId ? newId : id;
      const nodeCopy = JSON.parse(JSON.stringify(node));

      if (Array.isArray(nodeCopy.options)) {
        nodeCopy.options.forEach(opt => { if (opt.next === oldId) opt.next = newId; });
      }
      if (nodeCopy.next === oldId) nodeCopy.next = newId;
      if (nodeCopy.trueNext === oldId) nodeCopy.trueNext = newId;
      if (nodeCopy.falseNext === oldId) nodeCopy.falseNext = newId;

      newDict[targetId] = nodeCopy;
    });

    const { nodes: rfNodes, edges: rfEdges } = convertDictToReactFlow(newDict);
    set({ nodes: rfNodes, edges: rfEdges, selectedNodeId: newId });
    get().recordHistory(rfNodes, rfEdges);
  },

  addOptionToNode: (nodeId) => {
    const { nodes, edges } = get();
    const updatedNodes = nodes.map(n => {
      if (n.id === nodeId) {
        const opts = n.data.options ? [...n.data.options] : [];
        opts.push({ text: `Option ${opts.length + 1}`, next: "" });
        return { ...n, data: { ...n.data, options: opts } };
      }
      return n;
    });

    const dict = convertReactFlowToDict(updatedNodes, edges);
    const { nodes: rfNodes, edges: rfEdges } = convertDictToReactFlow(dict);

    set({ nodes: rfNodes, edges: rfEdges });
    get().recordHistory(rfNodes, rfEdges);
  },

  deleteNode: (nodeId) => {
    if (nodeId === "root") return alert("Cannot delete root node.");
    const { nodes, edges } = get();

    const affected = [];
    nodes.forEach(n => {
      if (n.id !== nodeId) {
        (n.data.options || []).forEach(o => { if (o.next === nodeId) affected.push(`${n.id} (Option: ${o.text})`); });
        if (n.data.next === nodeId) affected.push(`${n.id} (Next)`);
        if (n.data.trueNext === nodeId) affected.push(`${n.id} (True Next)`);
        if (n.data.falseNext === nodeId) affected.push(`${n.id} (False Next)`);
      }
    });

    let msg = `Are you sure you want to delete node "${nodeId}"?`;
    if (affected.length > 0) {
      msg += `\n\nWarning: The following ${affected.length} node connection(s) will be broken:\n• ` + affected.join("\n• ");
    }

    if (!window.confirm(msg)) return;

    const filteredNodes = nodes.filter(n => n.id !== nodeId);
    const dict = convertReactFlowToDict(filteredNodes, edges);
    const { nodes: rfNodes, edges: rfEdges } = convertDictToReactFlow(dict);

    set({
      nodes: rfNodes,
      edges: rfEdges,
      selectedNodeId: "root"
    });

    get().recordHistory(rfNodes, rfEdges);
  },

  getValidation: () => get().validation
}));
