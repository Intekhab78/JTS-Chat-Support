import express from "express";
import { Flow } from "../models/Flow.js";
import { FlowTemplate } from "../models/FlowTemplate.js";
import { Website } from "../models/Website.js";
import { ChatSession } from "../models/ChatSession.js";
import { requireAuth } from "../middleware/auth.js";
import { attachOwnedWebsiteIds } from "../middleware/attachOwnedWebsiteIds.js";
import { assertWebsiteAccess } from "../utils/websiteScope.js";

const router = express.Router();

// Apply auth and website list resolution to all flow routes
router.use(requireAuth);
router.use(attachOwnedWebsiteIds);

// ─── Diagnostic Endpoints ────────────────────────────────────────────────────

// GET /api/flows/root/:websiteId — Returns root node payload for a website's active flow
router.get("/root/:websiteId", async (req, res) => {
  try {
    assertWebsiteAccess(req.user, req.ownedWebsiteIds, req.params.websiteId);
    const website = await Website.findById(req.params.websiteId).populate("activeFlowId");
    if (!website) return res.status(404).json({ error: "Website not found" });
    if (!website.activeFlowId) return res.status(404).json({ error: "No active flow linked to this website", websiteId: req.params.websiteId });

    const nodes = website.activeFlowId.nodes;
    const rootNode = nodes?.root;

    return res.json({
      flowId: website.activeFlowId._id,
      flowName: website.activeFlowId.name,
      isPublished: website.activeFlowId.isPublished,
      rootNode: rootNode || null,
      rootNodeType: rootNode?.type || null,
      rootMessage: rootNode?.message || null,
      rootOptionsCount: rootNode?.options?.length ?? 0,
      rootOptions: rootNode?.options || [],
      diagnosis: {
        hasRoot: !!rootNode,
        hasOptions: !!(rootNode?.options && rootNode.options.length > 0),
        hasMessage: !!rootNode?.message,
        childNodeKeys: (rootNode?.options || []).map(o => o.next).filter(Boolean)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/flows/nodes/:websiteId — Returns all nodes with parent-child relationships
router.get("/nodes/:websiteId", async (req, res) => {
  try {
    assertWebsiteAccess(req.user, req.ownedWebsiteIds, req.params.websiteId);
    const website = await Website.findById(req.params.websiteId).populate("activeFlowId");
    if (!website) return res.status(404).json({ error: "Website not found" });
    if (!website.activeFlowId) return res.status(404).json({ error: "No active flow" });

    const nodes = website.activeFlowId.nodes || {};
    const nodeList = Object.entries(nodes).map(([id, node]) => ({
      nodeId: id,
      type: node.type,
      message: node.message,
      optionsCount: node.options?.length ?? 0,
      options: node.options || [],
      next: node.next || null,
      isSolution: node.isSolution || false,
      hasChildren: !!(node.options && node.options.length > 0),
      childNodeIds: (node.options || []).map(o => o.next).filter(Boolean)
    }));

    return res.json({
      flowId: website.activeFlowId._id,
      flowName: website.activeFlowId.name,
      totalNodes: nodeList.length,
      nodes: nodeList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/flows/tree/:websiteId — Full tree with broken link detection
router.get("/tree/:websiteId", async (req, res) => {
  try {
    assertWebsiteAccess(req.user, req.ownedWebsiteIds, req.params.websiteId);
    const website = await Website.findById(req.params.websiteId).populate("activeFlowId");
    if (!website) return res.status(404).json({ error: "Website not found" });
    if (!website.activeFlowId) return res.status(404).json({ error: "No active flow" });

    const nodes = website.activeFlowId.nodes || {};
    const allNodeIds = new Set(Object.keys(nodes));
    const brokenLinks = [];
    const orphanNodes = [];

    // Find broken links: options or next pointing to non-existent nodes
    Object.entries(nodes).forEach(([id, node]) => {
      (node.options || []).forEach(opt => {
        if (opt.next && !allNodeIds.has(opt.next)) {
          brokenLinks.push({ fromNode: id, optionText: opt.text, missingTarget: opt.next });
        }
      });
      if (node.next && !allNodeIds.has(node.next)) {
        brokenLinks.push({ fromNode: id, field: "next", missingTarget: node.next });
      }
    });

    // Find orphan nodes: not referenced by any option or next
    const referencedNodes = new Set(["root"]);
    Object.values(nodes).forEach(node => {
      (node.options || []).forEach(opt => { if (opt.next) referencedNodes.add(opt.next); });
      if (node.next) referencedNodes.add(node.next);
      if (node.trueNext) referencedNodes.add(node.trueNext);
      if (node.falseNext) referencedNodes.add(node.falseNext);
    });
    allNodeIds.forEach(id => {
      if (!referencedNodes.has(id)) orphanNodes.push(id);
    });

    const rootNode = nodes.root;
    const isValid = !!(rootNode && rootNode.options && rootNode.options.length > 0 && brokenLinks.length === 0);

    return res.json({
      flowId: website.activeFlowId._id,
      flowName: website.activeFlowId.name,
      isPublished: website.activeFlowId.isPublished,
      isValid,
      totalNodes: allNodeIds.size,
      brokenLinksCount: brokenLinks.length,
      orphanNodesCount: orphanNodes.length,
      brokenLinks,
      orphanNodes,
      rootSummary: {
        hasRoot: !!rootNode,
        hasOptions: !!(rootNode?.options?.length > 0),
        optionCount: rootNode?.options?.length ?? 0,
        options: rootNode?.options || []
      },
      tree: Object.entries(nodes).map(([id, node]) => ({
        id,
        type: node.type,
        message: node.message?.substring(0, 80),
        options: (node.options || []).map(o => ({
          text: o.text,
          next: o.next,
          isLinked: allNodeIds.has(o.next)
        }))
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Flow CRUD ────────────────────────────────────────────────────────────────

// Get flows for a specific website
router.get("/website/:websiteId", async (req, res) => {
  try {
    assertWebsiteAccess(req.user, req.ownedWebsiteIds, req.params.websiteId);
    const flows = await Flow.find({ websiteId: req.params.websiteId }).sort({ updatedAt: -1 });
    res.json(flows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new flow
router.post("/", async (req, res) => {
  try {
    assertWebsiteAccess(req.user, req.ownedWebsiteIds, req.body.websiteId);
    const flow = await Flow.create(req.body);
    res.status(201).json(flow);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a flow
router.patch("/:id", async (req, res) => {
  try {
    const flow = await Flow.findById(req.params.id);
    if (!flow) return res.status(404).json({ error: "Flow not found" });
    assertWebsiteAccess(req.user, req.ownedWebsiteIds, flow.websiteId);

    const updatedFlow = await Flow.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedFlow);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Validate a flow before publishing — checks structure integrity
router.post("/:id/validate", async (req, res) => {
  try {
    const flow = await Flow.findById(req.params.id);
    if (!flow) return res.status(404).json({ error: "Flow not found" });
    assertWebsiteAccess(req.user, req.ownedWebsiteIds, flow.websiteId);

    const nodes = flow.nodes || {};
    const allNodeIds = new Set(Object.keys(nodes));
    const errors = [];
    const warnings = [];

    // Rule 1: Root node must exist
    if (!nodes.root) {
      errors.push({ code: "MISSING_ROOT", message: "Flow has no root node." });
    } else {
      // Rule 2: Root must have at least one option
      if (!nodes.root.options || nodes.root.options.length === 0) {
        errors.push({ code: "EMPTY_ROOT_OPTIONS", message: "Root node has no buttons (options[]). Visitors will see a blank widget." });
      }
      // Rule 3: Root must have a message
      if (!nodes.root.message) {
        warnings.push({ code: "MISSING_ROOT_MESSAGE", message: "Root node has no bot message. Consider adding a welcome message." });
      }
    }

    // Rule 4: Detect broken next-node references
    Object.entries(nodes).forEach(([id, node]) => {
      (node.options || []).forEach(opt => {
        if (opt.next && !allNodeIds.has(opt.next)) {
          errors.push({ code: "BROKEN_LINK", message: `Node "${id}" option "${opt.text}" points to missing node "${opt.next}".`, node: id, target: opt.next });
        }
      });
      if (node.next && !allNodeIds.has(node.next)) {
        errors.push({ code: "BROKEN_NEXT", message: `Node "${id}" next field points to missing node "${node.next}".`, node: id, target: node.next });
      }
    });

    // Rule 5: Detect circular references (simple DFS)
    const detectCycle = (startId, visited = new Set(), path = []) => {
      if (visited.has(startId)) {
        return path.includes(startId) ? [...path, startId] : null;
      }
      visited.add(startId);
      path.push(startId);
      const n = nodes[startId];
      if (!n) return null;
      for (const opt of (n.options || [])) {
        const cycle = detectCycle(opt.next, new Set(visited), [...path]);
        if (cycle) return cycle;
      }
      if (n.next) {
        const cycle = detectCycle(n.next, new Set(visited), [...path]);
        if (cycle) return cycle;
      }
      return null;
    };
    const cycle = detectCycle("root");
    if (cycle) {
      warnings.push({ code: "CIRCULAR_REFERENCE", message: `Circular reference detected: ${cycle.join(" → ")}` });
    }

    const isValid = errors.length === 0;
    return res.json({ isValid, errors, warnings, nodeCount: allNodeIds.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set active flow for a website
router.post("/:id/activate", async (req, res) => {
  try {
    const flow = await Flow.findById(req.params.id);
    if (!flow) return res.status(404).json({ error: "Flow not found" });
    assertWebsiteAccess(req.user, req.ownedWebsiteIds, flow.websiteId);

    // Validate before activating
    const nodes = flow.nodes || {};
    if (!nodes.root || !nodes.root.options || nodes.root.options.length === 0) {
      return res.status(400).json({
        error: "Cannot publish flow: Root node has no buttons. Add at least one option to root.options[].",
        code: "EMPTY_ROOT_OPTIONS"
      });
    }

    // Deactivate others
    await Flow.updateMany({ websiteId: flow.websiteId }, { isPublished: false });
    
    // Activate this one
    flow.isPublished = true;
    await flow.save();

    // Update website
    await Website.findByIdAndUpdate(flow.websiteId, { activeFlowId: flow._id });

    res.json({ success: true, flow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete flow
router.delete("/:id", async (req, res) => {
  try {
    const flow = await Flow.findById(req.params.id);
    if (!flow) return res.status(404).json({ error: "Flow not found" });
    assertWebsiteAccess(req.user, req.ownedWebsiteIds, flow.websiteId);

    await Flow.findByIdAndDelete(req.params.id);
    
    // Unlink if it was active
    await Website.updateMany({ activeFlowId: req.params.id }, { activeFlowId: null });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/flows/:id/executive-summary — Aggregates executive summary analytics for a specific flow
router.get("/:id/executive-summary", async (req, res) => {
  try {
    const { id } = req.params;
    const flow = await Flow.findById(id);
    if (!flow) return res.status(404).json({ error: "Flow not found" });
    assertWebsiteAccess(req.user, req.ownedWebsiteIds, flow.websiteId);

    const sessions = await ChatSession.find({
      websiteId: flow.websiteId,
      $or: [
        { "botMetadata.path": { $exists: true, $ne: [] } },
        { "botMetadata.selections": { $exists: true, $ne: {} } }
      ]
    });

    let totalStarted = 0;
    let totalConversions = 0;
    let totalTransfers = 0;
    let totalDropoffs = 0;
    let formStarts = 0;
    let formCompletions = 0;

    const optionClicks = {};
    const nodeVisits = {};
    const nodeDropoffs = {};

    sessions.forEach(session => {
      const metadata = session.botMetadata || {};
      const path = metadata.path || [];
      const selections = metadata.selections || {};
      const formProgress = metadata.formProgress || {};
      const conversions = metadata.conversions || [];

      if (path.length > 0) {
        totalStarted++;
      }

      path.forEach(nodeId => {
        nodeVisits[nodeId] = (nodeVisits[nodeId] || 0) + 1;
      });

      Object.values(selections).forEach(optionText => {
        optionClicks[optionText] = (optionClicks[optionText] || 0) + 1;
      });

      Object.values(formProgress).forEach(status => {
        if (status === "started") formStarts++;
        if (status === "completed") formCompletions++;
      });

      if (conversions.length > 0) {
        totalConversions += conversions.length;
      }

      if (metadata.transferredToAgent) {
        totalTransfers++;
      }

      if (metadata.dropOffNode) {
        totalDropoffs++;
        nodeDropoffs[metadata.dropOffNode] = (nodeDropoffs[metadata.dropOffNode] || 0) + 1;
      } else if (session.status === "closed" && !metadata.transferredToAgent && session.botStatus !== "resolved") {
        totalDropoffs++;
        const lastNode = path[path.length - 1];
        if (lastNode) {
          nodeDropoffs[lastNode] = (nodeDropoffs[lastNode] || 0) + 1;
        }
      }
    });

    const topClickedOptions = Object.entries(optionClicks)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const funnel = [
      { step: "Flow Started", count: totalStarted },
      { step: "Form Started", count: formStarts },
      { step: "Form Completed", count: formCompletions },
      { step: "Transferred to Agent", count: totalTransfers },
      { step: "Conversions (Lead/Ticket)", count: totalConversions }
    ];

    const conversionRate = totalStarted > 0 ? ((totalConversions / totalStarted) * 100).toFixed(1) : 0;
    const dropoffRate = totalStarted > 0 ? ((totalDropoffs / totalStarted) * 100).toFixed(1) : 0;

    return res.json({
      flowId: id,
      flowName: flow.name,
      totalStarted,
      totalConversions,
      totalTransfers,
      totalDropoffs,
      conversionRate: parseFloat(conversionRate),
      dropoffRate: parseFloat(dropoffRate),
      funnel,
      topClickedOptions,
      nodeVisits,
      nodeDropoffs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/flows/:id/analytics — Aggregated flow node routing and drop-off statistics
router.get("/:id/analytics", async (req, res) => {
  try {
    const { id } = req.params;
    const flow = await Flow.findById(id);
    if (!flow) return res.status(404).json({ error: "Flow not found" });
    assertWebsiteAccess(req.user, req.ownedWebsiteIds, flow.websiteId);

    // Get all sessions with bot selections for this website
    const sessions = await ChatSession.find({
      websiteId: flow.websiteId,
      "botMetadata.selections": { $exists: true, $ne: {} }
    }).select("botMetadata.selections botStatus status");

    const nodeStats = {};

    // Initialize stats structure for all nodes in the flow
    for (const [nodeId, node] of Object.entries(flow.nodes || {})) {
      nodeStats[nodeId] = {
        visits: 0,
        clicks: {},
        dropOffs: 0
      };
      if (node.options) {
        node.options.forEach(opt => {
          nodeStats[nodeId].clicks[opt.text] = 0;
        });
      }
    }

    // Process sessions
    sessions.forEach(session => {
      const selections = session.botMetadata.selections || {};
      const visitedNodes = Object.keys(selections);
      if (visitedNodes.length === 0) return;

      // Mark visits and clicks
      visitedNodes.forEach(nodeId => {
        if (nodeStats[nodeId]) {
          nodeStats[nodeId].visits += 1;
          const clickedOption = selections[nodeId];
          if (clickedOption && nodeStats[nodeId].clicks[clickedOption] !== undefined) {
            nodeStats[nodeId].clicks[clickedOption] += 1;
          }
        }
      });

      // Drop-off calculation
      const lastNode = visitedNodes[visitedNodes.length - 1];
      if (nodeStats[lastNode]) {
        const selectedOpt = selections[lastNode];
        const flowNode = flow.nodes[lastNode];
        const optObj = flowNode?.options?.find(o => o.text === selectedOpt);
        
        if (optObj && optObj.next) {
          if (nodeStats[optObj.next]) {
            nodeStats[optObj.next].visits += 1;
            nodeStats[optObj.next].dropOffs += 1;
          }
        } else if (session.botStatus !== "resolved") {
          nodeStats[lastNode].dropOffs += 1;
        }
      }
    });

    res.json({ flowId: id, nodeStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== Templates ======

router.get("/templates", async (req, res) => {
  try {
    const templates = await FlowTemplate.find().sort({ name: 1 });
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/templates", async (req, res) => {
  try {
    const template = await FlowTemplate.create(req.body);
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

