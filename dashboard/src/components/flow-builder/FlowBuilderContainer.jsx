import React, { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useFlowStore } from "./store/useFlowStore.js";
import { FlowToolbar } from "./toolbar/FlowToolbar.jsx";
import { NodeSidebar } from "./sidebar/NodeSidebar.jsx";
import { FlowCanvas } from "./canvas/FlowCanvas.jsx";
import { NodeInspector } from "./inspector/NodeInspector.jsx";
import { DiagnosticsModal } from "./validation/DiagnosticsModal.jsx";
import { FlowSimulatorModal } from "./simulator/FlowSimulatorModal.jsx";
import { VersionHistoryModal } from "./versioning/VersionHistoryModal.jsx";
import { FlowDebuggerModal } from "./debugger/FlowDebuggerModal.jsx";
import { FlowHelpDrawer } from "./help/FlowHelpDrawer.jsx";
import { FlowTemplatesModal } from "./templates/FlowTemplatesModal.jsx";
import { FlowProductTourModal } from "./help/FlowProductTourModal.jsx";
import { api } from "../../api/client.js";

export function FlowBuilderContainer({ website, onUpdate }) {
  const initFlow = useFlowStore((s) => s.initFlow);
  const showDebugger = useFlowStore((s) => s.showDebugger);
  const showProductTour = useFlowStore((s) => s.showProductTour);

  useEffect(() => {
    if (website) {
      const activeId = website.activeFlowId?._id;
      if (activeId) {
        api(`/api/flows/${activeId}/analytics`)
          .then((analyticsData) => initFlow(website, analyticsData))
          .catch(() => initFlow(website, null));
      } else {
        initFlow(website, null);
      }
    }
  }, [website, initFlow]);

  return (
    <ReactFlowProvider>
      <div className="relative bg-white dark:bg-slate-950 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-110px)] min-h-[820px] w-full font-sans antialiased">
        {/* Toolbar */}
        <FlowToolbar onUpdate={onUpdate} />

        {/* Main Workspace Layout */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Node Sidebar & Palette */}
          <NodeSidebar />

          {/* Center Visual Graph Canvas */}
          <FlowCanvas />

          {/* Right Inspector Panel */}
          <NodeInspector />
        </div>

        {/* Modals & Guidance System */}
        <DiagnosticsModal />
        <FlowSimulatorModal />
        <VersionHistoryModal />
        <FlowTemplatesModal />
        <FlowHelpDrawer />
        <FlowProductTourModal isOpen={showProductTour} onClose={() => useFlowStore.setState({ showProductTour: false })} />
        <FlowDebuggerModal isOpen={showDebugger} onClose={() => useFlowStore.setState({ showDebugger: false })} />
      </div>
    </ReactFlowProvider>
  );
}
