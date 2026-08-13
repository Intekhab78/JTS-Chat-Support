import { ChatFlow } from "../models/ChatFlow.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

export const getFlows = asyncHandler(async (req, res) => {
  const { websiteId } = req.query;
  const query = { isDeleted: { $ne: true } };
  if (websiteId) query.websiteId = websiteId;

  const flows = await ChatFlow.find(query).sort({ updatedAt: -1 });
  res.json(flows);
});

export const getFlowById = asyncHandler(async (req, res) => {
  const flow = await ChatFlow.findById(req.params.id);
  if (!flow) throw new AppError("Chatbot Flow not found", 404);
  res.json(flow);
});

export const createFlow = asyncHandler(async (req, res) => {
  const { websiteId, name, description, triggerKeyword, nodes } = req.body;
  if (!name) throw new AppError("Flow name is required", 400);
  if (!websiteId) throw new AppError("Website ID is required", 400);

  const flow = await ChatFlow.create({
    websiteId,
    name,
    description: description || "",
    triggerKeyword: triggerKeyword || "hello",
    nodes: nodes || [
      {
        id: "node-start",
        type: "trigger",
        title: "Chat Started Trigger",
        content: "User opens live chat widget",
        position: { x: 100, y: 100 },
        options: [{ label: "User clicks Next", targetNodeId: "node-question-1" }]
      },
      {
        id: "node-question-1",
        type: "question",
        title: "Initial Support Options",
        content: "How can we help you today?",
        position: { x: 400, y: 100 },
        options: [
          { label: "Sales & Pricing", targetNodeId: "node-action-sales" },
          { label: "Technical Support", targetNodeId: "node-action-ticket" }
        ]
      },
      {
        id: "node-action-ticket",
        type: "ticket_action",
        title: "Auto-Create Ticket",
        content: "Creates a Support Ticket automatically",
        position: { x: 700, y: 200 },
        options: []
      }
    ],
    createdBy: req.user._id
  });

  res.status(201).json(flow);
});

export const updateFlow = asyncHandler(async (req, res) => {
  const flow = await ChatFlow.findById(req.params.id);
  if (!flow) throw new AppError("Chatbot Flow not found", 404);

  if (req.body.name !== undefined) flow.name = req.body.name;
  if (req.body.description !== undefined) flow.description = req.body.description;
  if (req.body.triggerKeyword !== undefined) flow.triggerKeyword = req.body.triggerKeyword;
  if (req.body.isActive !== undefined) flow.isActive = req.body.isActive;
  if (req.body.nodes !== undefined) flow.nodes = req.body.nodes;

  await flow.save();
  res.json(flow);
});

export const deleteFlow = asyncHandler(async (req, res) => {
  const flow = await ChatFlow.findById(req.params.id);
  if (!flow) throw new AppError("Chatbot Flow not found", 404);
  await flow.deleteOne();
  res.json({ message: "Flow deleted successfully" });
});
