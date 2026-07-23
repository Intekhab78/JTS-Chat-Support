import React, { useState, useCallback } from "react";
import { ReactFlow, Controls, MiniMap, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useFlowStore } from "../store/useFlowStore.js";
import { nodeTypes } from "../nodes/CustomNodes.jsx";
import { CanvasContextMenu } from "../context-menu/CanvasContextMenu.jsx";

export function FlowCanvas() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const setSelectedNodeId = useFlowStore((s) => s.setSelectedNodeId);
  const addNode = useFlowStore((s) => s.addNode);

  const [menuPosition, setMenuPosition] = useState(null);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 50,
      };

      addNode(type, position);
    },
    [addNode]
  );

  const handlePaneContextMenu = useCallback((event) => {
    event.preventDefault();
    const reactFlowBounds = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
      clientX: event.clientX,
      clientY: event.clientY
    });
  }, []);

  return (
    <div
      className="flex-1 w-full h-full min-h-[500px] relative bg-slate-50/70 dark:bg-slate-950 overflow-hidden"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => setMenuPosition(null)}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        style={{ width: "100%", height: "100%" }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          setSelectedNodeId(node.id);
          setMenuPosition(null);
        }}
        onPaneClick={() => {
          setSelectedNodeId(null);
          setMenuPosition(null);
        }}
        onPaneContextMenu={handlePaneContextMenu}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
          style: { strokeWidth: 2.5, stroke: "#6366f1" },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 8,
          labelBgStyle: { fill: "#1e1b4b", fillOpacity: 0.9 },
          labelStyle: { fill: "#ffffff", fontWeight: 800, fontSize: 10 }
        }}
      >
        <Controls className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !rounded-2xl !shadow-xl !p-1" />
        <MiniMap
          zoomable
          pannable
          className="!bg-white/90 dark:!bg-slate-900/90 !border-slate-200 dark:!border-slate-800 !rounded-2xl !shadow-xl"
          nodeColor={(node) => {
            if (node.id === "root") return "#6366f1";
            if (node.type === "form") return "#10b981";
            if (node.type === "action") return "#f59e0b";
            if (node.type === "condition") return "#a855f7";
            return "#64748b";
          }}
        />
        <Background color="#94a3b8" gap={24} size={1.5} className="opacity-30" />
      </ReactFlow>

      {/* Canvas Right Click Context Menu */}
      <CanvasContextMenu position={menuPosition} onClose={() => setMenuPosition(null)} />
    </div>
  );
}
